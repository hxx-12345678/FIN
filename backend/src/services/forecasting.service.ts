/**
 * Forecasting Service
 * Orchestrates predictive modeling requests to the Python worker
 */

import prisma from '../config/database';
import { ValidationError } from '../utils/errors';
import { workerClient } from '../utils/worker-client';

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
        runId?: string; // NEW
    }) => {
        try {
            // 1. Get history
            const history = await forecastingService.getHistoricalMetricData(orgId, modelId, params.metricName, params.runId);

            // 2. Call Python worker via secure client
            const response = await workerClient.post('/compute/forecast', {
                history,
                steps: params.steps,
                method: params.method || 'auto',
                period: params.period || 12
            });

            const { forecast, confidenceBands, method, explanation, metrics } = response.data;

            // 3. Persist forecast
            const savedForecast = await (prisma as any).forecast.create({
                data: {
                    orgId,
                    modelId,
                    metricName: params.metricName,
                    method,
                    forecastData: Array.isArray(forecast) ? forecast.map((v: number, i: number) => ({ index: i, value: v })) : [],
                    historicalData: history
                }
            });

            return {
                id: savedForecast.id,
                forecast,
                confidenceBands,
                method,
                explanation,
                metrics
            };
        } catch (error: any) {
            console.error('Forecasting error:', error.message);
            return {
                id: null,
                forecast: [],
                method: 'unavailable',
                explanation: { info: 'Forecasting engine is currently unavailable' },
                metrics: {},
                error: error.message
            };
        }
    },

    /**
     * Generate an enterprise-grade forecast with regime detection and feature awareness
     */
    generateEnterpriseForecast: async (orgId: string, modelId: string, params: {
        metricName: string;
        steps: number;
        features?: Record<string, number[]>;
        featuresForecast?: Record<string, number[]>;
        drivers?: Record<string, any>;
        assumptions?: Record<string, number>;
        industryBenchmarks?: Record<string, number[]>;
        runId?: string;
    }) => {
        try {
            const history = await forecastingService.getHistoricalMetricData(orgId, modelId, params.metricName, params.runId);

            if (history.length === 0) {
                return { error: 'Insufficient historical data' };
            }

            const response = await workerClient.post('/compute/forecast/enterprise', {
                history,
                steps: params.steps,
                features: params.features,
                featuresForecast: params.featuresForecast,
                drivers: params.drivers,
                assumptions: params.assumptions,
                industryBenchmarks: params.industryBenchmarks
            });

            return response.data.result;
        } catch (error: any) {
            console.error('Enterprise forecasting error:', error.message);
            throw error;
        }
    },

    /**
     * Run backtesting to validate accuracy
     */
    runBacktest: async (history: number[], window: number = 12) => {
        try {
            const response = await workerClient.post('/compute/forecast/backtest', {
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
     * Falls back to latest model run data if cube is empty
     */
    getHistoricalMetricData: async (orgId: string, modelId: string, metricName: string, runId?: string) => {
        try {
            // First try: Fetch from MetricCube (our multi-dimensional store)
            let cubeData: number[] = [];
            // If runId is provided, we prefer model run data over cube because cube is shared
            if (!runId) {
                try {
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
                    entries.forEach((e: any) => {
                        monthlyData[e.month] = (monthlyData[e.month] || 0) + Number(e.value);
                    });

                    cubeData = Object.entries(monthlyData)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([_, val]) => val);
                } catch (cubeError: any) {
                    console.warn('MetricCube lookup failed (table may not exist):', cubeError.message);
                }
            }

            if (cubeData.length > 0) {
                return cubeData;
            }

            // Fallback: Extract from the latest completed model run's monthly data
            // This ensures forecasting works even if metric_cubes table doesn't exist
            console.log(`MetricCube empty for ${metricName}, falling back to latest model run data`);
            const latestRun = runId 
                ? await prisma.modelRun.findUnique({ where: { id: runId }, select: { summaryJson: true } })
                : await prisma.modelRun.findFirst({
                    where: {
                        modelId,
                        orgId,
                        status: 'done'
                    },
                    orderBy: { createdAt: 'desc' },
                    select: { summaryJson: true }
                });

            if (latestRun?.summaryJson) {
                const summary = latestRun.summaryJson as any;
                const monthly = summary?.monthly || summary?.fullResult?.monthly || {};

                // Map metricName to the correct field in monthly data
                const metricKeyMap: Record<string, string> = {
                    'revenue': 'revenue',
                    'expenses': 'expenses',
                    'opex': 'opex',
                    'cogs': 'cogs',
                    'netIncome': 'netIncome',
                    'cashBalance': 'cashBalance',
                    'burnRate': 'burnRate',
                    'grossProfit': 'grossProfit',
                    'headcount': 'headcount',
                };
                const dataKey = metricKeyMap[metricName] || metricName;

                const sortedMonths = Object.keys(monthly).sort();
                const values = sortedMonths.map(m => {
                    let val = monthly[m]?.[dataKey];
                    
                    // Fallback for older python worker deployments that may not emit opex or headcount per month
                    if (val === undefined && dataKey === 'opex') {
                        val = (monthly[m]?.expenses || 0) - (monthly[m]?.cogs || 0);
                    }
                    if (val === undefined && dataKey === 'headcount') {
                        // Estimate headcount based on operational expenses (avg $10k per head/month)
                        val = Math.max(1, Math.floor((monthly[m]?.expenses || 0) / 10000));
                    }
                    
                    return typeof val === 'number' ? val : 0;
                });

                if (values.length > 0) {
                    console.log(`Extracted ${values.length} data points from latest model run for ${metricName}`);
                    return values;
                }
            }

            return [];
        } catch (error: any) {
            console.warn('getHistoricalMetricData error:', error.message);
            return [];
        }
    }
};
