/**
 * Forecasting Controller
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { forecastingService } from '../services/forecasting.service';
import { ValidationError } from '../utils/errors';

export const forecastingController = {
    /**
     * POST /api/v1/orgs/:orgId/models/:modelId/forecast
     */
    forecastMetric: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { orgId, modelId } = req.params;
            const { metricName, steps, method, period } = req.body;

            if (!metricName) throw new ValidationError('metricName is required');

            // 1. Get historical data first (we'll return it to the frontend)
            const history = await forecastingService.getHistoricalMetricData(orgId, modelId, metricName);

            // 2. Run forecast
            const result = await forecastingService.generateForecast(orgId, modelId, {
                metricName,
                steps: steps || 12,
                method,
                period
            });

            // Include the historical data in the response so the frontend 
            // shows actual model-specific values instead of hardcoded mock data
            res.json({ ok: true, ...result, history, actual: history });
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/v1/orgs/:orgId/models/:modelId/backtest
     */
    backtestMetric: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { orgId, modelId } = req.params;
            const { metricName, window } = req.body;

            if (!metricName) throw new ValidationError('metricName is required');

            // 1. Get history
            const history = await forecastingService.getHistoricalMetricData(orgId, modelId, metricName);

            // 2. Run backtest
            const result = await forecastingService.runBacktest(history, window || 12);

            res.json({ ok: true, ...result });
        } catch (error) {
            next(error);
        }
    }
};
