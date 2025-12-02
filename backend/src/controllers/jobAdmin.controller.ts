import { Response, NextFunction } from 'express';
import { jobRepository } from '../repositories/job.repository';
import { ValidationError, ForbiddenError, NotFoundError } from '../utils/errors';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/database';
import { auditService } from '../services/audit.service';

export const jobAdminController = {
  /**
   * GET /api/v1/admin/jobs - List jobs with filters (admin only)
   */
  listJobs: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      // Verify admin access
      const { orgId } = req.query;
      if (orgId && typeof orgId === 'string') {
        const role = await prisma.userOrgRole.findFirst({
          where: {
            userId: req.user.id,
            orgId: orgId as string,
            role: 'admin',
          },
        });

        if (!role) {
          throw new ForbiddenError('Admin access required');
        }
      }

      const { status, jobType, queue, limit, offset } = req.query;

      const result = await jobRepository.findJobs({
        status: status as string,
        orgId: orgId as string,
        jobType: jobType as string,
        queue: queue as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });

      res.json({
        ok: true,
        data: result.jobs,
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/admin/jobs/:id/requeue - Requeue a failed or dead-letter job
   */
  requeueJob: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id: jobId } = req.params;
      const job = await jobRepository.findById(jobId);

      if (!job) {
        throw new NotFoundError('Job not found');
      }

      // Verify admin access
      if (job.orgId) {
        const role = await prisma.userOrgRole.findUnique({
          where: {
            userId_orgId: {
              userId: req.user.id,
              orgId: job.orgId,
            },
          },
        });

        if (!role || !['admin', 'finance'].includes(role.role)) {
          throw new ForbiddenError('Admin or finance access required');
        }
      }

      const requeued = await jobRepository.requeueJob(jobId);

      // Log audit event
      if (job.orgId) {
        await auditService.log({
          actorUserId: req.user.id,
          orgId: job.orgId,
          action: 'job_requeued',
          objectType: 'job',
          objectId: jobId,
          metaJson: {
            previousStatus: job.status,
          },
        });
      }

      res.json({
        ok: true,
        jobId: requeued.id,
        status: requeued.status,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/admin/jobs/:id/force_fail - Force fail a job
   */
  forceFail: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id: jobId } = req.params;
      const { reason } = req.body;

      const job = await jobRepository.findById(jobId);
      if (!job) {
        throw new NotFoundError('Job not found');
      }

      // Verify admin access
      if (job.orgId) {
        const role = await prisma.userOrgRole.findUnique({
          where: {
            userId_orgId: {
              userId: req.user.id,
              orgId: job.orgId,
            },
          },
        });

        if (!role || role.role !== 'admin') {
          throw new ForbiddenError('Admin access required');
        }
      }

      const logs = (job.logs as any) || [];
      logs.push({
        ts: new Date().toISOString(),
        level: 'error',
        msg: `Job force-failed by admin: ${reason || 'No reason provided'}`,
        meta: { adminUserId: req.user.id },
      });

      const failed = await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          lastError: reason || 'Force failed by admin',
          logs,
          finishedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Log audit event
      if (job.orgId) {
        await auditService.log({
          actorUserId: req.user.id,
          orgId: job.orgId,
          action: 'job_force_failed',
          objectType: 'job',
          objectId: jobId,
          metaJson: { reason },
        });
      }

      res.json({
        ok: true,
        jobId: failed.id,
        status: failed.status,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/admin/jobs/:id/set_max_attempts - Update max attempts
   */
  setMaxAttempts: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id: jobId } = req.params;
      const { maxAttempts } = req.body;

      if (!maxAttempts || typeof maxAttempts !== 'number' || maxAttempts < 1) {
        throw new ValidationError('maxAttempts must be a positive number');
      }

      const job = await jobRepository.findById(jobId);
      if (!job) {
        throw new NotFoundError('Job not found');
      }

      // Verify admin access
      if (job.orgId) {
        const role = await prisma.userOrgRole.findUnique({
          where: {
            userId_orgId: {
              userId: req.user.id,
              orgId: job.orgId,
            },
          },
        });

        if (!role || role.role !== 'admin') {
          throw new ForbiddenError('Admin access required');
        }
      }

      const updated = await prisma.job.update({
        where: { id: jobId },
        data: {
          maxAttempts,
          updatedAt: new Date(),
        },
      });

      res.json({
        ok: true,
        jobId: updated.id,
        maxAttempts: updated.maxAttempts,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/admin/jobs/:id/release - Release a stuck job
   */
  releaseJob: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id: jobId } = req.params;
      const job = await jobRepository.findById(jobId);

      if (!job) {
        throw new NotFoundError('Job not found');
      }

      // Verify admin access
      if (job.orgId) {
        const role = await prisma.userOrgRole.findUnique({
          where: {
            userId_orgId: {
              userId: req.user.id,
              orgId: job.orgId,
            },
          },
        });

        if (!role || role.role !== 'admin') {
          throw new ForbiddenError('Admin access required');
        }
      }

      // Release the job
      const released = await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'queued',
          attempts: {
            increment: 1,
          },
          workerId: null,
          runStartedAt: null,
          visibilityExpiresAt: null,
          updatedAt: new Date(),
        },
      });

      res.json({
        ok: true,
        jobId: released.id,
        status: released.status,
      });
    } catch (error) {
      next(error);
    }
  },
};


