import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { ValidationError } from '../utils/errors';
import { dataImportService } from '../services/data-import.service';

export const dataImportController = {
  listBatches: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId } = req.params;
      const batches = await dataImportService.listBatches(orgId, req.user.id);
      res.json({ ok: true, data: batches });
    } catch (e) {
      next(e);
    }
  },

  getBatch: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId, batchId } = req.params;
      const batch = await dataImportService.getBatch(orgId, batchId, req.user.id);
      res.json({ ok: true, data: batch });
    } catch (e) {
      next(e);
    }
  },
};



