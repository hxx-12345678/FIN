import { jobRepository } from '../repositories/job.repository';
import { uploadToS3 } from '../utils/s3';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import prisma from '../config/database';
import { auditService } from './audit.service';

export type JobType =
  | 'csv_import'
  | 'connector_initial_sync'
  | 'connector_sync'
  | 'model_run'
  | 'monte_carlo'
  | 'export_pdf'
  | 'export_pptx'
  | 'investor_export_pdf'
  | 'investor_export_pptx'
  | 'export_csv'
  | 'provenance_export'
  | 'auto_model_trigger'
  | 'scheduled_auto_model'
  | 'scheduled_connector_sync'
  | 'xlsx_preview'
  | 'xlsx_import'
  | 'excel_export'
  | 'excel_merge'
  | 'alert_check'
  | 'aicfo_chat';

export interface CreateJobParams {
  jobType: JobType;
  orgId?: string;
  objectId?: string;
  params?: any;
  s3Key?: string;
  priority?: number;
  queue?: string;
  maxAttempts?: number;
  billingEstimate?: number;
  idempotencyKey?: string;
  createdByUserId?: string;
}

// Job type to queue mapping
const JOB_TYPE_QUEUE_MAP: Record<JobType, string> = {
  csv_import: 'default',
  connector_initial_sync: 'connectors',
  connector_sync: 'connectors',
  model_run: 'default',
  monte_carlo: 'montecarlo',
  export_pdf: 'exports',
  export_pptx: 'exports',
  investor_export_pdf: 'exports',
  investor_export_pptx: 'exports',
  export_csv: 'exports',
  provenance_export: 'exports',
  auto_model_trigger: 'default',
  scheduled_auto_model: 'default',
  scheduled_connector_sync: 'connectors',
  xlsx_preview: 'default',
  xlsx_import: 'default',
  excel_export: 'exports',
  excel_merge: 'default',
  alert_check: 'default',
  aicfo_chat: 'default',
};

// Default priorities per job type
const JOB_TYPE_PRIORITY: Record<JobType, number> = {
  csv_import: 50,
  connector_initial_sync: 40,
  connector_sync: 50,
  model_run: 50,
  monte_carlo: 30, // Lower priority for long-running compute
  export_pdf: 70, // Higher priority for exports
  export_pptx: 70,
  investor_export_pdf: 75, // Highest priority for investor exports
  investor_export_pptx: 75,
  export_csv: 70,
  provenance_export: 60,
  auto_model_trigger: 45, // Medium priority for auto-triggers
  scheduled_auto_model: 30, // Lower priority for scheduled jobs
  scheduled_connector_sync: 35, // Lower priority for scheduled syncs
  xlsx_preview: 60,
  xlsx_import: 50,
  excel_export: 70,
  excel_merge: 50,
  alert_check: 80, // High priority for alerts
  aicfo_chat: 90, // Real-time chat gets highest priority
};

