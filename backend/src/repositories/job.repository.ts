import prisma from '../config/database';
import { Job, Prisma } from '@prisma/client';

export interface CreateJobData {
  jobType: string;
  orgId?: string;
  objectId?: string;
  status?: string;
  progress?: number;
  logs?: any;
  priority?: number;
  queue?: string;
  maxAttempts?: number;
  createdByUserId?: string;
  billingEstimate?: number;
  idempotencyKey?: string;
  params?: any;
}

export interface ReserveJobResult {
  job: Job | null;
  reserved: boolean;
}

export const jobRepository = {
  create: async (data: CreateJobData): Promise<Job> => {
    const logs = data.logs || {};
    if (data.params) {
      logs.params = data.params;
    }
    if (!logs.createdAt) {
      logs.createdAt = new Date().toISOString();
    }

    // Build data object with only defined fields to avoid Prisma errors
    const jobData: any = {
      jobType: data.jobType,
      objectId: data.objectId,
      status: data.status || 'queued',
      progress: data.progress || 0,
      logs,
    };

    // Add org relation if orgId provided
    if (data.orgId) {
      jobData.org = {
        connect: { id: data.orgId },
      };
    }

    // Add optional fields only if they are defined
    if (data.priority !== undefined) {
      jobData.priority = data.priority;
    }
    if (data.queue !== undefined) {
      jobData.queue = data.queue;
    }
    if (data.maxAttempts !== undefined) {
      jobData.maxAttempts = data.maxAttempts;
    }
    if (data.createdByUserId !== undefined) {
      jobData.createdByUserId = data.createdByUserId;
    }
    if (data.billingEstimate !== undefined) {
      jobData.billingEstimate = data.billingEstimate;
    }
    if (data.idempotencyKey !== undefined) {
      jobData.idempotencyKey = data.idempotencyKey;
    }

    return await prisma.job.create({
      data: jobData,
    });
  },

  findById: async (id: string): Promise<Job | null> => {
    return await prisma.job.findUnique({ where: { id } });
  },

  findByIdempotencyKey: async (key: string): Promise<Job | null> => {
    return await prisma.job.findUnique({ where: { idempotencyKey: key } });
  },

  /**
   * Reserve a job for processing (atomic operation)
   * Returns the job if successfully reserved, null otherwise
   */
  reserveJob: async (
    queue: string,
    workerId: string,
    visibilityTimeoutSeconds: number = 1800
  ): Promise<ReserveJobResult> => {
    const now = new Date();
    const visibilityExpiresAt = new Date(now.getTime() + visibilityTimeoutSeconds * 1000);

    // Use raw query for atomic reservation
    const result = await prisma.$queryRaw<Array<{ id: string }>>`
      UPDATE jobs
      SET 
        status = 'running',
        "workerId" = ${workerId},
        "runStartedAt" = NOW(),
        "visibilityExpiresAt" = ${visibilityExpiresAt}::timestamptz,
        "updatedAt" = NOW()
      WHERE id = (
        SELECT id
        FROM jobs
        WHERE status = 'queued'
          AND queue = ${queue}
          AND ("nextRunAt" IS NULL OR "nextRunAt" <= NOW())
          AND "cancelRequested" = false
        ORDER BY priority DESC, "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id
    `;

    if (result.length === 0) {
      return { job: null, reserved: false };
    }

    const job = await prisma.job.findUnique({
      where: { id: result[0].id },
    });

    return { job, reserved: job !== null };
  },

  /**
   * Extend visibility timeout for a running job
   */
  extendVisibility: async (
    jobId: string,
    visibilityTimeoutSeconds: number
  ): Promise<void> => {
    const now = new Date();
    const visibilityExpiresAt = new Date(now.getTime() + visibilityTimeoutSeconds * 1000);

    await prisma.job.update({
      where: { id: jobId },
      data: {
        visibilityExpiresAt,
        updatedAt: now,
      },
    });
  },

  /**
   * Mark job as completed
   */
  completeJob: async (jobId: string, result?: any): Promise<Job> => {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new Error('Job not found');
    }

    const logs = (job.logs as any) || [];
    if (result) {
      logs.push({
        ts: new Date().toISOString(),
        level: 'info',
        msg: 'Job completed successfully',
        meta: result,
      });
    }

    return await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        progress: 100,
        finishedAt: new Date(),
        logs,
        updatedAt: new Date(),
      },
    });
  },

  /**
   * Mark job as failed and schedule retry if attempts < maxAttempts
   */
  failJob: async (
    jobId: string,
    error: Error,
    baseBackoffSeconds: number = 30
  ): Promise<Job> => {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new Error('Job not found');
    }

    const newAttempts = job.attempts + 1;
    const logs = (job.logs as any) || [];
    logs.push({
      ts: new Date().toISOString(),
      level: 'error',
      msg: error.message,
      meta: {
        attempt: newAttempts,
        stack: error.stack,
      },
    });

    // Calculate backoff with jitter
    const backoffSeconds = baseBackoffSeconds * Math.pow(2, newAttempts - 1);
    const jitter = Math.random() * baseBackoffSeconds;
    const totalBackoff = backoffSeconds + jitter;

    const nextRunAt = new Date(Date.now() + totalBackoff * 1000);

    if (newAttempts >= job.maxAttempts) {
      // Move to dead letter queue
      return await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'dead_letter',
          attempts: newAttempts,
          lastError: error.message.substring(0, 500), // Truncate long errors
          logs,
          finishedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // Schedule retry
    return await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'retrying',
        attempts: newAttempts,
        lastError: error.message.substring(0, 500),
        nextRunAt,
        logs,
        workerId: null, // Release worker
        runStartedAt: null,
        visibilityExpiresAt: null,
        updatedAt: new Date(),
      },
    });
  },

  /**
   * Update job progress and append log entry
   */
  updateProgress: async (
    jobId: string,
    progress: number,
    logEntry?: { level: string; msg: string; meta?: any }
  ): Promise<Job> => {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new Error('Job not found');
    }

    const logs = (job.logs as any) || [];
    if (logEntry) {
      logs.push({
        ts: new Date().toISOString(),
        level: logEntry.level,
        msg: logEntry.msg,
        meta: logEntry.meta,
      });
    }

    // Keep only last 1000 log entries to avoid bloat
    const maxLogs = 1000;
    const trimmedLogs = logs.slice(-maxLogs);

    return await prisma.job.update({
      where: { id: jobId },
      data: {
        progress: Math.min(100, Math.max(0, progress)),
        logs: trimmedLogs,
        updatedAt: new Date(),
      },
    });
  },

  /**
   * Cancel a job
   */
  cancelJob: async (jobId: string): Promise<Job> => {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status === 'queued' || job.status === 'retrying') {
      // Can cancel immediately
      return await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'cancelled',
          finishedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    if (job.status === 'running') {
      // Request cancellation - worker will check cancelRequested flag
      return await prisma.job.update({
        where: { id: jobId },
        data: {
          cancelRequested: true,
          updatedAt: new Date(),
        },
      });
    }

    // Already completed/failed/cancelled
    return job;
  },

  /**
   * Requeue a failed or dead-letter job
   */
  requeueJob: async (jobId: string): Promise<Job> => {
    return await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'queued',
        attempts: 0,
        lastError: null,
        nextRunAt: null,
        cancelRequested: false,
        workerId: null,
        runStartedAt: null,
        visibilityExpiresAt: null,
        updatedAt: new Date(),
      },
    });
  },

  /**
   * Find jobs by filters (for admin endpoints)
   */
  findJobs: async (filters: {
    status?: string;
    orgId?: string;
    jobType?: string;
    queue?: string;
    limit?: number;
    offset?: number;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ jobs: Job[]; total: number }> => {
    const where: Prisma.JobWhereInput = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.orgId) {
      where.orgId = filters.orgId;
    }
    if (filters.jobType) {
      where.jobType = filters.jobType;
    }
    if (filters.queue) {
      where.queue = filters.queue;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        // Add one day to include the entire end date
        const endDate = new Date(filters.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        where.createdAt.lte = endDate;
      }
    }

    // Build orderBy clause
    let orderBy: Prisma.JobOrderByWithRelationInput = { createdAt: 'desc' };
    if (filters.sortBy) {
      if (filters.sortBy === 'date') {
        orderBy = { createdAt: filters.sortOrder === 'asc' ? 'asc' : 'desc' };
      } else if (filters.sortBy === 'status') {
        orderBy = { status: filters.sortOrder === 'asc' ? 'asc' : 'desc' };
      }
      // Duration sorting would require computed field, skip for now
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy,
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      prisma.job.count({ where }),
    ]);

    return { jobs, total };
  },

  /**
   * Release stuck jobs (visibility expired)
   */
  releaseStuckJobs: async (queue: string): Promise<number> => {
    const now = new Date();
    const result = await prisma.job.updateMany({
      where: {
        status: 'running',
        queue,
        visibilityExpiresAt: {
          lt: now,
        },
      },
      data: {
        status: 'queued',
        attempts: {
          increment: 1,
        },
        workerId: null,
        runStartedAt: null,
        visibilityExpiresAt: null,
        updatedAt: now,
      },
    });

    return result.count;
  },
};
