/**
 * FINANCIAL MODEL SERVICE
 * Complete model creation, validation, and management service
 * Supports: AI-Generated, Manual, and Data-Driven model creation
 */

import prisma from '../config/database';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import { jobService } from './job.service';
import { auditService } from './audit.service';
import { logger } from '../utils/logger';

export type BusinessType = 'saas' | 'ecommerce' | 'services' | 'mixed';
export type RevenueModelType = 'subscription' | 'transactional' | 'services' | 'hybrid';
export type DataSourceType = 'connectors' | 'csv' | 'blank';
export type ForecastDuration = 12 | 24 | 36;

export interface CreateModelRequest {
  // REQUIRED FIELDS
  model_name: string;
  industry: string;
  revenue_model_type: RevenueModelType;
  forecast_duration: ForecastDuration;
  start_month?: string; // YYYY-MM format, default = current month
  data_source_type: DataSourceType;

  // OPTIONAL FIELDS
  base_currency?: string;
  country?: string;
  tax_region?: string;
  description?: string;

  // AI-GENERATED MODEL FIELDS (optional)
  business_type?: BusinessType;
  starting_customers?: number;
  starting_revenue?: number;
  starting_mrr?: number;
  starting_aov?: number;
  major_costs?: {
    payroll?: number;
    infrastructure?: number;
    marketing?: number;
  };
  cash_on_hand?: number;

  // MANUAL MODEL FIELDS (optional)
  assumptions?: Record<string, any>;
}

export interface ModelMetadata {
  id: string;
  name: string;
  industry: string;
  revenueModelType: RevenueModelType;
  forecastDuration: ForecastDuration;
  startMonth: string;
  dataSourceType: DataSourceType;
  baseCurrency: string;
  country?: string;
  taxRegion?: string;
  description?: string;
  createdAt: Date;
}

export interface AssumptionStructure {
  revenue: {
    baselineRevenue?: number;
    revenueGrowth?: number;
    churnRate?: number;
    customerCount?: number;
    mrr?: number;
    arr?: number;
  };
  costs: {
    baselineExpenses?: number;
    expenseGrowth?: number;
    payroll?: number;
    infrastructure?: number;
    marketing?: number;
    cogs?: number;
  };
  cash: {
    initialCash?: number;
    targetRunway?: number;
  };
  unitEconomics: {
    cac?: number;
    ltv?: number;
    paybackPeriod?: number;
  };
  [key: string]: any;
}

