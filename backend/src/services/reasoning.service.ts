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
    analyzeMetric: async (modelId: string, metric: string, goal: 'increase' | 'decrease' | 'stabilize', periodA?: number, periodB?: number) => {
        try {
            // Fetch model structure and latest data
            const model = await prisma.model.findUnique({
                where: { id: modelId }
            });

            const latestRun = await prisma.modelRun.findFirst({
                where: { modelId, status: 'done' },
                orderBy: { createdAt: 'desc' }
            });

            // Extract nodes from modelJson or fallback to drivers table
            const modelData = model?.modelJson as any;
            let nodes = modelData?.nodes || [];

            if (nodes.length === 0) {
                // Fallback: fetch from drivers table
                const drivers = await prisma.driver.findMany({
                    where: { modelId }
                });
                const formulas = await prisma.driverFormula.findMany({
                    where: { modelId }
                });

                nodes = drivers.map(d => ({
                    id: d.id,
                    name: d.name,
                    category: d.category,
                    formula: formulas.find(f => f.driverId === d.id)?.expression || d.formula
                }));
            }

            // Extract baseline data from latest run if available
            const resultData = latestRun?.summaryJson as any;
            const months = resultData?.months || [];

            console.log(`Calling reasoning engine with target: ${metric} and ${nodes.length} nodes`);
            const response = await axios.post(`${PYTHON_WORKER_URL}/compute/reasoning`, {
                modelId,
                target: metric,
                nodes: nodes,
                data: resultData?.metrics || {}, // Assuming metrics map in summary
                goal,
                num_months: 12,
                months: months,
                period_a: periodA,
                period_b: periodB
            });

            return response.data;
        } catch (error: any) {
            console.error('Reasoning engine error:', error.message);
            if (error.response) console.error('Worker diagnostic:', JSON.stringify(error.response.data));
            // Fallback: heuristic logic if Python worker fails
            return {
                analysis: {
                    target: metric,
                    drivers: [
                        { id: 'revenue', name: 'Revenue', sensitivity: 0.15, impact: 'high' },
                        { id: 'opex', name: 'Operating Expenses', sensitivity: -0.08, impact: 'medium' }
                    ]
                },
                suggestions: [
                    { driver: 'Revenue', action: 'Optimize/Scale', impact: 'High', reasoning: 'Primary driver of runway extension.' },
                    { driver: 'Operating Expenses', action: 'Reduce/Control', impact: 'Medium', reasoning: 'Direct correlation with cash burn.' }
                ],
                explanation: {
                    formula: `${metric} = f(revenue, expenses, ...)`,
                    steps: [
                        'Heuristic fallback: Revenue and Opex are key levers.',
                        'Connect the Python worker for detailed causal analysis.'
                    ]
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
