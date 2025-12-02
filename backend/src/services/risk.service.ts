import prisma from '../config/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { getSignedUrlForS3 } from '../utils/s3';

export const riskService = {
  calculateRiskScore: async (
    jobId: string,
    userId: string,
    runwayThresholdMonths: number = 6
  ) => {
    // Get Monte Carlo job
    let mcJob = await prisma.monteCarloJob.findFirst({
      where: {
        OR: [
          { id: jobId },
          {
            modelRun: {
              monteCarloJobs: {
                some: {
                  id: jobId,
                },
              },
            },
          },
        ],
      },
      include: {
        modelRun: {
          include: {
            model: {
              select: {
                id: true,
                orgId: true,
              },
            },
          },
        },
      },
    });


    if (!mcJob) {
      throw new NotFoundError('Monte Carlo job not found');
    }

    // Verify user access
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId: mcJob.orgId,
        },
      },
    });

    if (!role) {
      throw new ForbiddenError('No access to this Monte Carlo job');
    }

    if (mcJob.status !== 'done' || !mcJob.resultS3) {
      throw new NotFoundError('Monte Carlo job not completed yet');
    }

    // Load results from S3 or use percentilesJson
    let results: any = null;
    
    // Try using percentilesJson first (faster, already in DB)
    if (mcJob.percentilesJson && typeof mcJob.percentilesJson === 'object') {
      results = {
        percentiles_table: mcJob.percentilesJson,
      };
    } else if (mcJob.resultS3) {
      // If percentilesJson not available, would need to download from S3
      // For now, throw error - in production, implement S3 download
      throw new NotFoundError('Monte Carlo results not available in database. S3 download not yet implemented.');
    } else {
      throw new NotFoundError('Monte Carlo results not available');
    }

    // Calculate risk score based on runway probability
    const percentiles = results.percentiles_table || results.monthly || {};
    const months = percentiles.months || Object.keys(percentiles);

    // Find runway months (when cash goes negative)
    // For each simulation, find when cumulative cash goes negative
    // Use P50 (median) as baseline
    const p50Series = percentiles.p50 || [];

    // Calculate cumulative cash
    let cumulativeCash = 0;
    let runwayMonths = null;

    for (let i = 0; i < p50Series.length; i++) {
      cumulativeCash += Number(p50Series[i]);
      if (cumulativeCash < 0 && runwayMonths === null) {
        runwayMonths = i + 1; // Month index (1-based)
        break;
      }
    }

    // If never goes negative, use total months
    if (runwayMonths === null) {
      runwayMonths = p50Series.length;
    }

    // Calculate probability of runway < threshold
    // Use P10 (10th percentile) as conservative estimate
    const p10Series = percentiles.p10 || [];
    let conservativeRunway = null;
    let conservativeCumulative = 0;

    for (let i = 0; i < p10Series.length; i++) {
      conservativeCumulative += Number(p10Series[i]);
      if (conservativeCumulative < 0 && conservativeRunway === null) {
        conservativeRunway = i + 1;
        break;
      }
    }

    if (conservativeRunway === null) {
      conservativeRunway = p10Series.length;
    }

    // Risk score: probability that runway < threshold
    // Simplified: use P10 as proxy for "10% probability"
    const riskLevel =
      conservativeRunway < runwayThresholdMonths
        ? 'high'
        : runwayMonths < runwayThresholdMonths
        ? 'medium'
        : 'low';

    const riskScore = {
      runwayMonths: {
        p50: runwayMonths,
        p10: conservativeRunway,
      },
      threshold: runwayThresholdMonths,
      probabilityBelowThreshold:
        conservativeRunway < runwayThresholdMonths ? 0.1 : runwayMonths < runwayThresholdMonths ? 0.5 : 0.0,
      riskLevel,
      recommendations: generateRecommendations(riskLevel, runwayMonths, runwayThresholdMonths),
    };

    return riskScore;
  },

  getModelRiskScores: async (
    modelId: string,
    userId: string,
    runwayThresholdMonths: number = 6
  ) => {
    // Get model
    const model = await prisma.model.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      throw new NotFoundError('Model not found');
    }

    // Verify user access
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId: model.orgId,
        },
      },
    });

    if (!role) {
      throw new ForbiddenError('No access to this model');
    }

    // Get all completed Monte Carlo jobs for this model
    const mcJobs = await prisma.monteCarloJob.findMany({
      where: {
        orgId: model.orgId,
        status: 'done',
        modelRun: {
          modelId: model.id,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10, // Last 10 runs
    });

    const riskScores = await Promise.all(
      mcJobs.map(async (job) => {
        try {
          const score = await riskService.calculateRiskScore(
            job.id,
            userId,
            runwayThresholdMonths
          );
          return {
            monteCarloJobId: job.id,
            modelRunId: job.modelRunId,
            createdAt: job.createdAt,
            riskScore: score,
          };
        } catch (error) {
          return {
            monteCarloJobId: job.id,
            modelRunId: job.modelRunId,
            createdAt: job.createdAt,
            error: (error as Error).message,
          };
        }
      })
    );

    return {
      modelId,
      threshold: runwayThresholdMonths,
      riskScores,
    };
  },
};

function generateRecommendations(
  riskLevel: string,
  runwayMonths: number,
  threshold: number
): string[] {
  const recommendations: string[] = [];

  if (riskLevel === 'high') {
    recommendations.push('Immediate action required: Cash runway is critically low');
    recommendations.push('Consider reducing operating expenses by 15-20%');
    recommendations.push('Explore additional funding or revenue opportunities');
    recommendations.push('Review and optimize all non-essential costs');
  } else if (riskLevel === 'medium') {
    recommendations.push('Monitor cash flow closely');
    recommendations.push('Consider cost optimization measures');
    recommendations.push('Plan for fundraising or revenue growth initiatives');
  } else {
    recommendations.push('Cash position is healthy');
    recommendations.push('Continue monitoring runway trends');
  }

  return recommendations;
}

