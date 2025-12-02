/**
 * BUDGET CONTROLLER
 * Handles HTTP requests for budget management
 */

import { Response, NextFunction } from 'express';
import { budgetService, BudgetInput } from '../services/budget.service';
import { AuthRequest } from '../middlewares/auth';
import { ValidationError } from '../utils/errors';

export const budgetController = {
  /**
   * POST /orgs/:orgId/budgets
   * Create or update budgets (bulk)
   */
  upsertBudgets: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { budgets } = req.body;

      if (!budgets || !Array.isArray(budgets) || budgets.length === 0) {
        throw new ValidationError('budgets array is required and must not be empty');
      }

      const results = await budgetService.upsertBudgets(
        orgId,
        req.user.id,
        budgets as BudgetInput[]
      );

      res.json({
        ok: true,
        data: {
          budgets: results,
          count: results.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /orgs/:orgId/budgets
   * Get budgets with optional filters
   */
  getBudgets: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { category, month, startMonth, endMonth } = req.query;

      const filters: any = {};
      if (category) filters.category = category as string;
      if (month) filters.month = month as string;
      if (startMonth) filters.startMonth = startMonth as string;
      if (endMonth) filters.endMonth = endMonth as string;

      const budgets = await budgetService.getBudgets(orgId, req.user.id, filters);

      res.json({
        ok: true,
        data: {
          budgets,
          count: budgets.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /orgs/:orgId/budgets/summary
   * Get budget summary
   */
  getBudgetSummary: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;

      const summary = await budgetService.getBudgetSummary(orgId, req.user.id);

      res.json({
        ok: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /orgs/:orgId/budgets/:budgetId
   * Delete a specific budget
   */
  deleteBudget: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, budgetId } = req.params;

      await budgetService.deleteBudget(orgId, req.user.id, budgetId);

      res.json({
        ok: true,
        message: 'Budget deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /orgs/:orgId/budgets
   * Delete budgets by filter
   */
  deleteBudgets: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { category, month, startMonth, endMonth } = req.query;

      const filters: any = {};
      if (category) filters.category = category as string;
      if (month) filters.month = month as string;
      if (startMonth) filters.startMonth = startMonth as string;
      if (endMonth) filters.endMonth = endMonth as string;

      const count = await budgetService.deleteBudgets(orgId, req.user.id, filters);

      res.json({
        ok: true,
        message: `Deleted ${count} budget(s)`,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  },
};

