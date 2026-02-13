/**
 * Multi-Dimensional Modeling Service
 * Implements Anaplan/Pigment-style hypercube data model
 */

import prisma from '../config/database';
import { ValidationError, NotFoundError } from '../utils/errors';

export interface DimensionFilter {
    dimensionType: string; // geography|product|department|segment|channel|scenario
    memberId?: string;
    memberName?: string;
}

export interface CubeQuery {
    modelId: string;
    metricName: string;
    months?: string[];
    filters?: DimensionFilter[];
    groupBy?: string[]; // Dimensions to group by for aggregation
}

export interface CubeEntry {
    metricName: string;
    month: string;
    value: number;
    dimensions: Record<string, string | null>;
}

export const multidimensionalService = {
    // =========================================================================
    // DIMENSION MANAGEMENT
    // =========================================================================

    /**
     * Create or get dimensions for a model
     */
    initializeDimensions: async (orgId: string, modelId: string) => {
        try {
            const defaultDimensions = [
                { name: 'Geography', type: 'geography' },
                { name: 'Product Line', type: 'product' },
                { name: 'Department', type: 'department' },
                { name: 'Customer Segment', type: 'segment' },
                { name: 'Channel', type: 'channel' },
            ];

            const results = [];
            for (const dim of defaultDimensions) {
                const existing = await prisma.dimension.findUnique({
                    where: {
                        orgId_modelId_name: { orgId, modelId, name: dim.name }
                    }
                });

                if (existing) {
                    results.push(existing);
                } else {
                    const created = await prisma.dimension.create({
                        data: {
                            orgId,
                            modelId,
                            name: dim.name,
                            type: dim.type,
                            displayOrder: defaultDimensions.indexOf(dim)
                        }
                    });
                    results.push(created);
                }
            }

            return results;
        } catch (error: any) {
            console.warn('initializeDimensions: table may not exist:', error.message);
            return [];
        }
    },

    /**
     * Get all dimensions for a model
     */
    getDimensions: async (modelId: string) => {
        try {
            return await prisma.dimension.findMany({
                where: { modelId },
                include: { members: true },
                orderBy: { displayOrder: 'asc' }
            });
        } catch (error: any) {
            console.warn('getDimensions: table may not exist:', error.message);
            return [];
        }
    },

    /**
     * Add a member to a dimension
     */
    addDimensionMember: async (
        dimensionId: string,
        name: string,
        code?: string,
        parentId?: string
    ) => {
        // Check if member already exists
        const existing = await prisma.dimensionMember.findUnique({
            where: { dimensionId_name: { dimensionId, name } }
        });

        if (existing) return existing;

        // Calculate level based on parent
        let level = 0;
        if (parentId) {
            const parent = await prisma.dimensionMember.findUnique({
                where: { id: parentId }
            });
            if (parent) level = parent.level + 1;
        }

        return prisma.dimensionMember.create({
            data: {
                dimensionId,
                name,
                code,
                parentId,
                level
            }
        });
    },

    // =========================================================================
    // METRIC CUBE OPERATIONS
    // =========================================================================

    /**
     * Set a value in the metric cube
     */
    setCubeValue: async (
        orgId: string,
        modelId: string,
        metricName: string,
        month: string,
        value: number,
        dimensions: {
            geographyId?: string;
            productId?: string;
            departmentId?: string;
            segmentId?: string;
            channelId?: string;
            scenarioId?: string;
        }
    ) => {
        // Upsert the cube value
        // For simplicity, we'll create a new entry (in production, use composite unique key)
        return prisma.metricCube.create({
            data: {
                orgId,
                modelId,
                metricName,
                month,
                value,
                ...dimensions
            }
        });
    },

    /**
     * Query the metric cube with optional filters and aggregation
     */
    queryCube: async (query: CubeQuery) => {
        try {
            const { modelId, metricName, months, filters, groupBy } = query;

            // Build where clause
            const where: any = {
                modelId,
                metricName
            };

            if (months && months.length > 0) {
                where.month = { in: months };
            }

            // Apply dimension filters
            if (filters) {
                for (const filter of filters) {
                    const fieldMap: Record<string, string> = {
                        geography: 'geographyId',
                        product: 'productId',
                        department: 'departmentId',
                        segment: 'segmentId',
                        channel: 'channelId',
                        scenario: 'scenarioId'
                    };
                    const field = fieldMap[filter.dimensionType];
                    if (field && filter.memberId) {
                        where[field] = filter.memberId;
                    }
                }
            }

            // Fetch raw data
            const data = await prisma.metricCube.findMany({
                where,
                include: {
                    geography: true
                },
                orderBy: { month: 'asc' }
            });

            // If groupBy is specified, perform aggregation
            if (groupBy && groupBy.length > 0) {
                return multidimensionalService.aggregateCubeData(data, groupBy);
            }

            return data;
        } catch (error: any) {
            console.warn('queryCube: table may not exist:', error.message);
            return [];
        }
    },

    /**
     * Aggregate cube data by specified dimensions
     */
    aggregateCubeData: (data: any[], groupBy: string[]) => {
        const aggregations: Record<string, { sum: number; count: number; entries: any[] }> = {};

        for (const entry of data) {
            // Build aggregation key
            const keyParts = groupBy.map(dim => {
                const fieldMap: Record<string, string> = {
                    geography: 'geographyId',
                    product: 'productId',
                    department: 'departmentId',
                    segment: 'segmentId',
                    channel: 'channelId',
                    scenario: 'scenarioId',
                    month: 'month'
                };
                return `${dim}:${entry[fieldMap[dim]] || 'ALL'}`;
            });
            const key = keyParts.join('|');

            if (!aggregations[key]) {
                aggregations[key] = { sum: 0, count: 0, entries: [] };
            }

            aggregations[key].sum += Number(entry.value);
            aggregations[key].count += 1;
            aggregations[key].entries.push(entry);
        }

        // Convert to array
        return Object.entries(aggregations).map(([key, agg]) => ({
            groupKey: key,
            dimensions: Object.fromEntries(
                key.split('|').map(part => {
                    const [dim, val] = part.split(':');
                    return [dim, val === 'ALL' ? null : val];
                })
            ),
            totalValue: agg.sum,
            count: agg.count,
            average: agg.sum / agg.count
        }));
    },

    // =========================================================================
    // ROLLUP & DRILLDOWN
    // =========================================================================

    /**
     * Get rollup (aggregated) values for a metric
     */
    getRollup: async (
        modelId: string,
        metricName: string,
        rollupDimension: string,
        months?: string[]
    ) => {
        try {
            const where: any = { modelId, metricName };
            if (months) where.month = { in: months };

            const data = await prisma.metricCube.findMany({ where });
            return multidimensionalService.aggregateCubeData(data, [rollupDimension]);
        } catch (error: any) {
            console.warn('getRollup: table may not exist:', error.message);
            return [];
        }
    },

    /**
     * Drilldown into a specific dimension member
     */
    drilldown: async (
        modelId: string,
        metricName: string,
        dimensionType: string,
        memberId: string,
        targetDimension: string
    ) => {
        try {
            const fieldMap: Record<string, string> = {
                geography: 'geographyId',
                product: 'productId',
                department: 'departmentId',
                segment: 'segmentId',
                channel: 'channelId',
                scenario: 'scenarioId'
            };

            const filterField = fieldMap[dimensionType];
            if (!filterField) throw new ValidationError(`Invalid dimension: ${dimensionType}`);

            const where: any = {
                modelId,
                metricName,
                [filterField]: memberId
            };

            const data = await prisma.metricCube.findMany({ where });
            return multidimensionalService.aggregateCubeData(data, [targetDimension]);
        } catch (error: any) {
            console.warn('drilldown: table may not exist:', error.message);
            return [];
        }
    },

    // =========================================================================
    // PIVOT TABLE OPERATIONS
    // =========================================================================

    /**
     * Generate a pivot table view
     */
    getPivotTable: async (
        modelId: string,
        metricName: string,
        rowDimension: string,
        colDimension: string,
        months?: string[]
    ) => {
        try {
            const where: any = { modelId, metricName };
            if (months) where.month = { in: months };

            const data = await prisma.metricCube.findMany({
                where,
                include: { geography: true }
            });

            const fieldMap: Record<string, string> = {
                geography: 'geographyId',
                product: 'productId',
                department: 'departmentId',
                segment: 'segmentId',
                channel: 'channelId',
                scenario: 'scenarioId',
                month: 'month'
            };

            const rowField = fieldMap[rowDimension] || rowDimension;
            const colField = fieldMap[colDimension] || colDimension;

            // Build pivot structure
            const pivot: Record<string, Record<string, number>> = {};
            const columns = new Set<string>();

            for (const entry of data) {
                const rowKey = String(entry[rowField as keyof typeof entry] || 'Unknown');
                const colKey = String(entry[colField as keyof typeof entry] || 'Unknown');

                if (!pivot[rowKey]) pivot[rowKey] = {};
                if (!pivot[rowKey][colKey]) pivot[rowKey][colKey] = 0;

                pivot[rowKey][colKey] += Number(entry.value);
                columns.add(colKey);
            }

            return {
                rows: Object.keys(pivot).sort(),
                columns: Array.from(columns).sort(),
                data: pivot,
                totals: {
                    rowTotals: Object.fromEntries(
                        Object.entries(pivot).map(([row, cols]) => [
                            row,
                            Object.values(cols).reduce((a, b) => a + b, 0)
                        ])
                    ),
                    columnTotals: Object.fromEntries(
                        Array.from(columns).map(col => [
                            col,
                            Object.values(pivot).reduce((sum, row) => sum + (row[col] || 0), 0)
                        ])
                    ),
                    grandTotal: data.reduce((sum, e) => sum + Number(e.value), 0)
                }
            };
        } catch (error: any) {
            console.warn('getPivotTable: table may not exist:', error.message);
            return { rows: [], columns: [], data: {}, totals: { rowTotals: {}, columnTotals: {}, grandTotal: 0 } };
        }
    }
};
