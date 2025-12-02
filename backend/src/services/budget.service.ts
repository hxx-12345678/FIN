/**
 * BUDGET SERVICE
 * Manages user-defined budgets for Budget vs Actual comparisons
 */

import prisma from '../config/database';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors';
import { validateUUID } from '../utils/validation';
import { logger } from '../utils/logger';

export interface BudgetInput {
  category: string;
  month: string; // YYYY-MM format
  amount: number;
  currency?: string;
  source?: 'manual' | 'csv_upload' | 'api';
}

export interface BudgetRecord {
  id: string;
  orgId: string;
  category: string;
  month: string;
  amount: number;
  currency: string;
  source: string;
  createdById?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetSummary {
  totalBudgets: number;
  categories: string[];
  months: string[];
  totalAmount: number;
}

/**
 * Validate month format (YYYY-MM)
 */
function validateMonth(month: string): boolean {
  const regex = /^\d{4}-\d{2}$/;
  if (!regex.test(month)) {
    return false;
  }
  const [year, monthNum] = month.split('-').map(Number);
  return year >= 2000 && year <= 2100 && monthNum >= 1 && monthNum <= 12;
}

/**
 * Normalize category name
 */
function normalizeCategory(category: string): string {
  return category.trim().replace(/\s+/g, ' ');
}

export const budgetService = {
  /**
   * Create or update budgets (bulk)
   */
  async upsertBudgets(
    orgId: string,
    userId: string,
    budgets: BudgetInput[]
  ): Promise<BudgetRecord[]> {
    // Validate UUIDs
    validateUUID(orgId, 'Organization ID');
    validateUUID(userId, 'User ID');

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

    // Validate all budgets
    const errors: string[] = [];
    for (let i = 0; i < budgets.length; i++) {
      const budget = budgets[i];
      if (!budget.category || !budget.category.trim()) {
        errors.push(`Budget ${i + 1}: Category is required`);
      }
      if (!budget.month || !validateMonth(budget.month)) {
        errors.push(`Budget ${i + 1}: Month must be in YYYY-MM format`);
      }
      if (typeof budget.amount !== 'number' || isNaN(budget.amount)) {
        errors.push(`Budget ${i + 1}: Amount must be a valid number`);
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(`Validation errors: ${errors.join('; ')}`);
    }

    // Upsert budgets
    const results: BudgetRecord[] = [];
    for (const budget of budgets) {
      const normalizedCategory = normalizeCategory(budget.category);
      const currency = budget.currency || 'USD';
      const source = budget.source || 'manual';

      const result = await prisma.budget.upsert({
        where: {
          orgId_category_month: {
            orgId,
            category: normalizedCategory,
            month: budget.month,
          },
        },
        update: {
          amount: budget.amount,
          currency,
          source,
          updatedAt: new Date(),
        },
        create: {
          orgId,
          category: normalizedCategory,
          month: budget.month,
          amount: budget.amount,
          currency,
          source,
          createdById: userId,
        },
      });

      results.push({
        ...result,
        amount: Number(result.amount),
      } as BudgetRecord);
    }

    logger.info(`Upserted ${results.length} budgets for org ${orgId}`);
    return results;
  },

  /**
   * Get budgets for an organization
   */
  async getBudgets(
    orgId: string,
    userId: string,
    filters?: {
      category?: string;
      month?: string;
      startMonth?: string;
      endMonth?: string;
    }
  ): Promise<BudgetRecord[]> {
    validateUUID(orgId, 'Organization ID');
    validateUUID(userId, 'User ID');

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

    const where: any = { orgId };

    if (filters?.category) {
      where.category = normalizeCategory(filters.category);
    }

    if (filters?.month) {
      where.month = filters.month;
    } else if (filters?.startMonth || filters?.endMonth) {
      where.month = {};
      if (filters.startMonth) {
        where.month.gte = filters.startMonth;
      }
      if (filters.endMonth) {
        where.month.lte = filters.endMonth;
      }
    }

    const budgets = await prisma.budget.findMany({
      where,
      orderBy: [
        { month: 'asc' },
        { category: 'asc' },
      ],
    });

    return budgets.map(b => ({
      ...b,
      amount: Number(b.amount),
    })) as BudgetRecord[];
  },

  /**
   * Get budget summary
   */
  async getBudgetSummary(
    orgId: string,
    userId: string
  ): Promise<BudgetSummary> {
    validateUUID(orgId, 'Organization ID');
    validateUUID(userId, 'User ID');

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

    const budgets = await prisma.budget.findMany({
      where: { orgId },
      select: {
        category: true,
        month: true,
        amount: true,
      },
    });

    const categories = Array.from(new Set(budgets.map(b => b.category)));
    const months = Array.from(new Set(budgets.map(b => b.month))).sort();
    const totalAmount = budgets.reduce((sum, b) => sum + Number(b.amount), 0);

    return {
      totalBudgets: budgets.length,
      categories,
      months,
      totalAmount,
    };
  },

  /**
   * Delete a budget
   */
  async deleteBudget(
    orgId: string,
    userId: string,
    budgetId: string
  ): Promise<void> {
    validateUUID(orgId, 'Organization ID');
    validateUUID(userId, 'User ID');
    validateUUID(budgetId, 'Budget ID');

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

    // Verify budget exists and belongs to org
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!budget) {
      throw new NotFoundError('Budget not found');
    }

    if (budget.orgId !== orgId) {
      throw new ForbiddenError('No access to this budget');
    }

    await prisma.budget.delete({
      where: { id: budgetId },
    });

    logger.info(`Deleted budget ${budgetId} for org ${orgId}`);
  },

  /**
   * Delete budgets by filter
   */
  async deleteBudgets(
    orgId: string,
    userId: string,
    filters: {
      category?: string;
      month?: string;
      startMonth?: string;
      endMonth?: string;
    }
  ): Promise<number> {
    validateUUID(orgId, 'Organization ID');
    validateUUID(userId, 'User ID');

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

    const where: any = { orgId };

    if (filters.category) {
      where.category = normalizeCategory(filters.category);
    }

    if (filters.month) {
      where.month = filters.month;
    } else if (filters.startMonth || filters.endMonth) {
      where.month = {};
      if (filters.startMonth) {
        where.month.gte = filters.startMonth;
      }
      if (filters.endMonth) {
        where.month.lte = filters.endMonth;
      }
    }

    const result = await prisma.budget.deleteMany({
      where,
    });

    logger.info(`Deleted ${result.count} budgets for org ${orgId}`);
    return result.count;
  },

  /**
   * Get budgets grouped by category and month
   * Returns Map<category, Map<month, amount>>
   */
  async getBudgetsGrouped(
    orgId: string,
    startMonth?: string,
    endMonth?: string
  ): Promise<Map<string, Map<string, number>>> {
    const filters: any = {};
    if (startMonth) filters.startMonth = startMonth;
    if (endMonth) filters.endMonth = endMonth;

    // Use a system user ID for internal calls (bypass auth)
    // In production, this should be called from within authenticated context
    const budgets = await budgetService.getBudgets(
      orgId,
      '00000000-0000-0000-0000-000000000000', // System user
      filters
    );

    const grouped = new Map<string, Map<string, number>>();

    for (const budget of budgets) {
      if (!grouped.has(budget.category)) {
        grouped.set(budget.category, new Map());
      }
      const categoryMap = grouped.get(budget.category)!;
      categoryMap.set(budget.month, Number(budget.amount));
    }

    return grouped;
  },
};

