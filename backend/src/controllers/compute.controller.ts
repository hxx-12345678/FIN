import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { reasoningService } from '../services/reasoning.service';
import { ValidationError } from '../utils/errors';

export const computeController = {
    /**
     * POST /api/v1/compute/reasoning
     * Analyze a metric and get strategic suggestions
     */
    getReasoning: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                throw new ValidationError('User not authenticated');
            }

            const { modelId, target, goal } = req.body;

            if (!modelId || !target) {
                throw new ValidationError('modelId and target are required');
            }

            const result = await reasoningService.analyzeMetric(
                modelId,
                target,
                goal || 'increase'
            );

            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/v1/compute/scenario
     * Quick scenario simulation
     */
    simulateScenario: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                throw new ValidationError('User not authenticated');
            }

            const { modelId, target, overrides } = req.body;

            if (!modelId || !target || !overrides) {
                throw new ValidationError('modelId, target, and overrides are required');
            }

            const result = await reasoningService.simulateScenario(
                modelId,
                target,
                overrides
            );

            res.json({
                ok: true,
                result
            });
        } catch (error) {
            next(error);
        }
    }
};
