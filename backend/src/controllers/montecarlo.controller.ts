import { Response, NextFunction } from 'express';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors';
import prisma from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { montecarloService } from '../services/montecarlo.service';
import { quotaService } from '../services/quota.service';

export const monteCarloController = {
  createMonteCarlo: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { model_id: modelId } = req.params;
      const { numSimulations, drivers, overrides, randomSeed, mode } = req.body;

      // Validate inputs
      if (!numSimulations || numSimulations < 100 || numSimulations > 100000) {
        throw new ValidationError('numSimulations must be between 100 and 100000');
      }

      if (!drivers || typeof drivers !== 'object' || Object.keys(drivers).length === 0) {
        throw new ValidationError('drivers are required and must be a non-empty object');
      }

      // Get model to find latest run or create baseline run
      const model = await prisma.model.findUnique({
        where: { id: modelId },
      });

      if (!model) {
        throw new NotFoundError('Model not found');
      }

      // Check quota (legacy check)
      const quotaCheck = await quotaService.checkMonteCarloQuota(model.orgId, numSimulations);
      if (!quotaCheck.allowed) {
        throw new ForbiddenError(quotaCheck.message || 'Monte Carlo quota exceeded');
      }

      // Check credit balance (new credit metering system)
      const simulationCreditService = (await import('../services/simulation-credit.service')).simulationCreditService;
      const creditCheck = await simulationCreditService.checkCreditBalance(
        model.orgId,
        req.user.id,
        Math.ceil(numSimulations / 1000) // 1 credit = 1000 simulations
      );
      if (!creditCheck.allowed) {
        throw new ForbiddenError(creditCheck.message || 'Insufficient simulation credits');
      }

      // Verify user has access to model's org
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId: req.user.id,
            orgId: model.orgId,
          },
        },
      });

      if (!role) {
        throw new ValidationError('No access to this model');
      }

      // Get or create model run for this Monte Carlo
      // For MVP, use latest run or create a baseline run
      let modelRun = await prisma.modelRun.findFirst({
        where: {
          modelId,
          orgId: model.orgId,
          runType: 'baseline',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!modelRun) {
        // Create baseline run
        modelRun = await prisma.modelRun.create({
          data: {
            modelId,
            orgId: model.orgId,
            runType: 'baseline',
            status: 'done',
          },
        });
      }

      // Compute paramsHash
      const paramsHash = montecarloService.computeParamsHash({
        modelId,
        modelVersion: model.version,
        drivers,
        overrides,
        numSimulations,
        randomSeed,
        mode: mode || 'full',
      });

      // Check cache
      const cached = await montecarloService.checkCache(model.orgId, paramsHash);

      if (cached && cached.resultS3) {
        // Cache hit - return immediately
        let resultUrl = null;
        try {
          const { getSignedUrlForS3 } = await import('../utils/s3');
          resultUrl = await getSignedUrlForS3(cached.resultS3, 3600);
        } catch (error) {
          // Ignore S3 errors
        }

        let percentiles = null;
        if (cached.percentilesJson && typeof cached.percentilesJson === 'object') {
          percentiles = cached.percentilesJson;
        }

        return res.json({
          ok: true,
          jobId: cached.id,
          cached: true,
          resultS3: cached.resultS3,
          resultUrl,
          percentiles,
          status: cached.status,
        });
      }

      // Cache miss - create new job
      const { monteCarloJobId, jobId } = await montecarloService.createMonteCarloJob(
        modelId,
        modelRun.id,
        model.orgId,
        paramsHash,
        numSimulations,
        {
          drivers,
          overrides,
          randomSeed,
          mode: mode || 'full',
        }
      );

      // Consume quota (will be refunded if job fails)
      await quotaService.consumeMonteCarloQuota(model.orgId, numSimulations);

      // Deduct simulation credits (new credit metering system)
      const creditUsage = await simulationCreditService.deductCredits(
        model.orgId,
        req.user.id,
        modelRun.id,
        monteCarloJobId,
        numSimulations,
        false, // adminOverride
        `Monte Carlo simulation: ${numSimulations} simulations`
      );

      // Get updated credit balance
      const updatedBalance = await simulationCreditService.getCreditBalance(model.orgId);

      res.status(201).json({
        ok: true,
        jobId,
        monteCarloJobId,
        cached: false,
        quota: {
          remaining: quotaCheck.remaining - numSimulations,
          limit: quotaCheck.limit,
          resetAt: quotaCheck.resetAt,
        },
        credits: {
          used: creditUsage.creditsUsed,
          remaining: updatedBalance.remainingCredits,
          total: updatedBalance.totalCredits,
          resetAt: updatedBalance.resetAt,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  listMonteCarlo: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { model_id: modelId } = req.params;

      // Get model to verify access
      const model = await prisma.model.findUnique({
        where: { id: modelId },
      });

      if (!model) {
        throw new NotFoundError('Model not found');
      }

      // Verify user has access to model's org
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId: req.user.id,
            orgId: model.orgId,
          },
        },
      });

      if (!role) {
        throw new ValidationError('No access to this model');
      }

      // Get all Monte Carlo jobs for this model directly by modelId
      // Since MonteCarloJob has modelRunId, and ModelRun has modelId, we can join
      const mcJobs = await prisma.monteCarloJob.findMany({
        where: {
          orgId: model.orgId,
          modelRun: {
            modelId: modelId,
          },
        },
        include: {
          modelRun: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              modelId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit to last 100 jobs
      });

      // Get associated jobs for status and progress
      const mcJobIds = mcJobs.map(j => j.id);
      const jobs = await prisma.job.findMany({
        where: {
          objectId: { in: mcJobIds },
          jobType: 'monte_carlo',
        },
        select: {
          id: true,
          objectId: true,
          status: true,
          progress: true,
          createdAt: true,
          finishedAt: true,
        },
      });

      // Map jobs to Monte Carlo jobs
      const jobMap = new Map(jobs.map(j => [j.objectId, j]));

      // Format response
      const monteCarloJobs = mcJobs.map(mcJob => {
        const job = jobMap.get(mcJob.id);
        let resultUrl = null;
        
        // Try to get signed URL if result exists
        if (mcJob.resultS3) {
          try {
            // We'll get signed URL on-demand in getMonteCarlo, not here
            resultUrl = null; // Will be null in list, fetched on detail view
          } catch (error) {
            // Ignore S3 errors
          }
        }

        return {
          id: mcJob.id,
          jobId: job?.id || null,
          modelRunId: mcJob.modelRunId,
          numSimulations: mcJob.numSimulations,
          status: mcJob.status || job?.status || 'queued',
          progress: job?.progress || 0,
          resultS3: mcJob.resultS3,
          resultUrl, // Will be null in list view
          hasResults: !!mcJob.resultS3,
          hasPercentiles: !!mcJob.percentilesJson,
          hasSensitivity: !!mcJob.sensitivityJson,
          confidenceLevel: mcJob.confidenceLevel,
          cpuSecondsEstimate: mcJob.cpuSecondsEstimate,
          cpuSecondsActual: mcJob.cpuSecondsActual,
          createdAt: mcJob.createdAt.toISOString(),
          finishedAt: mcJob.finishedAt?.toISOString() || null,
        };
      });

      res.json({
        ok: true,
        monteCarloJobs,
        count: monteCarloJobs.length,
      });
    } catch (error) {
      next(error);
    }
  },

  getMonteCarlo: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { jobId } = req.params;

      const result = await montecarloService.getMonteCarloResult(jobId);

      // Get orgId from Monte Carlo job
      const mcJob = await prisma.monteCarloJob.findUnique({
        where: { id: result.monteCarloJobId },
        select: { orgId: true },
      });

      if (!mcJob) {
        throw new NotFoundError('Monte Carlo job not found');
      }

      // Verify user has access
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId: req.user.id,
            orgId: mcJob.orgId,
          },
        },
      });

      if (!role) {
        throw new ValidationError('No access to this job');
      }

      // result already includes sensitivityJson from service
      res.json({
        ok: true,
        jobId: result.jobId,
        monteCarloJobId: result.monteCarloJobId,
        status: result.status,
        progress: result.progress,
        numSimulations: result.numSimulations,
        percentilesS3: result.resultS3,
        resultUrl: result.resultUrl,
        percentiles: result.percentiles,
        summary: result.percentiles, // Alias for backward compatibility
        sensitivityJson: result.sensitivityJson, // Sensitivity data for tornado chart
        survivalProbability: result.survivalProbability, // MVP FEATURE: Probability of survival, not point forecast
        confidenceLevel: result.confidenceLevel,
        cpuSecondsEstimate: result.cpuSecondsEstimate,
        cpuSecondsActual: result.cpuSecondsActual,
        createdAt: result.createdAt?.toISOString() || new Date(result.createdAt).toISOString(),
        finishedAt: result.finishedAt?.toISOString() || null,
      });
    } catch (error) {
      next(error);
    }
  },
};

