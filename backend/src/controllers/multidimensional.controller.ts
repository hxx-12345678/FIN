/**
 * Multi-Dimensional Modeling Controller
 * API endpoints for dimension management and cube operations
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { multidimensionalService } from '../services/multidimensional.service';
import { ValidationError } from '../utils/errors';

export const multidimensionalController = {
    /**
     * POST /api/v1/orgs/:orgId/models/:modelId/dimensions/init
     * Initialize default dimensions for a model
     */
    initializeDimensions: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { orgId, modelId } = req.params;
            const dimensions = await multidimensionalService.initializeDimensions(orgId, modelId);
            res.json({ ok: true, dimensions });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/v1/orgs/:orgId/models/:modelId/dimensions
     * Get all dimensions for a model
     */
    getDimensions: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { modelId } = req.params;
            const dimensions = await multidimensionalService.getDimensions(modelId);
            res.json({ ok: true, dimensions });
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/v1/orgs/:orgId/dimensions/:dimensionId/members
     * Add a member to a dimension
     */
    addDimensionMember: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { dimensionId } = req.params;
            const { name, code, parentId } = req.body;

            if (!name) throw new ValidationError('Member name is required');

            const member = await multidimensionalService.addDimensionMember(
                dimensionId,
                name,
                code,
                parentId
            );
            res.json({ ok: true, member });
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/v1/orgs/:orgId/models/:modelId/cube
     * Set a value in the metric cube
     */
    setCubeValue: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { orgId, modelId } = req.params;
            const { metricName, month, value, dimensions } = req.body;

            if (!metricName || !month || value === undefined) {
                throw new ValidationError('metricName, month, and value are required');
            }

            const entry = await multidimensionalService.setCubeValue(
                orgId,
                modelId,
                metricName,
                month,
                value,
                dimensions || {}
            );
            res.json({ ok: true, entry });
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/v1/orgs/:orgId/models/:modelId/cube/query
     * Query the metric cube with filters and aggregation
     */
    queryCube: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { modelId } = req.params;
            const { metricName, months, filters, groupBy } = req.body;

            if (!metricName) throw new ValidationError('metricName is required');

            const results = await multidimensionalService.queryCube({
                modelId,
                metricName,
                months,
                filters,
                groupBy
            });

            res.json({ ok: true, results });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/v1/orgs/:orgId/models/:modelId/cube/rollup
     * Get rollup aggregation for a metric
     */
    getRollup: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { modelId } = req.params;
            const { metricName, dimension, months } = req.query;

            if (!metricName || !dimension) {
                throw new ValidationError('metricName and dimension are required');
            }

            const results = await multidimensionalService.getRollup(
                modelId,
                String(metricName),
                String(dimension),
                months ? String(months).split(',') : undefined
            );

            res.json({ ok: true, results });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/v1/orgs/:orgId/models/:modelId/cube/drilldown
     * Drilldown into a specific dimension
     */
    drilldown: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { modelId } = req.params;
            const { metricName, dimensionType, memberId, targetDimension } = req.query;

            if (!metricName || !dimensionType || !memberId || !targetDimension) {
                throw new ValidationError('metricName, dimensionType, memberId, and targetDimension are required');
            }

            const results = await multidimensionalService.drilldown(
                modelId,
                String(metricName),
                String(dimensionType),
                String(memberId),
                String(targetDimension)
            );

            res.json({ ok: true, results });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/v1/orgs/:orgId/models/:modelId/cube/pivot
     * Get pivot table view
     */
    getPivotTable: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { modelId } = req.params;
            const { metricName, rowDimension, colDimension, months } = req.query;

            if (!metricName || !rowDimension || !colDimension) {
                throw new ValidationError('metricName, rowDimension, and colDimension are required');
            }

            const pivot = await multidimensionalService.getPivotTable(
                modelId,
                String(metricName),
                String(rowDimension),
                String(colDimension),
                months ? String(months).split(',') : undefined
            );

            res.json({ ok: true, pivot });
        } catch (error) {
            next(error);
        }
    }
};
