/**
 * Hyperblock Computation Service
 * Communicates with Python worker's real-time engine
 */

import axios from 'axios';
import { ValidationError } from '../utils/errors';
import prisma from '../config/database';

const PYTHON_WORKER_URL = process.env.PYTHON_WORKER_URL || 'http://localhost:5000';

export interface HyperblockUpdate {
    nodeId: string;
    values: Record<string, number>;
    userId?: string;
}

export const hyperblockService = {
    /**
     * Recompute model using Hyperblock engine
     */
    recompute: async (orgId: string, modelId: string, update?: HyperblockUpdate) => {
        try {
            // 1. Fetch model structure to initialize engine if needed
            const model = await prisma.model.findUnique({
                where: { id: modelId },
                include: {
                    drivers: true,
                    driverFormulas: true
                }
            });

            if (!model) throw new ValidationError('Model not found');

            // 2. Prepare nodes for the engine
            // Combine drivers and their formulas
            const nodes = model.drivers.map(d => {
                const formula = model.driverFormulas.find(f => f.driverId === d.id);
                return {
                    id: d.id,
                    name: d.name,
                    formula: formula?.expression || d.formula || null,
                    category: d.category
                };
            });

            // 3. Define time horizon (e.g., 12 months from model start)
            // For MVP, we'll use 12 months starting from now
            const months: string[] = [];
            const now = new Date();
            for (let i = 0; i < 12; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
                months.push(d.toISOString().slice(0, 7));
            }

            // 4. Call Python Hyperblock API
            const response = await axios.post(`${PYTHON_WORKER_URL}/compute/hyperblock`, {
                modelId,
                orgId,
                months,
                nodes,
                update
            });

            const { results, affectedNodes, trace, metrics } = response.data;

            // 5. Save trace for explainability if an update occurred
            if (update) {
                await (prisma as any).computationTrace.create({
                    data: {
                        orgId,
                        modelId,
                        triggerNodeId: update.nodeId,
                        triggerUserId: update.userId || null,
                        affectedNodes: affectedNodes as any,
                        durationMs: metrics.computeTimeMs
                    }
                });
            }

            return {
                results,
                affectedNodes,
                trace,
                metrics
            };
        } catch (error: any) {
            console.error('Hyperblock recompute error:', error.message);
            throw new Error(`Hyperblock engine failed: ${error.message}`);
        }
    },

    /**
     * Get recently traces for a model
     */
    getTraces: async (modelId: string, limit: number = 10) => {
        return (prisma as any).computationTrace.findMany({
            where: { modelId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    }
};
