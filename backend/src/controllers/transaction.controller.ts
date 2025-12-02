/**
 * Transaction Controller
 * API endpoints for raw transactions
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { ValidationError } from '../utils/errors';
import { transactionService } from '../services/transaction.service';

export const transactionController = {
  /**
   * GET /api/v1/orgs/:orgId/transactions
   * List transactions for an organization
   */
  listTransactions: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { startDate, endDate, category, vendor, keyword, limit, offset } = req.query;

      // Parse filters
      const filters: any = {
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      };

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }
      if (category) {
        filters.category = category as string;
      }
      if (vendor) {
        filters.vendor = vendor as string;
      }
      if (keyword) {
        filters.keyword = keyword as string;
      }

      const result = await transactionService.listTransactions(req.user.id, orgId, filters);

      res.json({
        ok: true,
        transactions: result.transactions,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/transactions/stats
   * Get transaction statistics
   */
  getStats: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { startDate, endDate } = req.query;

      const stats = await transactionService.getStats(
        req.user.id,
        orgId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        ok: true,
        stats,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/transactions/reconciliation
   * Get reconciliation preview
   */
  getReconciliationPreview: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { startDate, endDate } = req.query;

      const preview = await transactionService.getReconciliationPreview(
        req.user.id,
        orgId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        ok: true,
        ...preview,
      });
    } catch (error) {
      next(error);
    }
  },
};

