import { Response, NextFunction } from 'express';
import { semanticLayerService } from '../services/semantic-layer.service';
import { AuthRequest } from '../middlewares/auth';
import { ValidationError } from '../utils/errors';

export const semanticLayerController = {
  promoteBatch: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { orgId, batchId } = req.params;
      const result = await semanticLayerService.promoteToLedger(orgId, batchId);
      res.json({ ok: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  getLedger: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { orgId } = req.params;
      const { startDate, endDate } = req.query;

      const result = await semanticLayerService.getLedgerData(
        orgId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({ ok: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  addAdjustment: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { orgId } = req.params;
      const { transactionDate, amount, currency, accountCode, description, reason } = req.body;

      const result = await semanticLayerService.addAdjustment({
        orgId,
        transactionDate: new Date(transactionDate),
        amount,
        currency,
        accountCode,
        description,
        reason,
      });

      res.status(201).json({ ok: true, data: result });
    } catch (error) {
      next(error);
    }
  },
};


