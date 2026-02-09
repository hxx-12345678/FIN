/**
 * Forecasting Service
 * Orchestrates predictive modeling requests to the Python worker
 */

import axios from 'axios';
import prisma from '../config/database';
import { ValidationError } from '../utils/errors';

const PYTHON_WORKER_URL = process.env.PYTHON_WORKER_URL || 'http://localhost:5000';

export interface ForecastParams {
    history: number[];
    steps: number;
    method?: 'auto' | 'arima' | 'trend' | 'seasonal';
    period?: number;
}

export const forecastingService = {
    /**
     * Generate a forecast for a specific metric
     */
    generateForecast: async (orgId: string, modelId: string, params: {
        metricName: string;
        steps: number;
        method?: 'auto' | 'arima' | 'trend' | 'seasonal' | 'regression';
        period?: number;
    }) => {
        try {
            // 1. Get history
            const history = await forecastingService.getHistoricalMetricData(orgId, modelId, params.metricName);

            // 2. Call Python worker
            const response = await axios.post(`${PYTHON_WORKER_URL}/compute/forecast`, {
                history,
                steps: params.steps,
                method: params.method || 'auto',
                period: params.period || 12
            });

            const { forecast, method, explanation, metrics } = response.data;

            // 3. Persist forecast
            const savedForecast = await (prisma as any).forecast.create({
                data: {
                    orgId,
                    modelId,
                    metricName: params.metricName,
                    method,
                    forecastData: forecast.map((v: number, i: number) => ({ index: i, value: v })),
                    historicalData: history
                }
            });

            return {
                id: savedForecast.id,
                forecast,
                method,
                explanation,
                metrics
            };
        } catch (error: any) {
            console.error('Forecasting error:', error.message);
            throw new Error(`Forecasting engine failed: ${error.message}`);
        }
    },

    /**
     * Run backtesting to validate accuracy
     */
    runBacktest: async (history: number[], window: number = 12) => {
        try {
            const response = await axios.post(`${PYTHON_WORKER_URL}/compute/forecast/backtest`, {
                history,
                window
            });

            return response.data;
        } catch (error: any) {
            console.error('Backtesting error:', error.message);
            throw new Error(`Backtesting engine failed: ${error.message}`);
        }
    },

    /**
     * Get historical data for a metric from the DB or Cube
     */
    getHistoricalMetricData: async (orgId: string, modelId: string, metricName: string) => {
        // Fetch from MetricCube (our multi-dimensional store)
        const entries = await (prisma as any).metricCube.findMany({
            where: {
                orgId,
                modelId,
                metricName
            },
            orderBy: {
                month: 'asc'
            }
        });

        // Group by month and sum values (if multi-dimensional)
        const monthlyData: Record<string, number> = {};
        entries.forEach(e => {
            monthlyData[e.month] = (monthlyData[e.month] || 0) + Number(e.value);
        });

        return Object.entries(monthlyData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([_, val]) => val);
    }
};
