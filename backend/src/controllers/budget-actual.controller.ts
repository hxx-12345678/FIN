import { Response, NextFunction } from 'express';
import { budgetActualService } from '../services/budget-actual.service';
import { AuthRequest } from '../middlewares/auth';
import { ValidationError, NotFoundError } from '../utils/errors';

export const budgetActualController = {
  /**
   * Simple endpoint: GET /api/v1/orgs/:orgId/budget-actual
   * Returns budget vs actual data without requiring modelId
   */
  getBudgetActualSimple: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { period = 'current' } = req.query;

      if (!orgId) {
        throw new ValidationError('orgId is required');
      }

      const validPeriods = ['current', 'previous', 'ytd'];
      if (!validPeriods.includes(period as string)) {
        throw new ValidationError(`period must be one of: ${validPeriods.join(', ')}`);
      }

      const data = await budgetActualService.getBudgetActualSimple(
        orgId,
        req.user.id,
        period as 'current' | 'previous' | 'ytd'
      );

      res.json({
        ok: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Original endpoint: GET /api/v1/orgs/:orgId/models/:modelId/budget-actual
   * Returns budget vs actual data with modelId (for backward compatibility)
   */
  getBudgetActual: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, modelId } = req.params;
      const { period = 'current', view = 'monthly' } = req.query;

      if (!orgId || !modelId) {
        throw new ValidationError('orgId and modelId are required');
      }

      const validPeriods = ['current', 'previous', 'ytd'];
      const validViews = ['monthly', 'quarterly', 'yearly'];

      if (!validPeriods.includes(period as string)) {
        throw new ValidationError(`period must be one of: ${validPeriods.join(', ')}`);
      }

      if (!validViews.includes(view as string)) {
        throw new ValidationError(`view must be one of: ${validViews.join(', ')}`);
      }

      const data = await budgetActualService.getBudgetActual(
        orgId,
        req.user.id,
        modelId,
        period as 'current' | 'previous' | 'ytd',
        view as 'monthly' | 'quarterly' | 'yearly'
      );

      res.json({
        ok: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};

