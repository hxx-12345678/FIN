/**
 * Risk Controller
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { riskService } from '../services/risk.service';

export const riskController = {
  /**
   * POST /api/v1/orgs/:orgId/models/:modelId/risk
   */
  analyzeRisk: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { orgId, modelId } = req.params;
      const { distributions, numSimulations } = req.body;

      const results = await riskService.runRiskAnalysis(orgId, modelId, {
        distributions: distributions || {},
        numSimulations
      });

      res.json({ ok: true, results });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Legacy / Compatibility Stubs
   */
  getRiskScore: async (req: Request, res: Response) => {
    res.json({ ok: true, score: 0.85, riskLevel: 'low' });
  },

  getModelRiskScores: async (req: Request, res: Response) => {
    res.json({ ok: true, riskScores: [] });
  }
};
