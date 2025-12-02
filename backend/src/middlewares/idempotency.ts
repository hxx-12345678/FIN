import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from './auth';
import { ConflictError } from '../utils/errors';

const IDEMPOTENCY_TTL_HOURS = parseInt(process.env.JOB_IDEMPOTENCY_TTL_HOURS || '24', 10);

/**
 * Idempotency middleware
 * Checks for existing job with same idempotency key
 * If found and job is still active (queued/running/retrying), returns existing job
 * Otherwise, attaches idempotency key to request for job creation
 */
export const idempotencyMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'] as string;

    if (!idempotencyKey) {
      // No idempotency key provided - continue normally
      return next();
    }

    // Check for existing job with this key
    const existingJob = await prisma.job.findUnique({
      where: { idempotencyKey },
    });

    if (existingJob) {
      // Check if job is still active
      const activeStatuses = ['queued', 'running', 'retrying'];
      if (activeStatuses.includes(existingJob.status)) {
        // Return existing job
        return res.json({
          ok: true,
          jobId: existingJob.id,
          status: existingJob.status,
          cached: true,
        });
      }

      // Check if idempotency key is still valid (within TTL)
      const keyAge = Date.now() - existingJob.createdAt.getTime();
      const ttlMs = IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000;

      if (keyAge < ttlMs) {
        // Key still valid but job completed/failed - allow new job creation
        // but log this case for monitoring
        console.warn(
          `Idempotency key ${idempotencyKey} reused after job ${existingJob.id} finished with status ${existingJob.status}`
        );
      }
    }

    // Attach idempotency key to request for job creation
    (req as any).idempotencyKey = idempotencyKey;
    next();
  } catch (error) {
    next(error);
  }
};


