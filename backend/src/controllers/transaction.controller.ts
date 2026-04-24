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
   * DELETE /api/v1/orgs/:orgId/transactions/batch/:batchId
   * Delete all transactions belonging to a specific import batch.
   * Enterprise feature: allows removing bad or duplicate CSVs.
   */
  deleteImportBatch: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, batchId } = req.params;

      // Verify user has access (admin or finance required for delete)
      const role = await (await import('../config/database')).default.userOrgRole.findUnique({
        where: { userId_orgId: { userId: req.user.id, orgId } },
      });

      if (!role || !['admin', 'finance'].includes(role.role)) {
        throw new (await import('../utils/errors')).ForbiddenError('Only admins and finance users can delete import data');
      }

      // Count first so we can return a meaningful response
      const count = await (await import('../config/database')).default.rawTransaction.count({
        where: { orgId, importBatchId: batchId },
      });

      if (count === 0) {
        return res.json({ ok: true, deleted: 0, message: 'No transactions found for this batch' });
      }

      // Perform deletion
      const result = await (await import('../config/database')).default.rawTransaction.deleteMany({
        where: { orgId, importBatchId: batchId },
      });

      // Also soft-mark the dataImportBatch record as archived if it exists
      try {
        const prismaAny = (await import('../config/database')).default as any;
        if (prismaAny.dataImportBatch) {
          await prismaAny.dataImportBatch.updateMany({
            where: { id: batchId, orgId },
            data: { status: 'deleted' },
          });
        }
      } catch {
        // dataImportBatch table may not exist in all envs — ignore
      }

      res.json({
        ok: true,
        deleted: result.count,
        message: `Deleted ${result.count} transactions from import batch ${batchId}. Recompute your models to reflect this change.`,
      });
    } catch (error) {
      next(error);
    }
  },

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

