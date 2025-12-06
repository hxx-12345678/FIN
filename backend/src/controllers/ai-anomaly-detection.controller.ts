/**
 * AI ANOMALY DETECTION CONTROLLER
 * Handles requests for anomaly detection in financial data
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { aiAnomalyDetectionService, AnomalyDetectionRequest } from '../services/ai-anomaly-detection.service';
import { ValidationError } from '../utils/errors';

export const aiAnomalyDetectionController = {
  /**
   * Detect anomalies in financial data
   * POST /api/v1/orgs/:orgId/anomalies/detect
   */
  detectAnomalies: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { modelId, checkTypes, threshold } = req.body;

      const request: AnomalyDetectionRequest = {
        orgId,
        modelId,
        checkTypes,
        threshold,
      };

      const result = await aiAnomalyDetectionService.detectAnomalies(request, req.user.id);

      res.json({
        ok: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get recent anomalies
   * GET /api/v1/orgs/:orgId/anomalies
   */
  getRecentAnomalies: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const anomalies = await aiAnomalyDetectionService.getRecentAnomalies(orgId, limit);

      res.json({
        ok: true,
        anomalies,
      });
    } catch (error) {
      next(error);
    }
  },
};

