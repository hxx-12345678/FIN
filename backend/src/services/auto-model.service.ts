/**
 * AUTO MODEL SERVICE
 * Automatically triggers P&L/Cash model runs when:
 * - New transactions are imported
 * - Connector sync completes
 * - CSV import completes
 * - Scheduled (every 6 hours)
 */

import prisma from '../config/database';
import { jobService } from './job.service';
import { auditService } from './audit.service';
import { logger } from '../utils/logger';

export interface AutoModelTrigger {
  orgId: string;
  triggerType: 'transaction_import' | 'connector_sync' | 'csv_import' | 'scheduled';
  triggerSource?: string; // jobId, connectorId, etc.
  userId?: string; // If triggered by user action
}

/**
 * Check if auto-model should run for an org
 * Returns true if:
 * - Org has at least one model
 * - No model run is currently running for this org
 * - Last auto-model was more than 1 hour ago (to prevent spam)
 */
async function shouldRunAutoModel(orgId: string): Promise<boolean> {
  try {
    // Check if org has any models
    const modelCount = await prisma.model.count({
      where: { orgId },
    });

    if (modelCount === 0) {
      logger.debug(`Auto-model: Org ${orgId} has no models, skipping`);
      return false;
    }

    // Check if there's already a running model run for this org
    const runningRun = await prisma.modelRun.findFirst({
      where: {
        orgId,
        status: {
          in: ['queued', 'running'],
        },
      },
    });

    if (runningRun) {
      logger.debug(`Auto-model: Org ${orgId} already has a running model run (${runningRun.id}), skipping`);
      return false;
    }

    // Check last auto-model timestamp (prevent spam - at least 1 hour between runs)
    const lastAutoModel = await prisma.modelRun.findFirst({
      where: {
        orgId,
        runType: 'baseline',
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (lastAutoModel) {
      const hoursSinceLastRun = (Date.now() - lastAutoModel.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastRun < 1) {
        logger.debug(`Auto-model: Org ${orgId} had model run ${hoursSinceLastRun.toFixed(2)} hours ago, skipping (min 1 hour)`);
        return false;
      }
    }

    return true;
  } catch (error: any) {
    logger.error(`Auto-model: Error checking if should run for org ${orgId}: ${error.message}`);
    return false;
  }
}

/**
 * Get the primary model for an org (most recent or default)
 */
async function getPrimaryModel(orgId: string): Promise<string | null> {
  try {
    const model = await prisma.model.findFirst({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    return model?.id || null;
  } catch (error: any) {
    logger.error(`Auto-model: Error getting primary model for org ${orgId}: ${error.message}`);
    return null;
  }
}

/**
 * Trigger auto-model run for an org
 */
export async function triggerAutoModel(trigger: AutoModelTrigger): Promise<{
  success: boolean;
  modelRunId?: string;
  jobId?: string;
  reason?: string;
}> {
  const { orgId, triggerType, triggerSource, userId } = trigger;

  try {
    logger.info(`Auto-model: Triggering for org ${orgId}, type: ${triggerType}, source: ${triggerSource || 'none'}`);

    // Check if should run
    const shouldRun = await shouldRunAutoModel(orgId);
    if (!shouldRun) {
      return {
        success: false,
        reason: 'Auto-model conditions not met (no models, already running, or too recent)',
      };
    }

    // Get primary model
    const modelId = await getPrimaryModel(orgId);
    if (!modelId) {
      return {
        success: false,
        reason: 'No model found for org',
      };
    }

    // Create model run job with idempotency key
    const idempotencyKey = `auto-model-${orgId}-${modelId}-${Date.now()}`;

    // Check for existing job with same idempotency pattern (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existingJob = await prisma.job.findFirst({
      where: {
        orgId,
        jobType: 'model_run',
        objectId: modelId,
        status: {
          in: ['queued', 'running'],
        },
        createdAt: {
          gte: oneHourAgo,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingJob) {
      logger.debug(`Auto-model: Existing model run job found (${existingJob.id}), skipping duplicate`);
      return {
        success: false,
        reason: 'Duplicate job already exists',
        jobId: existingJob.id,
      };
    }

    // Create model run job
    const job = await jobService.createJob({
      jobType: 'model_run',
      orgId,
      objectId: modelId,
      params: {
        modelId,
        runType: 'baseline',
        autoTriggered: true,
        triggerType,
        triggerSource,
        triggeredAt: new Date().toISOString(),
      },
      priority: 40, // Lower priority than manual runs
      idempotencyKey,
      createdByUserId: userId,
    });

    // Log audit event
    await auditService.log({
      actorUserId: userId || undefined,
      orgId,
      action: 'auto_model_triggered',
      objectType: 'model_run',
      objectId: job.id,
      metaJson: {
        modelId,
        triggerType,
        triggerSource,
        jobId: job.id,
      },
    });

    logger.info(`Auto-model: ✅ Successfully triggered model run job ${job.id} for org ${orgId}`);

    return {
      success: true,
      jobId: job.id,
      modelRunId: job.id, // Job ID is used as model run ID
    };
  } catch (error: any) {
    logger.error(`Auto-model: ❌ Failed to trigger for org ${orgId}: ${error.message}`, error);
    return {
      success: false,
      reason: error.message || 'Unknown error',
    };
  }
}

/**
 * Check all orgs and trigger auto-models if needed (for scheduled job)
 */
export async function runScheduledAutoModels(): Promise<{
  checked: number;
  triggered: number;
  skipped: number;
  errors: number;
}> {
  const stats = {
    checked: 0,
    triggered: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    logger.info('Auto-model: Running scheduled check for all orgs...');

    // Get all orgs
    const orgs = await prisma.org.findMany({
      select: { id: true },
    });

    stats.checked = orgs.length;

    for (const org of orgs) {
      try {
        // Check if org has new data since last model run
        const lastModelRun = await prisma.modelRun.findFirst({
          where: {
            orgId: org.id,
            runType: 'baseline',
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });

        const lastTransaction = await prisma.rawTransaction.findFirst({
          where: { orgId: org.id },
          orderBy: { importedAt: 'desc' },
          select: { importedAt: true },
        });

        // If no model run exists, or transactions are newer than last model run
        const shouldTrigger =
          !lastModelRun ||
          (lastTransaction &&
            lastTransaction.importedAt &&
            (!lastModelRun.createdAt || lastTransaction.importedAt > lastModelRun.createdAt));

        if (shouldTrigger) {
          const result = await triggerAutoModel({
            orgId: org.id,
            triggerType: 'scheduled',
          });

          if (result.success) {
            stats.triggered++;
          } else {
            stats.skipped++;
          }
        } else {
          stats.skipped++;
          logger.debug(`Auto-model: Org ${org.id} has no new data since last model run`);
        }
      } catch (error: any) {
        stats.errors++;
        logger.error(`Auto-model: Error processing org ${org.id}: ${error.message}`);
      }
    }

    logger.info(
      `Auto-model: Scheduled check complete - Checked: ${stats.checked}, Triggered: ${stats.triggered}, Skipped: ${stats.skipped}, Errors: ${stats.errors}`
    );

    return stats;
  } catch (error: any) {
    logger.error(`Auto-model: Scheduled check failed: ${error.message}`, error);
    return stats;
  }
}

export const autoModelService = {
  triggerAutoModel,
  runScheduledAutoModels,
  shouldRunAutoModel,
  getPrimaryModel,
};

