import { Response, NextFunction } from 'express';
import { jobService } from '../services/job.service';
import { ValidationError } from '../utils/errors';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/database';

export const jobController = {
  /**
   * POST /api/v1/jobs - Create a new job
   */
  createJob: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const {
        jobType,
        orgId,
        objectId,
        params,
        priority,
        queue,
        maxAttempts,
        billingEstimate,
      } = req.body;

      if (!jobType) {
        throw new ValidationError('jobType is required');
      }

      // Get idempotency key from header or request
      const idempotencyKey = (req.headers['idempotency-key'] as string) || req.body.idempotencyKey;

      const job = await jobService.createJob(
        {
          jobType,
          orgId,
          objectId,
          params,
          priority,
          queue,
          maxAttempts,
          billingEstimate,
          createdByUserId: req.user.id,
        },
        idempotencyKey
      );

      res.status(201).json({
        ok: true,
        jobId: job.id,
        status: job.status,
        cached: idempotencyKey ? job.idempotencyKey === idempotencyKey : false,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/jobs/:id - Get job status
   */
  getJobStatus: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id: jobId } = req.params;
      const job = await jobService.getJobStatus(jobId, req.user.id);

      res.json({
        ok: true,
        job: {
          id: job.id,
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        lastError: job.lastError,
          last_error: job.lastError, // Also include snake_case for compatibility
        logs: job.logs,
        workerId: job.workerId,
        runStartedAt: job.runStartedAt,
        finishedAt: job.finishedAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/jobs/:id/logs - Get job logs
   */
  getJobLogs: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id: jobId } = req.params;
      const job = await jobService.getJobStatus(jobId, req.user.id);

      // Extract logs from job.logs
      const logs = job.logs || {};
      let logLines: string[] = [];

      // Handle different log formats
      if (Array.isArray(logs)) {
        logLines = logs;
      } else if (typeof logs === 'string') {
        try {
          const parsed = JSON.parse(logs);
          if (Array.isArray(parsed)) {
            logLines = parsed;
          } else if (parsed.logs && Array.isArray(parsed.logs)) {
            logLines = parsed.logs;
          } else if (parsed.messages && Array.isArray(parsed.messages)) {
            logLines = parsed.messages;
          } else {
            logLines = [logs];
          }
        } catch {
          logLines = logs.split('\n');
        }
      } else if (logs && typeof logs === 'object') {
        // Extract log entries from object
        if (logs.logs && Array.isArray(logs.logs)) {
          logLines = logs.logs;
        } else if (logs.messages && Array.isArray(logs.messages)) {
          logLines = logs.messages;
        } else {
          // Convert object to string representation
          logLines = [JSON.stringify(logs, null, 2)];
        }
      }

      res.json({
        ok: true,
        logs: logLines,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/jobs/:id/results - Get job results
   */
  getJobResults: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id: jobId } = req.params;
      const job = await jobService.getJobStatus(jobId, req.user.id);

      if (job.status !== 'completed' && job.status !== 'done') {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'NOT_COMPLETED',
            message: 'Job is not completed yet',
            status: job.status,
          },
        });
      }

      // Extract results from job.logs or return job data
      const results = job.logs?.results || job.logs?.result || job.logs || {
        status: job.status,
        progress: job.progress,
        finishedAt: job.finishedAt,
      };

      res.json({
        ok: true,
        results,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/jobs/:id/cancel - Cancel a job
   */
  cancelJob: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id: jobId } = req.params;
      const job = await jobService.cancelJob(jobId, req.user.id);

      res.json({
        ok: true,
        jobId: job.id,
        status: job.status,
        cancelRequested: job.cancelRequested,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/jobs - List jobs (admin)
   */
  listJobs: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { status, orgId, jobType, queue, limit, offset, date_from, date_to, sort_by, sort_order } = req.query;

      // If orgId is provided, verify user has access to that org
      // Users can view jobs for their own organizations
      if (orgId && typeof orgId === 'string') {
        const role = await prisma.userOrgRole.findUnique({
          where: {
            userId_orgId: {
              userId: req.user.id,
              orgId,
            },
          },
        });

        if (!role) {
          throw new ValidationError('No access to this organization');
        }
        // Allow any role to view jobs for their org
      } else {
        // If no orgId specified, only allow admins to list all jobs
        // For now, require orgId to be specified
        throw new ValidationError('orgId is required');
      }

      const result = await jobService.listJobs({
        status: status as string,
        orgId: orgId as string,
        jobType: jobType as string,
        queue: queue as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
        dateFrom: date_from as string,
        dateTo: date_to as string,
        sortBy: sort_by as string,
        sortOrder: sort_order as string,
      });

      res.json({
        ok: true,
        data: result.jobs,
        total: result.total,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
    } catch (error) {
      next(error);
    }
  },
};
