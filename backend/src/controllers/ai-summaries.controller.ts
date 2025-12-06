/**
 * AI SUMMARIES CONTROLLER
 * Handles requests for AI-generated financial summaries
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { aiSummariesService, SummaryRequest } from '../services/ai-summaries.service';
import { ValidationError } from '../utils/errors';

export const aiSummariesController = {
  /**
   * Generate AI summary for a financial report
   * POST /api/v1/orgs/:orgId/ai-summaries
   */
  generateSummary: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { reportType, modelId, period, includeMetrics } = req.body;

      if (!reportType) {
        throw new ValidationError('reportType is required');
      }

      const validReportTypes = ['pl', 'cashflow', 'balance_sheet', 'budget_actual', 'overview'];
      if (!validReportTypes.includes(reportType)) {
        throw new ValidationError(`reportType must be one of: ${validReportTypes.join(', ')}`);
      }

      const request: SummaryRequest = {
        reportType,
        orgId,
        modelId,
        period,
        includeMetrics,
      };

      const summary = await aiSummariesService.generateSummary(request, req.user.id);

      res.json({
        ok: true,
        summary,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get cached summary if available
   * GET /api/v1/orgs/:orgId/ai-summaries/:reportType
   */
  getCachedSummary: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, reportType } = req.params;
      const { period } = req.query;

      const summary = await aiSummariesService.getCachedSummary(orgId, reportType, period as string);

      if (!summary) {
        return res.status(404).json({
          ok: false,
          error: 'No cached summary found',
        });
      }

      res.json({
        ok: true,
        summary,
      });
    } catch (error) {
      next(error);
    }
  },
};

