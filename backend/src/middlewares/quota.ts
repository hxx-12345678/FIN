import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from './auth';
import { ForbiddenError, ValidationError } from '../utils/errors';

const MAX_CONCURRENT_JOBS_PER_ORG = parseInt(
  process.env.MAX_CONCURRENT_JOBS_PER_ORG || '5',
  10
);

// Quota configuration per job type
const QUOTA_CONFIG: Record<string, { maxConcurrent?: number; maxPerDay?: number }> = {
  monte_carlo: {
    maxConcurrent: 2, // Limit concurrent Monte Carlo jobs
  },
  export_pdf: {
    maxConcurrent: 3,
    maxPerDay: 50,
  },
  export_pptx: {
    maxConcurrent: 3,
    maxPerDay: 50,
  },
  provenance_export: {
    maxConcurrent: 2,
    maxPerDay: 20,
  },
};

/**
 * Quota middleware
 * Checks if org has exceeded quotas before creating a job
 */
export const quotaMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const { orgId, jobType } = req.body;

    if (!orgId || !jobType) {
      // Skip quota check if orgId/jobType not provided
      return next();
    }

    // Get quota config for this job type
    const quota = QUOTA_CONFIG[jobType] || {};

    // Check concurrent jobs limit
    const maxConcurrent = quota.maxConcurrent || MAX_CONCURRENT_JOBS_PER_ORG;
    const runningJobs = await prisma.job.count({
      where: {
        orgId,
        status: {
          in: ['queued', 'running', 'retrying'],
        },
      },
    });

    if (runningJobs >= maxConcurrent) {
      throw new ForbiddenError(
        `Organization has reached maximum concurrent jobs limit (${maxConcurrent}). Please wait for existing jobs to complete.`
      );
    }

    // Check daily limit if configured
    if (quota.maxPerDay) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const jobsToday = await prisma.job.count({
        where: {
          orgId,
          jobType,
          createdAt: {
            gte: today,
          },
        },
      });

      if (jobsToday >= quota.maxPerDay) {
        throw new ForbiddenError(
          `Daily limit of ${quota.maxPerDay} ${jobType} jobs has been reached. Please try again tomorrow.`
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};


