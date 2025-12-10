import prisma from '../config/database';
import { ValidationError } from '../utils/errors';

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date | null;
  message?: string;
}

export const quotaService = {
  /**
   * Get or create quota for an org
   */
  async getOrCreateOrgQuota(orgId: string) {
    try {
      let quota = await prisma.orgQuota.findUnique({
        where: { orgId },
      });

      if (!quota) {
        // Get org plan tier to set appropriate limits
        const org = await prisma.org.findUnique({
          where: { id: orgId },
          select: { planTier: true },
        });

        const planTier = org?.planTier || 'free';

        // Set limits based on plan tier
        const limits = this.getLimitsByPlan(planTier);

        quota = await prisma.orgQuota.create({
          data: {
            orgId,
            monteCarloSimsLimit: limits.monteCarlo,
            exportsLimit: limits.exports,
            alertsLimit: limits.alerts,
            monteCarloResetAt: this.getNextResetDate(),
            exportsResetAt: this.getNextResetDate(),
          },
        });
      }

      return quota;
    } catch (error: any) {
      // If table doesn't exist or there's a Prisma error, return default quota
      console.warn('Error accessing orgQuota table, using defaults:', error.message);
      const limits = this.getLimitsByPlan('free');
      return {
        id: 'default',
        orgId,
        monteCarloSimsLimit: limits.monteCarlo,
        monteCarloSimsUsed: 0,
        monteCarloResetAt: this.getNextResetDate(),
        exportsLimit: limits.exports,
        exportsUsed: 0,
        exportsResetAt: this.getNextResetDate(),
        alertsLimit: limits.alerts,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  },

  /**
   * Get quota limits by plan tier
   */
  getLimitsByPlan(planTier: string) {
    const plans: Record<string, { monteCarlo: number; exports: number; alerts: number }> = {
      free: { monteCarlo: 5000, exports: 20, alerts: 10 },
      pro: { monteCarlo: 10000, exports: 100, alerts: 20 },
      enterprise: { monteCarlo: 100000, exports: 1000, alerts: 50 },
    };

    return plans[planTier] || plans.free;
  },

  /**
   * Get next quota reset date (first day of next month)
   */
  getNextResetDate(): Date {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth;
  },

  /**
   * Check if org can run Monte Carlo simulation
   */
  async checkMonteCarloQuota(orgId: string, requestedSims: number): Promise<QuotaCheckResult> {
    const quota = await this.getOrCreateOrgQuota(orgId);

    // Check if quota needs reset
    if (quota.monteCarloResetAt && new Date() >= quota.monteCarloResetAt) {
      try {
        await prisma.orgQuota.update({
          where: { orgId },
          data: {
            monteCarloSimsUsed: 0,
            monteCarloResetAt: this.getNextResetDate(),
          },
        });
        quota.monteCarloSimsUsed = 0;
      } catch (error: any) {
        // If update fails, just reset in memory
        console.warn('Error resetting quota, using in-memory value:', error.message);
        quota.monteCarloSimsUsed = 0;
      }
    }

    const remaining = quota.monteCarloSimsLimit - quota.monteCarloSimsUsed;
    const allowed = remaining >= requestedSims;

    return {
      allowed,
      remaining,
      limit: quota.monteCarloSimsLimit,
      resetAt: quota.monteCarloResetAt,
      message: allowed
        ? undefined
        : `Quota exceeded. You have ${remaining} simulations remaining out of ${quota.monteCarloSimsLimit}. Upgrade your plan for more capacity.`,
    };
  },

  /**
   * Consume Monte Carlo quota
   */
  async consumeMonteCarloQuota(orgId: string, numSims: number): Promise<void> {
    try {
      await prisma.orgQuota.update({
        where: { orgId },
        data: {
          monteCarloSimsUsed: {
            increment: numSims,
          },
        },
      });
    } catch (error: any) {
      // If update fails (table doesn't exist), just log and continue
      console.warn('Error consuming quota, continuing without tracking:', error.message);
    }
  },

  /**
   * Check if org can create export
   */
  async checkExportQuota(orgId: string): Promise<QuotaCheckResult> {
    const quota = await this.getOrCreateOrgQuota(orgId);

    // Check if quota needs reset
    if (quota.exportsResetAt && new Date() >= quota.exportsResetAt) {
      try {
        await prisma.orgQuota.update({
          where: { orgId },
          data: {
            exportsUsed: 0,
            exportsResetAt: this.getNextResetDate(),
          },
        });
        quota.exportsUsed = 0;
      } catch (error: any) {
        console.warn('Error resetting export quota, using in-memory value:', error.message);
        quota.exportsUsed = 0;
      }
    }

    const remaining = quota.exportsLimit - quota.exportsUsed;
    const allowed = remaining > 0;

    return {
      allowed,
      remaining,
      limit: quota.exportsLimit,
      resetAt: quota.exportsResetAt,
      message: allowed
        ? undefined
        : `Export quota exceeded. You have used all ${quota.exportsLimit} exports this month. Resets on ${quota.exportsResetAt?.toLocaleDateString()}.`,
    };
  },

  /**
   * Consume export quota
   */
  async consumeExportQuota(orgId: string): Promise<void> {
    try {
      await prisma.orgQuota.update({
        where: { orgId },
        data: {
          exportsUsed: {
            increment: 1,
          },
        },
      });
    } catch (error: any) {
      console.warn('Error consuming export quota, continuing without tracking:', error.message);
    }
  },

  /**
   * Check if org can create another alert
   */
  async checkAlertQuota(orgId: string): Promise<QuotaCheckResult> {
    const quota = await this.getOrCreateOrgQuota(orgId);
    
    // Count existing alerts
    const alertCount = await prisma.alertRule.count({
      where: { orgId },
    });

    const remaining = quota.alertsLimit - alertCount;
    const allowed = remaining > 0;

    return {
      allowed,
      remaining,
      limit: quota.alertsLimit,
      resetAt: null,
      message: allowed
        ? undefined
        : `Alert limit reached. You can have up to ${quota.alertsLimit} alerts. Delete existing alerts or upgrade your plan.`,
    };
  },

  /**
   * Get quota usage summary for org
   */
  async getQuotaUsage(orgId: string) {
    const quota = await this.getOrCreateOrgQuota(orgId);

    const alertCount = await prisma.alertRule.count({
      where: { orgId },
    });

    // Check if quotas need reset
    const now = new Date();
    let mcUsed = quota.monteCarloSimsUsed;
    let exportsUsed = quota.exportsUsed;

    if (quota.monteCarloResetAt && now >= quota.monteCarloResetAt) {
      mcUsed = 0;
    }

    if (quota.exportsResetAt && now >= quota.exportsResetAt) {
      exportsUsed = 0;
    }

    return {
      monteCarlo: {
        used: mcUsed,
        limit: quota.monteCarloSimsLimit,
        remaining: quota.monteCarloSimsLimit - mcUsed,
        resetAt: quota.monteCarloResetAt,
        percentage: (mcUsed / quota.monteCarloSimsLimit) * 100,
      },
      exports: {
        used: exportsUsed,
        limit: quota.exportsLimit,
        remaining: quota.exportsLimit - exportsUsed,
        resetAt: quota.exportsResetAt,
        percentage: (exportsUsed / quota.exportsLimit) * 100,
      },
      alerts: {
        used: alertCount,
        limit: quota.alertsLimit,
        remaining: quota.alertsLimit - alertCount,
        resetAt: null,
        percentage: (alertCount / quota.alertsLimit) * 100,
      },
    };
  },

  /**
   * Estimate cost for Monte Carlo job (in USD)
   */
  estimateMonteCarloCost(numSimulations: number, modelComplexity: number = 1): number {
    // Simple cost formula: $0.001 per 1000 simulations
    // Multiply by complexity factor for larger models
    const baseCost = (numSimulations / 1000) * 0.001;
    return baseCost * modelComplexity;
  },

  /**
   * Estimate CPU seconds for Monte Carlo job
   */
  estimateMonteCarloCPU(numSimulations: number, modelComplexity: number = 1): number {
    // Rough estimate: 0.1 seconds per 1000 simulations
    const baseTime = (numSimulations / 1000) * 0.1;
    return baseTime * modelComplexity;
  },
};


