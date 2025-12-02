/**
 * SCHEDULED AUTO-MODEL SERVICE
 * Creates scheduled jobs to run auto-model checks every 6 hours
 */

import prisma from '../config/database';
import { jobService } from './job.service';
import { logger } from '../utils/logger';

/**
 * Create a scheduled auto-model job (runs every 6 hours)
 * This should be called by a cron job or scheduler
 */
export async function createScheduledAutoModelJob(): Promise<{
  success: boolean;
  jobId?: string;
  error?: string;
}> {
  try {
    logger.info('Creating scheduled auto-model job...');

    // Check if there's already a queued/running scheduled job
    const existingJob = await prisma.job.findFirst({
      where: {
        jobType: 'scheduled_auto_model' as any,
        status: {
          in: ['queued', 'running'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingJob) {
      logger.debug(`Scheduled auto-model: Job ${existingJob.id} already exists, skipping`);
      return {
        success: true,
        jobId: existingJob.id,
      };
    }

    // Create scheduled job
    const job = await jobService.createJob({
      jobType: 'scheduled_auto_model' as any,
      params: {
        scheduledAt: new Date().toISOString(),
        interval: '6_hours',
      },
      priority: 30, // Lower priority
    });

    logger.info(`✅ Scheduled auto-model job created: ${job.id}`);

    return {
      success: true,
      jobId: job.id,
    };
  } catch (error: any) {
    logger.error(`❌ Failed to create scheduled auto-model job: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

export const scheduledAutoModelService = {
  createScheduledAutoModelJob,
};

