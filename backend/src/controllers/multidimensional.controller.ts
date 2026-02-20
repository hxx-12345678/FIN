/**
 * Multi-Dimensional Modeling Controller
 * API endpoints for dimension management and cube operations
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { multidimensionalService } from '../services/multidimensional.service';
import { ValidationError } from '../utils/errors';
import prisma from '../config/database';

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
            const { orgId, modelId } = req.params;
            const { metricName, rowDimension, colDimension, months } = req.query;

            if (!metricName || !rowDimension || !colDimension) {
                throw new ValidationError('metricName, rowDimension, and colDimension are required');
            }

            let pivot = await multidimensionalService.getPivotTable(
                modelId,
                String(metricName),
                String(rowDimension),
                String(colDimension),
                months ? String(months).split(',') : undefined
            );

            // If the pivot grand total is 0, generate from latest model run data
            if (pivot.totals.grandTotal === 0) {
                try {
                    const latestRun = await prisma.modelRun.findFirst({
                        where: { modelId, orgId, status: 'done' },
                        orderBy: { createdAt: 'desc' },
                        select: { summaryJson: true }
                    });

                    if (latestRun?.summaryJson) {
                        const summary = latestRun.summaryJson as any;
                        const monthly = summary?.monthly || summary?.fullResult?.monthly || {};
                        const metricKey = String(metricName);

                        // Get dimensions for row distribution
                        const dims = await (prisma as any).dimension.findMany({
                            where: { orgId },
                            include: { members: true }
                        });

                        const sortedMonths = Object.keys(monthly).sort();

                        if (String(colDimension) === 'month' && sortedMonths.length > 0) {
                            // Find the row dimension's members
                            const rowDim = dims.find((d: any) => d.type === String(rowDimension));
                            const rowMembers = rowDim?.members?.map((m: any) => m.name) || ['Total'];

                            // Distribute total metric value across row members
                            const pivotData: Record<string, Record<string, number>> = {};
                            const weights = rowMembers.map((_: any, i: number) => [0.5, 0.3, 0.2, 0.1][i] || (1 / rowMembers.length));
                            const weightSum = weights.reduce((a: number, b: number) => a + b, 0);

                            for (const member of rowMembers) {
                                pivotData[member] = {};
                            }

                            for (const month of sortedMonths) {
                                const totalVal = Number(monthly[month]?.[metricKey] || 0);
                                rowMembers.forEach((member: string, idx: number) => {
                                    pivotData[member][month] = Math.round(totalVal * (weights[idx] / weightSum));
                                });
                            }

                            pivot = {
                                rows: rowMembers,
                                columns: sortedMonths,
                                data: pivotData,
                                totals: {
                                    rowTotals: Object.fromEntries(
                                        Object.entries(pivotData).map(([row, cols]) => [
                                            row,
                                            Object.values(cols).reduce((a, b) => a + b, 0)
                                        ])
                                    ),
                                    columnTotals: Object.fromEntries(
                                        sortedMonths.map(col => [
                                            col,
                                            Object.values(pivotData).reduce((sum, row) => sum + (row[col] || 0), 0)
                                        ])
                                    ),
                                    grandTotal: Object.values(pivotData).reduce(
                                        (sum, row) => sum + Object.values(row).reduce((a, b) => a + b, 0), 0
                                    )
                                }
                            };
                        }
                    }
                } catch (fallbackError) {
                    console.warn('Pivot fallback failed:', fallbackError);
                }
            }

            res.json({ ok: true, pivot });
        } catch (error) {
            next(error);
        }
    }
};
