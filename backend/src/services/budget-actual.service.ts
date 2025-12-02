/**
 * BUDGET VS ACTUAL SERVICE
 * Calculates budget vs actual variance from:
 * - Budget: Model runs (baseline scenarios)
 * - Actual: Raw transactions aggregated by period
 */

import prisma from '../config/database';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors';
import { validateUUID } from '../utils/validation';
import { budgetService } from './budget.service';
import { logger } from '../utils/logger';

export interface BudgetActualPeriod {
  period: string; // YYYY-MM format
  budgetRevenue: number;
  actualRevenue: number;
  budgetExpenses: number;
  actualExpenses: number;
  variance: number;
  variancePercent: number;
}

export interface BudgetActualCategory {
  category: string;
  budget: number;
  actual: number;
  variance: number;
  variancePercent: number;
  status: 'good' | 'warning' | 'over' | 'under';
}

export interface BudgetActualSummary {
  budgetAccuracy: number;
  revenueVariance: number;
  revenueVariancePercent: number;
  expenseVariance: number;
  expenseVariancePercent: number;
  netVariance: number;
  netVariancePercent: number;
}

export interface BudgetActualData {
  summary: BudgetActualSummary;
  periods: BudgetActualPeriod[];
  categories: BudgetActualCategory[];
  alerts: Array<{
    type: 'error' | 'warning' | 'info';
    title: string;
    description: string;
    impact: 'High' | 'Medium' | 'Low';
    recommendation: string;
  }>;
}

/**
 * Get budget values from user-defined budgets or model runs (fallback)
 */
async function getBudgetFromUserOrModel(
  orgId: string,
  modelId: string,
  startDate: Date,
  endDate: Date
): Promise<{ revenue: Map<string, number>; expenses: Map<string, number> }> {
  // First, try to get user-defined budgets
  const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
  const endMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;

  try {
    const userBudgets = await budgetService.getBudgetsGrouped(orgId, startMonth, endMonth);
    
    // If user budgets exist, use them
    if (userBudgets.size > 0) {
      const revenue = new Map<string, number>();
      const expenses = new Map<string, number>();

      // Categorize budgets into revenue and expenses
      // Revenue categories typically: Revenue, Sales, Income, etc.
      // Expense categories: everything else
      const revenueKeywords = ['revenue', 'sales', 'income', 'earning'];
      
      for (const [category, monthMap] of userBudgets.entries()) {
        const categoryLower = category.toLowerCase();
        const isRevenue = revenueKeywords.some(keyword => categoryLower.includes(keyword));
        
        for (const [month, amount] of monthMap.entries()) {
          if (isRevenue) {
            revenue.set(month, (revenue.get(month) || 0) + amount);
          } else {
            expenses.set(month, (expenses.get(month) || 0) + amount);
          }
        }
      }

      // If we have any budgets, return them (even if partial)
      if (revenue.size > 0 || expenses.size > 0) {
        return { revenue, expenses };
      }
    }
  } catch (error) {
    // If budget service fails, fall back to model
    // This ensures backward compatibility
  }

  // Fallback to model-based budgets
  return getBudgetFromModel(orgId, modelId, startDate, endDate);
}

/**
 * Get budget values from model runs (fallback)
 */
