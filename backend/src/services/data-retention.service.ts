/**
 * Data Retention Service
 * Implements automated data retention and deletion policies
 * Ensures compliance with GDPR, financial regulations, and data retention policies
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { auditService } from './audit.service';

export interface RetentionResult {
  auditLogsDeleted: number;
  jobsDeleted: number;
  transactionsDeleted: number;
  modelsDeleted: number;
  totalDeleted: number;
}

export const dataRetentionService = {
  /**
   * Enforce data retention policy for an organization
   */
  enforceRetention: async (
    orgId: string,
    retentionDays: number = 2555 // 7 years default for financial data
  ): Promise<RetentionResult> => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    logger.info(`Enforcing data retention for org ${orgId}, cutoff date: ${cutoffDate.toISOString()}`);

    // Delete old audit logs (keep 7 years for compliance)
    const auditCutoff = new Date();
    auditCutoff.setDate(auditCutoff.getDate() - 2555); // 7 years
    const deletedAuditLogs = await prisma.auditLog.deleteMany({
      where: {
        orgId,
        createdAt: { lt: auditCutoff },
      },
    });

    // Delete old completed/failed jobs (keep 90 days)
    const jobCutoff = new Date();
    jobCutoff.setDate(jobCutoff.getDate() - 90);
    const deletedJobs = await prisma.job.deleteMany({
      where: {
        orgId,
        createdAt: { lt: jobCutoff },
        status: { in: ['done', 'failed', 'cancelled'] },
      },
    });

    // Delete old transactions (keep 7 years for financial compliance)
    const transactionCutoff = new Date();
    transactionCutoff.setDate(transactionCutoff.getDate() - 2555); // 7 years
    const deletedTransactions = await prisma.rawTransaction.deleteMany({
      where: {
        orgId,
        date: { lt: transactionCutoff },
      },
    });

    // Delete old model runs (keep 2 years after model deletion or 7 years)
    const modelRunCutoff = new Date();
    modelRunCutoff.setDate(modelRunCutoff.getDate() - 730); // 2 years
    const deletedModelRuns = await prisma.modelRun.deleteMany({
      where: {
        orgId,
        createdAt: { lt: modelRunCutoff },
        status: { in: ['done', 'failed'] },
      },
    });

    const totalDeleted = deletedAuditLogs.count + deletedJobs.count + deletedTransactions.count + deletedModelRuns.count;

    logger.info(
      `Data retention completed for org ${orgId}: ` +
      `${deletedAuditLogs.count} audit logs, ${deletedJobs.count} jobs, ` +
      `${deletedTransactions.count} transactions, ${deletedModelRuns.count} model runs deleted`
    );

    // Log retention enforcement
    await auditService.log({
      actorUserId: 'system',
      orgId,
      action: 'data_retention_enforced',
      objectType: 'retention',
      objectId: orgId,
      metaJson: {
        retentionDays,
        cutoffDate: cutoffDate.toISOString(),
        deleted: {
          auditLogs: deletedAuditLogs.count,
          jobs: deletedJobs.count,
          transactions: deletedTransactions.count,
          modelRuns: deletedModelRuns.count,
          total: totalDeleted,
        },
      },
    });

    return {
      auditLogsDeleted: deletedAuditLogs.count,
      jobsDeleted: deletedJobs.count,
      transactionsDeleted: deletedTransactions.count,
      modelsDeleted: deletedModelRuns.count,
      totalDeleted,
    };
  },

  /**
   * Schedule retention enforcement for all organizations (run daily via cron)
   */
  scheduleRetention: async (): Promise<{ orgsProcessed: number; totalDeleted: number }> => {
    const orgs = await prisma.org.findMany({
      include: {
        settings: true,
      },
    });

    let totalDeleted = 0;
    let orgsProcessed = 0;

    for (const org of orgs) {
      try {
        // Get retention period from org settings or use default (7 years for financial data)
        const retentionDays = org.settings?.dataRetentionDays || 2555;

        const result = await dataRetentionService.enforceRetention(org.id, retentionDays);
        totalDeleted += result.totalDeleted;
        orgsProcessed++;

        logger.info(`Retention enforced for org ${org.id}: ${result.totalDeleted} records deleted`);
      } catch (error: any) {
        logger.error(`Error enforcing retention for org ${org.id}: ${error.message}`);
        // Continue with other orgs
      }
    }

    logger.info(`Data retention schedule completed: ${orgsProcessed} orgs processed, ${totalDeleted} total records deleted`);

    return {
      orgsProcessed,
      totalDeleted,
    };
  },

  /**
   * Get retention statistics for an organization
   */
  getRetentionStats: async (orgId: string) => {
    const now = new Date();
    const sevenYearsAgo = new Date();
    sevenYearsAgo.setDate(sevenYearsAgo.getDate() - 2555);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [auditLogsCount, jobsCount, transactionsCount, modelRunsCount] = await Promise.all([
      prisma.auditLog.count({
        where: {
          orgId,
          createdAt: { lt: sevenYearsAgo },
        },
      }),
      prisma.job.count({
        where: {
          orgId,
          createdAt: { lt: ninetyDaysAgo },
          status: { in: ['done', 'failed', 'cancelled'] },
        },
      }),
      prisma.rawTransaction.count({
        where: {
          orgId,
          date: { lt: sevenYearsAgo },
        },
      }),
      prisma.modelRun.count({
        where: {
          orgId,
          createdAt: { lt: new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000) }, // 2 years
          status: { in: ['done', 'failed'] },
        },
      }),
    ]);

    return {
      eligibleForDeletion: {
        auditLogs: auditLogsCount,
        jobs: jobsCount,
        transactions: transactionsCount,
        modelRuns: modelRunsCount,
        total: auditLogsCount + jobsCount + transactionsCount + modelRunsCount,
      },
      retentionPolicies: {
        auditLogs: '7 years',
        jobs: '90 days',
        transactions: '7 years',
        modelRuns: '2 years',
      },
    };
  },
};


