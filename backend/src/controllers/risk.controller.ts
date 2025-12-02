import { Response, NextFunction } from 'express';
import { riskService } from '../services/risk.service';
import { ValidationError, NotFoundError } from '../utils/errors';
import { AuthRequest } from '../middlewares/auth';

export const riskController = {
  /**
   * GET /api/v1/montecarlo/:jobId/risk - Get risk score for Monte Carlo job
   */
  getRiskScore: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { jobId } = req.params;
      const { runwayThreshold } = req.query;

      const threshold = runwayThreshold
        ? parseFloat(runwayThreshold as string)
        : 6; // Default 6 months

      const riskScore = await riskService.calculateRiskScore(jobId, req.user.id, threshold);

      res.json({
        ok: true,
        riskScore,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/models/:modelId/risk - Get risk scores for all Monte Carlo runs
   */
  getModelRiskScores: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { modelId } = req.params;
      const { runwayThreshold } = req.query;

      const threshold = runwayThreshold
        ? parseFloat(runwayThreshold as string)
        : 6;

      const riskScores = await riskService.getModelRiskScores(
        modelId,
        req.user.id,
        threshold
      );

      res.json({
        ok: true,
        riskScores,
      });
    } catch (error) {
      next(error);
    }
  },
};