async function getBudgetFromModel(
  orgId: string,
  modelId: string,
  startDate: Date,
  endDate: Date
): Promise<{ revenue: Map<string, number>; expenses: Map<string, number> }> {
  // Get baseline model run
  const baselineRun = await prisma.modelRun.findFirst({
    where: {
      orgId,
      modelId,
      runType: 'baseline',
      status: 'done',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!baselineRun || !baselineRun.summaryJson) {
    return { revenue: new Map(), expenses: new Map() };
  }

  const summary = baselineRun.summaryJson as any;
  const revenue = new Map<string, number>();
  const expenses = new Map<string, number>();

  // Extract monthly values from summaryJson
  // Format: { "2025-01": { revenue: 50000, expenses: 40000 }, ... }
  // Or: { monthly: { "2025-01": { revenue: 50000, expenses: 40000 } } }
  if (summary.monthly) {
    for (const [period, values] of Object.entries(summary.monthly)) {
      if (typeof values === 'object' && values !== null) {
        const v = values as any;
        if (v.revenue !== undefined) revenue.set(period, Number(v.revenue) || 0);
        if (v.expenses !== undefined) expenses.set(period, Number(v.expenses) || 0);
      }
    }
  }
  
  // Also check for direct period keys in summary
  for (const [key, value] of Object.entries(summary)) {
    if (key.match(/^\d{4}-\d{2}$/)) { // YYYY-MM format
      const v = value as any;
      if (typeof v === 'object' && v !== null) {
        if (v.revenue !== undefined) revenue.set(key, Number(v.revenue) || 0);
        if (v.expenses !== undefined) expenses.set(key, Number(v.expenses) || 0);
      }
    }
  }

  // Fallback: Extract from modelJson if monthly not available
  if (revenue.size === 0 || expenses.size === 0) {
    const model = await prisma.model.findUnique({
      where: { id: modelId },
    });

    if (model && model.modelJson) {
      const modelJson = model.modelJson as any;
      const monthKeys = modelJson.monthKeys || [];
      
      // Calculate from model formulas if available
      for (const monthKey of monthKeys) {
        const period = monthKey.substring(0, 7); // YYYY-MM
        if (modelJson.revenue?.baseline) {
          revenue.set(period, Number(modelJson.revenue.baseline) || 0);
        }
        if (modelJson.expenses?.baseline) {
          expenses.set(period, Number(modelJson.expenses.baseline) || 0);
        }
      }
    }
  }

  return { revenue, expenses };
}

/**
 * Get actual values from raw transactions
 */
async function getActualFromTransactions(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<{ revenue: Map<string, number>; expenses: Map<string, number> }> {
  const transactions = await prisma.rawTransaction.findMany({
    where: {
      orgId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      date: true,
      amount: true,
      category: true,
    },
  });

  const revenue = new Map<string, number>();
  const expenses = new Map<string, number>();

  for (const tx of transactions) {
    const month = String(tx.date.getMonth() + 1).padStart(2, '0');
    const period = `${tx.date.getFullYear()}-${month}`;
    const amount = Number(tx.amount);

    // Categorize: positive = revenue, negative = expense
    if (amount > 0) {
      revenue.set(period, (revenue.get(period) || 0) + amount);
    } else {
      expenses.set(period, (expenses.get(period) || 0) + Math.abs(amount));
    }
  }

  return { revenue, expenses };
}

/**
 * Calculate variance and alerts
 */
function calculateVariance(
  budget: number,
  actual: number
): { variance: number; variancePercent: number; status: 'good' | 'warning' | 'over' | 'under' } {
  const variance = actual - budget;
  const variancePercent = budget !== 0 ? (variance / budget) * 100 : 0;

  let status: 'good' | 'warning' | 'over' | 'under' = 'good';
  if (Math.abs(variancePercent) > 20) {
    status = variancePercent > 0 ? 'over' : 'under';
  } else if (Math.abs(variancePercent) > 10) {
    status = 'warning';
  }

  return { variance, variancePercent, status };
}

/**
 * Generate alerts based on variances
 */
function generateAlerts(
  summary: BudgetActualSummary,
  categories: BudgetActualCategory[]
): Array<{
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  recommendation: string;
}> {
  const alerts: Array<{
    type: 'error' | 'warning' | 'info';
    title: string;
    description: string;
    impact: 'High' | 'Medium' | 'Low';
    recommendation: string;
  }> = [];

  // Revenue variance alert
  if (summary.revenueVariancePercent < -10) {
    alerts.push({
      type: 'error',
      title: 'Revenue Shortfall',
      description: `Revenue is tracking ${Math.abs(summary.revenueVariancePercent).toFixed(1)}% below budget`,
      impact: 'High',
      recommendation: 'Implement revenue acceleration strategies',
    });
  }

  // Expense over budget alert
  if (summary.expenseVariancePercent > 10) {
    alerts.push({
      type: 'warning',
      title: 'Expenses Over Budget',
      description: `Expenses are ${summary.expenseVariancePercent.toFixed(1)}% over budget`,
      impact: 'Medium',
      recommendation: 'Review expense allocation and identify cost optimization opportunities',
    });
  }

  // Category-specific alerts
  for (const category of categories) {
    if (category.status === 'over' && category.variancePercent > 15) {
      alerts.push({
        type: 'warning',
        title: `${category.category} Budget Exceeded`,
        description: `${category.category} spend is ${category.variancePercent.toFixed(1)}% over budget`,
        impact: 'Medium',
        recommendation: `Review ${category.category.toLowerCase()} spend allocation and ROI metrics`,
      });
    } else if (category.status === 'under' && category.variancePercent < -30) {
      alerts.push({
        type: 'info',
        title: `${category.category} Under Budget`,
        description: `${category.category} spending is significantly under budget`,
        impact: 'Low',
        recommendation: 'Consider accelerating planned initiatives',
      });
    }
  }

  return alerts;
}

/**
 * Get actual values from transactions grouped by category
 */
async function getActualByCategory(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<{ revenue: Map<string, number>; expenses: Map<string, number> }> {
  const transactions = await prisma.rawTransaction.findMany({
    where: {
      orgId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      amount: true,
      category: true,
    },
  });

  const revenue = new Map<string, number>();
  const expenses = new Map<string, number>();

  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    const category = tx.category || 'Uncategorized';

    if (amount > 0) {
      // Revenue
      revenue.set(category, (revenue.get(category) || 0) + amount);
    } else if (amount < 0) {
      // Expenses (store as positive)
      expenses.set(category, (expenses.get(category) || 0) + Math.abs(amount));
    }
  }

  return { revenue, expenses };
}

/**
 * Get budget values grouped by category
 */
async function getBudgetByCategory(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<{ revenue: Map<string, number>; expenses: Map<string, number> }> {
  const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
  const endMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;

  let budgets: Array<{ category: string; amount: any }> = [];
  
  try {
    budgets = await prisma.budget.findMany({
      where: {
        orgId,
        month: {
          gte: startMonth,
          lte: endMonth,
        },
      },
      select: {
        category: true,
        amount: true,
      },
    });
  } catch (error: any) {
    // If Budget table doesn't exist or has schema issues, return empty
    // This allows the endpoint to work even without budgets
    logger.warn(`Could not fetch budgets: ${error.message}`);
    return { revenue: new Map(), expenses: new Map() };
  }

  const revenue = new Map<string, number>();
  const expenses = new Map<string, number>();

  // Revenue keywords
  const revenueKeywords = ['revenue', 'sales', 'income', 'earning', 'revenue', 'subscription'];

  for (const budget of budgets) {
    const amount = Number(budget.amount) || 0;
    const category = budget.category || 'Uncategorized';
    const categoryLower = category.toLowerCase();

    const isRevenue = revenueKeywords.some(keyword => categoryLower.includes(keyword));

    if (isRevenue) {
      revenue.set(category, (revenue.get(category) || 0) + amount);
    } else {
      expenses.set(category, (expenses.get(category) || 0) + amount);
    }
  }

  return { revenue, expenses };
}

export interface BudgetActualSimpleResponse {
  revenue: Array<{
    category: string;
    budget: number;
    actual: number;
    variance: number;
    variancePct: number;
  }>;
  expenses: Array<{
    category: string;
    budget: number;
    actual: number;
    variance: number;
    variancePct: number;
  }>;
  summary: {
    totalBudget: number;
    totalActual: number;
    totalVariance: number;
  };
}

export const budgetActualService = {
  /**
   * Get budget vs actual data (simple version without modelId)
   * Returns standardized response shape for frontend
   */
  getBudgetActualSimple: async (
    orgId: string,
    userId: string,
    period: 'current' | 'previous' | 'ytd' = 'current'
  ): Promise<BudgetActualSimpleResponse> => {
    // Validate UUIDs
    try {
      validateUUID(orgId, 'Organization ID');
      validateUUID(userId, 'User ID');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Invalid ID format');
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

    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Verify org exists (check before access check for proper 404)
    const org = await prisma.org.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), 0); // End of current month

    if (period === 'current') {
      startDate = new Date(now.getFullYear(), 0, 1); // Start of current year
      endDate = now;
    } else if (period === 'previous') {
      startDate = new Date(now.getFullYear() - 1, 0, 1);
      endDate = new Date(now.getFullYear() - 1, 11, 31);
    } else {
      // YTD
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = now;
    }

    // Get budget and actual values
    const [budgetData, actualData] = await Promise.all([
      getBudgetByCategory(orgId, startDate, endDate),
      getActualByCategory(orgId, startDate, endDate),
    ]);

    // Combine all categories
    const allCategories = new Set([
      ...budgetData.revenue.keys(),
      ...budgetData.expenses.keys(),
      ...actualData.revenue.keys(),
      ...actualData.expenses.keys(),
    ]);

    // Build revenue array
    const revenue: Array<{
      category: string;
      budget: number;
      actual: number;
      variance: number;
      variancePct: number;
    }> = [];

    for (const category of allCategories) {
      const budget = budgetData.revenue.get(category) || 0;
      const actual = actualData.revenue.get(category) || 0;
      const variance = actual - budget;
      const variancePct = budget !== 0 ? (variance / budget) * 100 : (actual !== 0 ? 100 : 0);

      // Only include if there's budget or actual data
      if (budget > 0 || actual > 0) {
        revenue.push({
          category,
          budget,
          actual,
          variance,
          variancePct: Number(variancePct.toFixed(2)),
        });
      }
    }

    // Build expenses array
    const expenses: Array<{
      category: string;
      budget: number;
      actual: number;
      variance: number;
      variancePct: number;
    }> = [];

    for (const category of allCategories) {
      const budget = budgetData.expenses.get(category) || 0;
      const actual = actualData.expenses.get(category) || 0;
      const variance = actual - budget;
      const variancePct = budget !== 0 ? (variance / budget) * 100 : (actual !== 0 ? 100 : 0);

      // Only include if there's budget or actual data
      if (budget > 0 || actual > 0) {
        expenses.push({
          category,
          budget,
          actual,
          variance,
          variancePct: Number(variancePct.toFixed(2)),
        });
      }
    }

    // Calculate summary
    const totalBudgetRevenue = Array.from(budgetData.revenue.values()).reduce((sum, amt) => sum + amt, 0);
    const totalActualRevenue = Array.from(actualData.revenue.values()).reduce((sum, amt) => sum + amt, 0);
    const totalBudgetExpenses = Array.from(budgetData.expenses.values()).reduce((sum, amt) => sum + amt, 0);
    const totalActualExpenses = Array.from(actualData.expenses.values()).reduce((sum, amt) => sum + amt, 0);

    const totalBudget = totalBudgetRevenue - totalBudgetExpenses;
    const totalActual = totalActualRevenue - totalActualExpenses;
    const totalVariance = totalActual - totalBudget;

    return {
      revenue: revenue.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)),
      expenses: expenses.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)),
      summary: {
        totalBudget: Number(totalBudget.toFixed(2)),
        totalActual: Number(totalActual.toFixed(2)),
        totalVariance: Number(totalVariance.toFixed(2)),
      },
    };
  },

  /**
   * Get budget vs actual data for a period (original method with modelId)
   */
  getBudgetActual: async (
    orgId: string,
    userId: string,
    modelId: string,
    period: 'current' | 'previous' | 'ytd' = 'current',
    view: 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ): Promise<BudgetActualData> => {
    // Validate UUIDs
    try {
      validateUUID(orgId, 'Organization ID');
      validateUUID(userId, 'User ID');
      validateUUID(modelId, 'Model ID');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Invalid ID format');
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

    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Verify model exists and belongs to org
    const model = await prisma.model.findUnique({
      where: { id: modelId },
    });

    if (!model || model.orgId !== orgId) {
      throw new NotFoundError('Model not found');
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), 0); // End of current month

    if (period === 'current') {
      startDate = new Date(now.getFullYear(), 0, 1); // Start of current year
    } else if (period === 'previous') {
      startDate = new Date(now.getFullYear() - 1, 0, 1);
      endDate = new Date(now.getFullYear() - 1, 11, 31);
    } else {
      // YTD
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = now;
    }

    // Get budget and actual values
    // Budget: Try user-defined budgets first, fall back to model
    // Actual: Always from transactions
    const [budgetData, actualData] = await Promise.all([
      getBudgetFromUserOrModel(orgId, modelId, startDate, endDate),
      getActualFromTransactions(orgId, startDate, endDate),
    ]);

    // Combine periods
    const allPeriods = new Set([
      ...budgetData.revenue.keys(),
      ...budgetData.expenses.keys(),
      ...actualData.revenue.keys(),
      ...actualData.expenses.keys(),
    ]);

    const periods: BudgetActualPeriod[] = [];
    let totalBudgetRevenue = 0;
    let totalActualRevenue = 0;
    let totalBudgetExpenses = 0;
    let totalActualExpenses = 0;

    for (const periodKey of Array.from(allPeriods).sort()) {
      const budgetRev = budgetData.revenue.get(periodKey) || 0;
      const actualRev = actualData.revenue.get(periodKey) || 0;
      const budgetExp = budgetData.expenses.get(periodKey) || 0;
      const actualExp = actualData.expenses.get(periodKey) || 0;

      const revenueVariance = actualRev - budgetRev;
      const revenueVariancePercent = budgetRev !== 0 ? (revenueVariance / budgetRev) * 100 : 0;

      // Calculate period variance correctly
      // Period Variance = (Actual Revenue - Actual Expenses) - (Budget Revenue - Budget Expenses)
      const periodBudget = budgetRev - budgetExp;
      const periodActual = actualRev - actualExp;
      const periodVariance = periodActual - periodBudget;
      const periodVariancePercent = periodBudget !== 0 
        ? (periodVariance / Math.abs(periodBudget)) * 100 
        : (periodActual !== 0 ? 100 : 0);
      
      periods.push({
        period: periodKey,
        budgetRevenue: budgetRev,
        actualRevenue: actualRev,
        budgetExpenses: budgetExp,
        actualExpenses: actualExp,
        variance: periodVariance, // Net variance for the period
        variancePercent: periodVariancePercent,
      });

      totalBudgetRevenue += budgetRev;
      totalActualRevenue += actualRev;
      totalBudgetExpenses += budgetExp;
      totalActualExpenses += actualExp;
    }

    // Calculate summary using industry-standard financial formulas
    // Revenue Variance = Actual Revenue - Budget Revenue
    const revenueVariance = totalActualRevenue - totalBudgetRevenue;
    const revenueVariancePercent = totalBudgetRevenue !== 0 
      ? (revenueVariance / totalBudgetRevenue) * 100 
      : (totalActualRevenue !== 0 ? 100 : 0);
    
    // Expense Variance = Actual Expenses - Budget Expenses
    const expenseVariance = totalActualExpenses - totalBudgetExpenses;
    const expenseVariancePercent = totalBudgetExpenses !== 0 
      ? (expenseVariance / totalBudgetExpenses) * 100 
      : (totalActualExpenses !== 0 ? 100 : 0);
    
    // Net Variance = (Actual Revenue - Actual Expenses) - (Budget Revenue - Budget Expenses)
    // Simplified: Net Variance = Revenue Variance - Expense Variance
    const totalBudget = totalBudgetRevenue - totalBudgetExpenses;
    const totalActual = totalActualRevenue - totalActualExpenses;
    const netVariance = totalActual - totalBudget; // This is the correct formula
    const netVariancePercent = totalBudget !== 0 
      ? (netVariance / Math.abs(totalBudget)) * 100 
      : (totalActual !== 0 ? 100 : 0);

    // Budget Accuracy = How close actuals are to budget (0-100%)
    // Formula: 100% - (Average of absolute variance percentages)
    // Industry standard: Weighted average considering both revenue and expenses
    let budgetAccuracy = 100;
    if (totalBudgetRevenue > 0 || totalBudgetExpenses > 0) {
      const revenueWeight = totalBudgetRevenue / (totalBudgetRevenue + totalBudgetExpenses);
      const expenseWeight = totalBudgetExpenses / (totalBudgetRevenue + totalBudgetExpenses);
      const revenueAccuracy = totalBudgetRevenue > 0 
        ? Math.max(0, 100 - Math.abs(revenueVariancePercent))
        : 100;
      const expenseAccuracy = totalBudgetExpenses > 0
        ? Math.max(0, 100 - Math.abs(expenseVariancePercent))
        : 100;
      budgetAccuracy = (revenueAccuracy * revenueWeight) + (expenseAccuracy * expenseWeight);
      // If only one exists, use that one
      if (totalBudgetRevenue === 0) budgetAccuracy = expenseAccuracy;
      if (totalBudgetExpenses === 0) budgetAccuracy = revenueAccuracy;
    }

    const summary: BudgetActualSummary = {
      budgetAccuracy,
      revenueVariance,
      revenueVariancePercent,
      expenseVariance,
      expenseVariancePercent,
      netVariance,
      netVariancePercent,
    };

    // Calculate category breakdown
    const categoryMap = new Map<string, { budget: number; actual: number }>();
    
    // Get user-defined budgets by category
    // Calculate month strings for budget lookup
    const budgetStartMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
    const budgetEndMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
    
    try {
      const userBudgets = await budgetService.getBudgetsGrouped(orgId, budgetStartMonth, budgetEndMonth);
      for (const [category, monthMap] of userBudgets.entries()) {
        const totalBudget = Array.from(monthMap.values()).reduce((sum, amt) => sum + amt, 0);
        categoryMap.set(category, { budget: totalBudget, actual: 0 });
      }
    } catch (error) {
      // If budget service fails, continue without user budgets
    }
    
    // Get categories from transactions
    const categoryTransactions = await prisma.rawTransaction.groupBy({
      by: ['category'],
      where: {
        orgId,
        date: { gte: startDate, lte: endDate },
      },
      _sum: {
        amount: true,
      },
    });

    for (const cat of categoryTransactions) {
      if (cat.category) {
        const amount = Number(cat._sum.amount || 0);
        const existing = categoryMap.get(cat.category) || { budget: 0, actual: 0 };
        if (amount < 0) {
          existing.actual += Math.abs(amount);
        } else {
          // Revenue category
        }
        categoryMap.set(cat.category, existing);
      }
    }

    const categories: BudgetActualCategory[] = [];
    for (const [category, values] of categoryMap.entries()) {
      const { variance, variancePercent, status } = calculateVariance(values.budget, values.actual);
      categories.push({
        category,
        budget: values.budget,
        actual: values.actual,
        variance,
        variancePercent,
        status,
      });
    }

    // Generate alerts
    const alerts = generateAlerts(summary, categories);

    return {
      summary,
      periods,
      categories,
      alerts,
    };
  },
};