export const jobService = {
  createJob: async (params: CreateJobParams, idempotencyKey?: string): Promise<any> => {
    const {
      jobType,
      orgId,
      objectId,
      params: jobParams,
      s3Key,
      priority,
      queue,
      maxAttempts,
      billingEstimate,
      createdByUserId,
    } = params;

    // Check idempotency if key provided
    const finalIdempotencyKey = idempotencyKey || params.idempotencyKey;
    if (finalIdempotencyKey) {
      const existing = await jobRepository.findByIdempotencyKey(finalIdempotencyKey);
      if (existing) {
        const activeStatuses = ['queued', 'running', 'retrying'];
        if (activeStatuses.includes(existing.status)) {
          // Return existing job
          return existing;
        }
      }
    }

    // Determine queue and priority
    const finalQueue = queue || JOB_TYPE_QUEUE_MAP[jobType] || 'default';
    const finalPriority = priority ?? JOB_TYPE_PRIORITY[jobType] ?? 50;

    // If file upload needed, handle it here
    let finalS3Key = s3Key;
    if (jobParams?.file && !s3Key) {
      finalS3Key = await uploadToS3(
        `jobs/${jobType}/${Date.now()}-${jobParams.fileName || 'file'}`,
        jobParams.file
      );
    }

    // Create logs array
    const logs: any[] = [
      {
        ts: new Date().toISOString(),
        level: 'info',
        msg: 'Job created',
        meta: {
          jobType,
          queue: finalQueue,
          priority: finalPriority,
        },
      },
    ];

    if (jobParams) {
      logs.push({
        ts: new Date().toISOString(),
        level: 'info',
        msg: 'Job parameters set',
        meta: { params: jobParams, s3Key: finalS3Key },
      });
    }

    const job = await jobRepository.create({
      jobType,
      orgId,
      objectId,
      status: 'queued',
      progress: 0,
      logs,
      priority: finalPriority,
      queue: finalQueue,
      maxAttempts: maxAttempts ?? 5,
      createdByUserId,
      billingEstimate,
      idempotencyKey: finalIdempotencyKey,
      params: jobParams,
    });

    // Log audit event
    if (orgId && createdByUserId) {
      await auditService.log({
        actorUserId: createdByUserId,
        orgId,
        action: 'job_created',
        objectType: 'job',
        objectId: job.id,
        metaJson: {
          jobType,
          queue: finalQueue,
          priority: finalPriority,
        },
      });
    }

    return job;
  },

  getJobStatus: async (jobId: string, userId?: string): Promise<any> => {
    const job = await jobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    // If userId provided, verify access
    if (userId && job.orgId) {
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId,
            orgId: job.orgId,
          },
        },
      });

      if (!role) {
        throw new ForbiddenError('No access to this job');
      }
    }

    // Format logs for response
    let formattedLogs = job.logs;
    if (Array.isArray(job.logs)) {
      formattedLogs = job.logs;
    } else if (job.logs && typeof job.logs === 'object') {
      // Convert old format to array format
      formattedLogs = [
        {
          ts: new Date().toISOString(),
          level: 'info',
          msg: 'Job log',
          meta: job.logs,
        },
      ];
    }

    return {
      ...job,
      progress: job.progress ? Number(job.progress) : 0,
      logs: formattedLogs,
    };
  },

  cancelJob: async (jobId: string, userId: string): Promise<any> => {
    const job = await jobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    // Verify access
    if (job.orgId) {
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId,
            orgId: job.orgId,
          },
        },
      });

      if (!role) {
        throw new ForbiddenError('No access to this job');
      }
    }

    const cancelled = await jobRepository.cancelJob(jobId);

    // Log audit event
    if (job.orgId) {
      await auditService.log({
        actorUserId: userId,
        orgId: job.orgId,
        action: 'job_cancelled',
        objectType: 'job',
        objectId: jobId,
        metaJson: {
          previousStatus: job.status,
          newStatus: cancelled.status,
        },
      });
    }

    return cancelled;
  },

  requeueJob: async (jobId: string, userId: string): Promise<any> => {
    const job = await jobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    // Verify admin access
    if (job.orgId) {
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId,
            orgId: job.orgId,
          },
        },
      });

      if (!role || !['admin', 'finance'].includes(role.role)) {
        throw new ForbiddenError('Only admins and finance users can requeue jobs');
      }
    }

    const requeued = await jobRepository.requeueJob(jobId);

    // Log audit event
    if (job.orgId) {
      await auditService.log({
        actorUserId: userId,
        orgId: job.orgId,
        action: 'job_requeued',
        objectType: 'job',
        objectId: jobId,
        metaJson: {
          previousStatus: job.status,
        },
      });
    }

    return requeued;
  },

  listJobs: async (filters: {
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
  }): Promise<{ jobs: any[]; total: number }> => {
    return await jobRepository.findJobs(filters);
  },
};