export const financialModelService = {
  /**
   * Create a new financial model with validation
   */
  createModel: async (
    userId: string,
    orgId: string,
    request: CreateModelRequest
  ): Promise<{ model: any; jobId?: string }> => {
    // Validate required fields
    if (!request.model_name || typeof request.model_name !== 'string' || request.model_name.trim().length === 0) {
      throw new ValidationError('model_name is required and must be a non-empty string');
    }

    if (!request.industry || typeof request.industry !== 'string') {
      throw new ValidationError('industry is required');
    }

    const validRevenueModels: RevenueModelType[] = ['subscription', 'transactional', 'services', 'hybrid'];
    if (!validRevenueModels.includes(request.revenue_model_type)) {
      throw new ValidationError(`revenue_model_type must be one of: ${validRevenueModels.join(', ')}`);
    }

    const validDurations: ForecastDuration[] = [12, 24, 36];
    if (!validDurations.includes(request.forecast_duration)) {
      throw new ValidationError(`forecast_duration must be one of: ${validDurations.join(', ')}`);
    }

    const validDataSources: DataSourceType[] = ['connectors', 'csv', 'blank'];
    if (!validDataSources.includes(request.data_source_type)) {
      throw new ValidationError(`data_source_type must be one of: ${validDataSources.join(', ')}`);
    }

    // Verify user access
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!role || !['admin', 'finance'].includes(role.role)) {
      throw new ForbiddenError('Only admins and finance users can create models');
    }

    // Determine start month (default to current month)
    const now = new Date();
    const startMonth = request.start_month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Validate start month format
    if (!/^\d{4}-\d{2}$/.test(startMonth)) {
      throw new ValidationError('start_month must be in YYYY-MM format');
    }

    // Build modelJson structure
    const modelJson: any = {
      metadata: {
        industry: request.industry,
        revenueModelType: request.revenue_model_type,
        forecastDuration: request.forecast_duration,
        startMonth,
        dataSourceType: request.data_source_type,
        baseCurrency: request.base_currency || 'USD',
        country: request.country,
        taxRegion: request.tax_region,
        description: request.description,
        createdAt: new Date().toISOString(),
      },
      assumptions: {},
      projections: {},
      sensitivity: {},
    };

    // Create model record
    const model = await prisma.model.create({
      data: {
        orgId,
        name: request.model_name.trim(),
        modelJson,
        createdById: userId,
      },
    });

    // Log audit event
    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'model_created',
      objectType: 'model',
      objectId: model.id,
      metaJson: {
        modelName: request.model_name,
        industry: request.industry,
        revenueModelType: request.revenue_model_type,
        dataSourceType: request.data_source_type,
      },
    });

    // Queue auto-model job to ingest data and generate assumptions
    let jobId: string | undefined;
    if (request.data_source_type !== 'blank') {
      const job = await jobService.createJob({
        jobType: 'auto_model_trigger',
        orgId,
        objectId: model.id,
        createdByUserId: userId,
        params: {
          modelId: model.id,
          triggerType: 'model_creation',
          dataSourceType: request.data_source_type,
          // Include AI fields if provided
          businessType: request.business_type,
          startingCustomers: request.starting_customers,
          startingRevenue: request.starting_revenue,
          startingMrr: request.starting_mrr,
          startingAov: request.starting_aov,
          majorCosts: request.major_costs,
          cashOnHand: request.cash_on_hand,
          // Include manual assumptions if provided
          assumptions: request.assumptions,
        },
      });
      jobId = job.id;
    }

    return { model, jobId };
  },

  /**
   * Generate assumptions from transaction data
   */
  generateAssumptionsFromData: async (
    orgId: string,
    modelId: string,
    dataSourceType: DataSourceType
  ): Promise<AssumptionStructure> => {
    const assumptions: AssumptionStructure = {
      revenue: {},
      costs: {},
      cash: {},
      unitEconomics: {},
    };

    if (dataSourceType === 'blank') {
      // Return default assumptions
      return {
        revenue: {
          baselineRevenue: 0,
          revenueGrowth: 0.08,
          churnRate: 0.05,
          customerCount: 0,
        },
        costs: {
          baselineExpenses: 0,
          expenseGrowth: 0.05,
          payroll: 0,
          infrastructure: 0,
          marketing: 0,
        },
        cash: {
          initialCash: 500000,
        },
        unitEconomics: {
          cac: 125,
          ltv: 2400,
        },
      };
    }

    // Fetch transactions from raw_transactions
    const transactions = await prisma.$queryRaw`
      SELECT 
        date,
        amount,
        category,
        description
      FROM raw_transactions
      WHERE "orgId" = ${orgId}
      ORDER BY date ASC
    ` as Array<{ date: Date; amount: number; category: string | null; description: string | null }>;

    if (transactions.length === 0) {
      logger.warn(`No transactions found for org ${orgId}, using defaults`);
      return financialModelService.generateAssumptionsFromData(orgId, modelId, 'blank');
    }

    // Calculate revenue and expenses
    let totalRevenue = 0;
    let totalExpenses = 0;
    const monthlyRevenue: Record<string, number> = {};
    const monthlyExpenses: Record<string, number> = {};

    for (const tx of transactions) {
      const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
      const amount = Number(tx.amount);

      if (amount > 0) {
        totalRevenue += amount;
        monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + amount;
      } else {
        totalExpenses += Math.abs(amount);
        monthlyExpenses[monthKey] = (monthlyExpenses[monthKey] || 0) + Math.abs(amount);
      }
    }

    // Calculate growth rates
    const revenueMonths = Object.keys(monthlyRevenue).sort();
    const expenseMonths = Object.keys(monthlyExpenses).sort();

    let revenueGrowth = 0.08; // Default 8%
    if (revenueMonths.length >= 2) {
      const firstMonth = monthlyRevenue[revenueMonths[0]];
      const lastMonth = monthlyRevenue[revenueMonths[revenueMonths.length - 1]];
      if (firstMonth > 0) {
        revenueGrowth = Math.pow(lastMonth / firstMonth, 1 / (revenueMonths.length - 1)) - 1;
      }
    }

    let expenseGrowth = 0.05; // Default 5%
    if (expenseMonths.length >= 2) {
      const firstMonth = monthlyExpenses[expenseMonths[0]];
      const lastMonth = monthlyExpenses[expenseMonths[expenseMonths.length - 1]];
      if (firstMonth > 0) {
        expenseGrowth = Math.pow(lastMonth / firstMonth, 1 / (expenseMonths.length - 1)) - 1;
      }
    }

    // Calculate average monthly values
    const avgMonthlyRevenue = revenueMonths.length > 0
      ? totalRevenue / revenueMonths.length
      : 0;
    const avgMonthlyExpenses = expenseMonths.length > 0
      ? totalExpenses / expenseMonths.length
      : 0;

    // Build assumptions
    assumptions.revenue = {
      baselineRevenue: avgMonthlyRevenue,
      revenueGrowth: Math.max(0, Math.min(1, revenueGrowth)), // Clamp between 0 and 100%
      churnRate: 0.05, // Default, can be calculated from customer data if available
      customerCount: 0, // Would need customer data
      mrr: avgMonthlyRevenue,
      arr: avgMonthlyRevenue * 12,
    };

    assumptions.costs = {
      baselineExpenses: avgMonthlyExpenses,
      expenseGrowth: Math.max(0, Math.min(1, expenseGrowth)), // Clamp between 0 and 100%
      payroll: 0, // Would need categorization
      infrastructure: 0,
      marketing: 0,
      cogs: avgMonthlyExpenses * 0.3, // Estimate 30% COGS
    };

    assumptions.cash = {
      initialCash: 500000, // Default, should be provided by user
    };

    assumptions.unitEconomics = {
      cac: 125, // Default
      ltv: 2400, // Default
      paybackPeriod: 125 / (avgMonthlyRevenue / 100) || 0, // Estimate if customer count available
    };

    return assumptions;
  },

  /**
   * Generate AI-based assumptions from user answers
   */
  generateAIAssumptions: async (
    orgId: string,
    businessType: BusinessType,
    revenueModelType: RevenueModelType,
    answers: Record<string, any>
  ): Promise<AssumptionStructure> => {
    // This would call LLM service in production
    // For now, use deterministic logic based on inputs

    const assumptions: AssumptionStructure = {
      revenue: {},
      costs: {},
      cash: {},
      unitEconomics: {},
    };

    // Extract answers
    const startingCustomers = answers.starting_customers || 0;
    const startingRevenue = answers.starting_revenue || 0;
    const startingMrr = answers.starting_mrr || 0;
    const startingAov = answers.starting_aov || 0;
    const majorCosts = answers.major_costs || {};
    const cashOnHand = answers.cash_on_hand || 500000;

    // Calculate baseline revenue
    let baselineRevenue = 0;
    if (revenueModelType === 'subscription') {
      baselineRevenue = startingMrr || (startingRevenue / 12) || 0;
    } else if (revenueModelType === 'transactional') {
      baselineRevenue = (startingAov * startingCustomers) || startingRevenue || 0;
    } else {
      baselineRevenue = startingRevenue || 0;
    }

    // Calculate baseline expenses
    const baselineExpenses = (majorCosts.payroll || 0) +
      (majorCosts.infrastructure || 0) +
      (majorCosts.marketing || 0);

    // Build assumptions
    assumptions.revenue = {
      baselineRevenue,
      revenueGrowth: 0.08, // Default 8% monthly growth for SaaS
      churnRate: 0.05, // Default 5% monthly churn
      customerCount: startingCustomers,
      mrr: baselineRevenue,
      arr: baselineRevenue * 12,
    };

    assumptions.costs = {
      baselineExpenses,
      expenseGrowth: 0.05, // Default 5% monthly growth
      payroll: majorCosts.payroll || 0,
      infrastructure: majorCosts.infrastructure || 0,
      marketing: majorCosts.marketing || 0,
      cogs: baselineRevenue * 0.2, // Estimate 20% COGS
    };

    assumptions.cash = {
      initialCash: cashOnHand,
    };

    assumptions.unitEconomics = {
      cac: majorCosts.marketing ? (majorCosts.marketing / startingCustomers) || 125 : 125,
      ltv: baselineRevenue ? (baselineRevenue * 12 / 0.05) || 2400 : 2400, // LTV = MRR * 12 / churn
      paybackPeriod: 0, // Calculate from CAC and MRR
    };

    return assumptions;
  },
};



