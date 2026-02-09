/**
 * Financial Reasoning Service
 */

import axios from 'axios';
import prisma from '../config/database';
import { ValidationError } from '../utils/errors';

const PYTHON_WORKER_URL = process.env.PYTHON_WORKER_URL || 'http://localhost:5000';

export const reasoningService = {
    /**
     * Get automated suggestions for improving a metric (e.g., 'burn_rate', 'cash_runway').
     */
    analyzeMetric: async (modelId: string, metric: string, goal: 'increase' | 'decrease' | 'stabilize') => {
        try {
            // Fetch model structure and latest data
            const model = await prisma.model.findUnique({
                where: { id: modelId }
            });

            const latestRun = await prisma.modelRun.findFirst({
                where: { modelId, status: 'done' },
                orderBy: { createdAt: 'desc' }
            });

            // Extract nodes from modelJson (assuming Anaplan-style structure)
            const modelData = model?.modelJson as any;
            const nodes = modelData?.nodes || [];

            // Extract baseline data
            const resultData = latestRun?.summaryJson as any;

            const response = await axios.post(`${PYTHON_WORKER_URL}/compute/reasoning`, {
                modelId,
                target: metric,
                nodes: nodes,
                data: resultData?.metrics || {}, // Assuming metrics map in summary
                goal,
                num_months: 12
            });

            return response.data;
        } catch (error: any) {
            console.error('Reasoning engine error:', error.message);
            // Fallback: heuristic logic if Python worker fails
            return {
                analysis: [
                    { driver: 'revenue', action: 'increase', reasoning: 'Primary driver of runway extension.', estimated_impact: 'High' },
                    { driver: 'opex', action: 'decrease', reasoning: 'Direct correlation with cash burn.', estimated_impact: 'Medium' }
                ],
                suggestions: [
                    { driver: 'Sales Velocity', action: 'Optimize', reasoning: 'Increasing sales speed offsets burn.' }
                ],
                explanation: {
                    description: 'Heuristic fallback: Revenue and Opex are key levers.'
                },
                weakAssumptions: []
            };
        }
    },

    /**
     * Simulate a scenario to see the impact on a target metric.
     * @param overrides Map of driver ID/name to percentage change (e.g. {'revenue': 0.1})
     */
    simulateScenario: async (modelId: string, target: string, overrides: Record<string, number>) => {
        try {
            const response = await axios.post(`${PYTHON_WORKER_URL}/compute/scenario`, {
                modelId,
                target,
                overrides
            });
            return response.data.result;
        } catch (error: any) {
            console.error('Scenario simulation error:', error.message);
            // Fallback
            return {
                target,
                baseline: 0,
                simulated: 0,
                delta_percent: 0,
                scenario_description: 'Simulation unavailable'
            };
        }
    }
};
