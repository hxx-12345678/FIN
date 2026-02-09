/**
 * Hyperblock Computation Controller
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { hyperblockService } from '../services/hyperblock.service';
import { ValidationError } from '../utils/errors';

export const hyperblockController = {
    /**
     * POST /api/v1/orgs/:orgId/models/:modelId/recompute
     * Real-time incremental recompute
     */
    recompute: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ValidationError('Unauthorized');

            const { orgId, modelId } = req.params;
            const { update } = req.body; // {nodeId, values}

            const result = await hyperblockService.recompute(orgId, modelId, update ? {
                ...update,
                userId: req.user.id
            } : undefined);

            res.json({
                ok: true,
                ...result
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/v1/orgs/:orgId/models/:modelId/traces
     * Get computation traces
     */
    getTraces: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { modelId } = req.params;
            const traces = await hyperblockService.getTraces(modelId);

            res.json({
                ok: true,
                traces
            });
        } catch (error) {
            next(error);
        }
    }
};
