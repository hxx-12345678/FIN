import { Response, NextFunction } from 'express';
import { provenanceService } from '../services/provenance.service';
import { ValidationError } from '../utils/errors';
import { AuthRequest } from '../middlewares/auth';

export const provenanceExportController = {
  /**
   * POST /api/v1/provenance/export
   */
  createExport: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { model_run_id: modelRunId, format, include_transactions: includeTransactions } = req.body;

      if (!modelRunId) {
        throw new ValidationError('model_run_id is required');
      }

      const exportFormat = format === 'pdf' ? 'pdf' : 'json';
      const includeTxns = includeTransactions !== false; // Default to true

      const result = await provenanceService.createExportJob(
        modelRunId,
        req.user.id,
        exportFormat,
        includeTxns
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
};


