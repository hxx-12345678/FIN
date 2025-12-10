/**
 * Pricing Plan Service
 * Manages pricing plans, upgrades, and downgrades
 * 
 * Architecture:
 * - Configuration-driven pricing
 * - Versioned pricing plans
 * - Upgrade/downgrade validation
 */

import {
  getPricingConfig,
  getAllPlans,
  getPlanById,
  canUpgrade,
  canDowngrade,
  validatePricingConfig,
  PricingPlan,
} from '../config/pricing.config';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface PricingResponse {
  version: string;
  lastUpdated: string;
  plans: Array<{
    id: string;
    name: string;
    displayName: string;
    description: string;
    monthlyPrice: number;
    yearlyPrice?: number;
    allowedSimulations: number;
    exportLimit: number;
    alertLimit: number;
    supportLevel: string;
    features: string[];
    maxUsers?: number;
    maxOrganizations?: number;
  }>;
}

export interface UpgradePathResponse {
  fromPlan: string;
  toPlan: string;
  allowed: boolean;
  reason?: string;
}

export interface DowngradePathResponse {
  fromPlan: string;
  toPlan: string;
  allowed: boolean;
  reason?: string;
  restrictions?: string[];
}

export const pricingService = {
  /**
   * Get all pricing plans
   */
  getPlans: (): PricingResponse => {
    const config = getPricingConfig();
    const plans = getAllPlans();

    return {
      version: config.version,
      lastUpdated: config.lastUpdated,
      plans: plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        displayName: plan.displayName,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        allowedSimulations: plan.allowedSimulations,
        exportLimit: plan.exportLimit,
        alertLimit: plan.alertLimit,
        supportLevel: plan.supportLevel,
        features: plan.features,
        maxUsers: plan.maxUsers,
        maxOrganizations: plan.maxOrganizations,
      })),
    };
  },

  /**
   * Get plan by ID
   */
  getPlan: (planId: string): PricingPlan | null => {
    const plan = getPlanById(planId);
    if (!plan) {
      return null;
    }
    return plan;
  },

  /**
   * Check upgrade path
   */
  checkUpgradePath: (fromPlanId: string, toPlanId: string): UpgradePathResponse => {
    // Validate plans exist
    const fromPlan = getPlanById(fromPlanId);
    const toPlan = getPlanById(toPlanId);

    if (!fromPlan) {
      throw new ValidationError(`Invalid plan ID: ${fromPlanId}`);
    }

    if (!toPlan) {
      throw new ValidationError(`Invalid plan ID: ${toPlanId}`);
    }

    // Check if it's actually an upgrade
    if (toPlan.monthlyPrice <= fromPlan.monthlyPrice) {
      return {
        fromPlan: fromPlanId,
        toPlan: toPlanId,
        allowed: false,
        reason: 'Target plan is not an upgrade (price must be higher)',
      };
    }

    // Check upgrade path
    const allowed = canUpgrade(fromPlanId, toPlanId);

    return {
      fromPlan: fromPlanId,
      toPlan: toPlanId,
      allowed,
      reason: allowed ? undefined : 'Upgrade path not allowed for this plan combination',
    };
  },

  /**
   * Check downgrade path with restrictions
   */
  checkDowngradePath: (fromPlanId: string, toPlanId: string): DowngradePathResponse => {
    // Validate plans exist
    const fromPlan = getPlanById(fromPlanId);
    const toPlan = getPlanById(toPlanId);

    if (!fromPlan) {
      throw new ValidationError(`Invalid plan ID: ${fromPlanId}`);
    }

    if (!toPlan) {
      throw new ValidationError(`Invalid plan ID: ${toPlanId}`);
    }

    // Get downgrade restrictions
    const downgradeInfo = canDowngrade(fromPlanId, toPlanId);

    return {
      fromPlan: fromPlanId,
      toPlan: toPlanId,
      allowed: downgradeInfo.allowed,
      reason: downgradeInfo.reason,
      restrictions: downgradeInfo.restrictions,
    };
  },

  /**
   * Validate pricing configuration
   */
  validateConfig: (): { valid: boolean; errors: string[] } => {
    try {
      return validatePricingConfig();
    } catch (error: any) {
      logger.error(`Error validating pricing config: ${error.message}`);
      return {
        valid: false,
        errors: [`Configuration validation failed: ${error.message}`],
      };
    }
  },
};


