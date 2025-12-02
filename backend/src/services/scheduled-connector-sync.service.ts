/**
 * Scheduled Connector Sync Service
 * Creates scheduled jobs to run connector syncs every 12 hours
 */

import prisma from '../config/database';
import { jobService } from './job.service';
import { logger } from '../utils/logger';

export const scheduledConnectorSyncService = {
  /**
   * Create a scheduled connector sync job (runs every 12 hours)
   * This should be called by a cron job or scheduler
   */
  createScheduledSyncJob: async (): Promise<{
    success: boolean;
    jobId?: string;
    error?: string;
  }> => {
    try {
      logger.info('Creating scheduled connector sync job...');

      // Check if there's already a queued/running scheduled sync job
      const existingJob = await prisma.job.findFirst({
        where: {
          jobType: 'scheduled_connector_sync',
          status: {
            in: ['queued', 'running'],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (existingJob) {
        logger.debug(`Scheduled connector sync: Job ${existingJob.id} already exists, skipping`);
        return {
          success: true,
          jobId: existingJob.id,
        };
      }

      // Create scheduled job
      const job = await jobService.createJob({
        jobType: 'scheduled_connector_sync',
        params: {
          scheduledAt: new Date().toISOString(),
          interval: '12_hours',
        },
        priority: 35, // Lower priority
      });

      logger.info(`✅ Scheduled connector sync job created: ${job.id}`);

      return {
        success: true,
        jobId: job.id,
      };
    } catch (error: any) {
      logger.error(`❌ Failed to create scheduled connector sync job: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  },
};


