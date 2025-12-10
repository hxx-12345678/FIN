/**
 * Pricing Plan Configuration
 * Versioned pricing plans with upgrade/downgrade rules
 * 
 * Loads from config/pricing.json for versioning and easy updates
 */

import * as fs from 'fs';
import * as path from 'path';

export interface PricingPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  monthlyPrice: number; // in USD
  yearlyPrice?: number; // in USD (optional)
  allowedSimulations: number; // Monte Carlo simulations per month
  exportLimit: number; // Exports per month
  alertLimit: number; // Alerts allowed
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated';
  features: string[];
  maxUsers?: number; // undefined = unlimited
  maxOrganizations?: number; // undefined = unlimited
  version: string; // Pricing version (for tracking changes)
}

export interface PricingConfig {
  version: string;
  lastUpdated: string;
  plans: PricingPlan[];
  upgradePaths: Record<string, string[]>; // planId -> allowed upgrade planIds
  downgradeRestrictions: Record<string, {
    allowed: boolean;
    reason?: string;
    restrictions?: string[];
  }>;
}

/**
 * Load pricing configuration from JSON file
 */
const loadPricingConfig = (): PricingConfig => {
  try {
    const configPath = path.join(__dirname, 'pricing.json');
    const configData = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(configData) as PricingConfig;
  } catch (error) {
    // Fallback to default config if file doesn't exist
    console.warn('Failed to load pricing.json, using default config:', error);
    return defaultPricingConfig;
  }
};

/**
 * Default pricing configuration (fallback)
 */
const defaultPricingConfig: PricingConfig = {
  version: '1.0.0',
  lastUpdated: '2024-12-10',
  plans: [
    {
      id: 'free',
      name: 'free',
      displayName: 'Free',
      description: 'Perfect for getting started',
      monthlyPrice: 0,
      allowedSimulations: 5000,
      exportLimit: 20,
      alertLimit: 10,
      supportLevel: 'community',
      features: [
        'Basic financial modeling',
        'Monte Carlo simulations (5K/month)',
        'Basic reports',
        'Community support',
        'Single organization',
        'Up to 3 users',
      ],
      maxUsers: 3,
      maxOrganizations: 1,
      version: '1.0.0',
    },
    {
      id: 'pro',
      name: 'pro',
      displayName: 'Professional',
      description: 'For growing businesses',
      monthlyPrice: 99,
      yearlyPrice: 990, // 2 months free
      allowedSimulations: 50000,
      exportLimit: 100,
      alertLimit: 50,
      supportLevel: 'email',
      features: [
        'Everything in Free',
        'Advanced Monte Carlo (50K/month)',
        'Unlimited exports',
        'Email support',
        'Multiple organizations',
        'Up to 10 users',
        'Priority processing',
        'Custom integrations',
      ],
      maxUsers: 10,
      maxOrganizations: 5,
      version: '1.0.0',
    },
    {
      id: 'enterprise',
      name: 'enterprise',
      displayName: 'Enterprise',
      description: 'For teams that need it all',
      monthlyPrice: 499,
      yearlyPrice: 4990, // 2 months free
      allowedSimulations: 500000,
      exportLimit: 1000,
      alertLimit: 200,
      supportLevel: 'dedicated',
      features: [
        'Everything in Professional',
        'Unlimited Monte Carlo simulations',
        'Dedicated support',
        'Unlimited users',
        'Unlimited organizations',
        'SSO integration',
        'Advanced security',
        'Custom SLA',
        'On-premise deployment option',
      ],
      version: '1.0.0',
    },
  ],
  upgradePaths: {
    free: ['pro', 'enterprise'],
    pro: ['enterprise'],
    enterprise: [], // No upgrades from enterprise
  },
  downgradeRestrictions: {
    free: {
      allowed: false,
      reason: 'Cannot downgrade from free tier',
    },
    pro: {
      allowed: true,
      restrictions: [
        'Data retention: 30 days grace period',
        'Export access: Read-only for 30 days',
        'Team access: Reduced to free tier limits',
      ],
    },
    enterprise: {
      allowed: true,
      restrictions: [
        'Data retention: 90 days grace period',
        'Export access: Read-only for 90 days',
        'Team access: Reduced to pro tier limits',
        'SSO: Disabled after downgrade',
        'Custom integrations: May be lost',
      ],
    },
  },
};

// Cache pricing config to avoid repeated file reads
let cachedPricingConfig: PricingConfig | null = null;

/**
 * Get pricing configuration
 * Loads from JSON file for versioning
 */
export const getPricingConfig = (): PricingConfig => {
  if (!cachedPricingConfig) {
    cachedPricingConfig = loadPricingConfig();
  }
  return cachedPricingConfig;
};

/**
 * Get plan by ID
 */
export const getPlanById = (planId: string): PricingPlan | undefined => {
  return getPricingConfig().plans.find(plan => plan.id === planId || plan.name === planId);
};

/**
 * Get all plans
 */
export const getAllPlans = (): PricingPlan[] => {
  return getPricingConfig().plans;
};

/**
 * Check if upgrade path is allowed
 */
export const canUpgrade = (fromPlanId: string, toPlanId: string): boolean => {
  const config = getPricingConfig();
  const upgradePaths = config.upgradePaths[fromPlanId];
  if (!upgradePaths) return false;
  return upgradePaths.includes(toPlanId);
};

/**
 * Check if downgrade is allowed
 */
export const canDowngrade = (fromPlanId: string, toPlanId: string): {
  allowed: boolean;
  reason?: string;
  restrictions?: string[];
} => {
  const config = getPricingConfig();
  const restriction = config.downgradeRestrictions[fromPlanId];
  if (!restriction) {
    return {
      allowed: false,
      reason: 'Downgrade not configured for this plan',
    };
  }

  // Check if target plan is actually a downgrade
  const fromPlan = getPlanById(fromPlanId);
  const toPlan = getPlanById(toPlanId);

  if (!fromPlan || !toPlan) {
    return {
      allowed: false,
      reason: 'Invalid plan IDs',
    };
  }

  // Compare prices to determine if it's a downgrade
  const isDowngrade = toPlan.monthlyPrice < fromPlan.monthlyPrice;

  if (!isDowngrade) {
    return {
      allowed: false,
      reason: 'Target plan is not a downgrade',
    };
  }

  return restriction;
};

/**
 * Validate pricing config
 */
export const validatePricingConfig = (): { valid: boolean; errors: string[] } => {
  const config = getPricingConfig();
  const errors: string[] = [];

  if (!config.version) {
    errors.push('Pricing config version is required');
  }

  if (!config.plans || config.plans.length === 0) {
    errors.push('At least one pricing plan is required');
  }

  // Validate each plan
  config.plans.forEach((plan, index) => {
    if (!plan.id) errors.push(`Plan ${index}: id is required`);
    if (!plan.name) errors.push(`Plan ${index}: name is required`);
    if (plan.monthlyPrice < 0) errors.push(`Plan ${index}: monthlyPrice must be >= 0`);
    if (plan.allowedSimulations < 0) errors.push(`Plan ${index}: allowedSimulations must be >= 0`);
    if (plan.exportLimit < 0) errors.push(`Plan ${index}: exportLimit must be >= 0`);
    if (plan.alertLimit < 0) errors.push(`Plan ${index}: alertLimit must be >= 0`);
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};

