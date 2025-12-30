/**
 * Connector Sync Service
 * Handles scheduled auto-sync and sync health reporting
 */

import prisma from '../config/database';
import { jobService } from './job.service';
import { auditService } from './audit.service';
import { ValidationError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface ConnectorSyncHealth {
  connectorId: string;
  lastSyncedAt: Date | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  newTransactionsPulled: number;
  errorCount: number;
  syncFrequencyHours: number;
  autoSyncEnabled: boolean;
  nextSyncDue: Date | null;
}

export interface SyncStats {
  totalConnectors: number;
  synced: number;
  skipped: number;
  errors: number;
  triggered: number;
}

export const connectorSyncService = {
  /**
   * Create scheduled connector sync job (runs every 12 hours)
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

  /**
   * Get connector sync health
   */
  getConnectorHealth: async (
    userId: string,
    connectorId: string
  ): Promise<ConnectorSyncHealth> => {
    try {
      const connector = await prisma.connector.findUnique({
        where: { id: connectorId },
        include: {
          org: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!connector) {
        throw new NotFoundError('Connector not found');
      }

      // Verify user has access to org
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId,
            orgId: connector.orgId,
          },
        },
      });

      if (!role) {
        throw new NotFoundError('No access to this connector');
      }

      // Get recent sync stats
      const recentSyncs = await prisma.job.findMany({
        where: {
          jobType: 'connector_sync',
          objectId: connectorId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      });

      const successfulSyncs = recentSyncs.filter(j => j.status === 'done');
      const failedSyncs = recentSyncs.filter(j => j.status === 'failed');

      // Calculate new transactions pulled (from job logs)
      let newTransactionsPulled = 0;
      if (successfulSyncs.length > 0) {
        const lastSync = successfulSyncs[0];
        const logsRaw = lastSync.logs as any;
        try {
          const logs = typeof logsRaw === 'string' ? JSON.parse(logsRaw) : logsRaw;
          if (Array.isArray(logs)) {
            // Backend/worker logs are typically an array of entries; search for meta.newTransactionsPulled
            for (let i = logs.length - 1; i >= 0; i--) {
              const entry = logs[i];
              const meta = entry?.meta;
              if (meta && typeof meta === 'object') {
                const v = meta.newTransactionsPulled ?? meta.transactionsPulled;
                if (typeof v === 'number') {
                  newTransactionsPulled = v;
                  break;
                }
              }
            }
          } else if (logs && typeof logs === 'object') {
            newTransactionsPulled = logs.newTransactionsPulled || logs.transactionsPulled || 0;
          }
        } catch {
          // ignore
        }
      }

      // Calculate next sync due
      let nextSyncDue: Date | null = null;
      if (connector.lastSyncedAt && connector.syncFrequencyHours) {
        nextSyncDue = new Date(
          connector.lastSyncedAt.getTime() + connector.syncFrequencyHours * 60 * 60 * 1000
        );
      }

      return {
        connectorId: connector.id,
        lastSyncedAt: connector.lastSyncedAt,
        lastSyncStatus: connector.lastSyncStatus,
        lastSyncError: connector.lastSyncError,
        newTransactionsPulled,
        errorCount: failedSyncs.length,
        syncFrequencyHours: connector.syncFrequencyHours || 24,
        autoSyncEnabled: connector.autoSyncEnabled,
        nextSyncDue,
      };
    } catch (error: any) {
      logger.error(`Failed to get connector health: ${error.message}`, error);
      throw error;
    }
  },

  /**
   * Update connector sync settings
   */
  updateSyncSettings: async (
    userId: string,
    connectorId: string,
    settings: {
      syncFrequencyHours?: number;
      autoSyncEnabled?: boolean;
    }
  ): Promise<void> => {
    try {
      const connector = await prisma.connector.findUnique({
        where: { id: connectorId },
        include: {
          org: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!connector) {
        throw new NotFoundError('Connector not found');
      }

      // Verify user has access
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId,
            orgId: connector.orgId,
          },
        },
      });

      if (!role || !['admin', 'finance'].includes(role.role)) {
        throw new ValidationError('Only admins and finance users can update sync settings');
      }

      // Update settings
      const updateData: any = {};
      if (settings.syncFrequencyHours !== undefined) {
        updateData.syncFrequencyHours = settings.syncFrequencyHours;
      }
      if (settings.autoSyncEnabled !== undefined) {
        updateData.autoSyncEnabled = settings.autoSyncEnabled;
      }
      
      await prisma.connector.update({
        where: { id: connectorId },
        data: updateData,
      });

      // Create audit log
      await auditService.log({
        actorUserId: userId,
        orgId: connector.orgId,
        action: 'connector_sync_settings_updated',
        objectType: 'connector',
        objectId: connectorId,
        metaJson: settings,
      });

      logger.info(`Connector sync settings updated: ${connectorId}`);
    } catch (error: any) {
      logger.error(`Failed to update connector sync settings: ${error.message}`, error);
      throw error;
    }
  },
};


