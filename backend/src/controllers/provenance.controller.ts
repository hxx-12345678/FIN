import { Response, NextFunction } from 'express';
import { provenanceService } from '../services/provenance.service';
import { ValidationError, UnprocessableEntityError } from '../utils/errors';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/database';

export const provenanceController = {
  /**
   * GET /api/v1/provenance?model_run_id={id}&cell={cell_key}
   */
  getProvenance: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { model_run_id: modelRunId, cell: cellKey } = req.query;

      if (!modelRunId || typeof modelRunId !== 'string') {
        throw new ValidationError('model_run_id is required');
      }

      if (!cellKey || typeof cellKey !== 'string') {
        throw new ValidationError('cell is required');
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const full = req.query.full === 'true';

      if (limit > 100) {
        throw new ValidationError('limit cannot exceed 100');
      }

      const result = await provenanceService.getProvenance(
        modelRunId,
        cellKey,
        req.user?.id || null,
        limit,
        offset,
        full
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/provenance/stream?model_run_id={id}&cell={cell_key}
   * Server-Sent Events (SSE) for large transaction lists
   */
  streamTransactions: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { model_run_id: modelRunId, cell: cellKey } = req.query;

      if (!modelRunId || typeof modelRunId !== 'string') {
        throw new ValidationError('model_run_id is required');
      }

      if (!cellKey || typeof cellKey !== 'string') {
        throw new ValidationError('cell is required');
      }

      await provenanceService.streamTransactions(
        modelRunId,
        cellKey,
        req.user.id,
        res
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/provenance/export-excel?fileHash=...&cellRef=...
   */
  exportExcel: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { fileHash, cellRef } = req.query;

      if (!fileHash || typeof fileHash !== 'string') {
        throw new ValidationError('fileHash is required');
      }

      if (!cellRef || typeof cellRef !== 'string') {
        throw new ValidationError('cellRef is required');
      }

      const result = await provenanceService.generateExcelExport(
        fileHash,
        cellRef,
        req.user.id
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/provenance/bulk?metricIds[]=id1&metricIds[]=id2&orgId=... (orgId optional)
   * Alternative: GET /api/v1/provenance/bulk?metricIds=id1,id2&orgId=...
   */
  getBulkProvenance: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { metricIds, orgId: queryOrgId } = req.query;

      // Get orgId from query param or user's primary org
      let orgId: string;
      if (queryOrgId && typeof queryOrgId === 'string') {
        orgId = queryOrgId;
      } else {
        // Get user's primary org
        const userRole = await prisma.userOrgRole.findFirst({
          where: { userId: req.user.id },
          include: { org: true },
        });

        if (!userRole) {
          throw new ValidationError('orgId is required. User has no organization access.');
        }

        orgId = userRole.orgId;
      }

      // Handle metricIds - can be array or comma-separated string
      let metricIdArray: string[] = [];
      
      if (Array.isArray(metricIds)) {
        metricIdArray = metricIds.map(id => String(id).trim()).filter(Boolean);
      } else if (typeof metricIds === 'string') {
        metricIdArray = metricIds.split(',').map(id => id.trim()).filter(Boolean);
      }

      if (metricIdArray.length === 0) {
        throw new ValidationError('metricIds is required (array or comma-separated string)');
      }

      if (metricIdArray.length > 100) {
        throw new ValidationError('Cannot query more than 100 metricIds at once');
      }

      const result = await provenanceService.getBulkProvenanceByMetrics(
        orgId,
        metricIdArray,
        req.user.id
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/provenance/search?query=...&orgId=... (orgId optional, uses user's org if not provided)
   */
  searchProvenance: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { query, orgId: queryOrgId, limit: limitParam } = req.query;

      // Validate query
      if (!query || typeof query !== 'string') {
        throw new ValidationError('query is required');
      }

      // Validate query length (minimum 2 characters)
      if (query.trim().length < 2) {
        throw new UnprocessableEntityError('query must be at least 2 characters long');
      }

      // Get orgId from query param or user's primary org
      let orgId: string;
      if (queryOrgId && typeof queryOrgId === 'string') {
        orgId = queryOrgId;
      } else {
        // Get user's primary org
        const userRole = await prisma.userOrgRole.findFirst({
          where: { userId: req.user.id },
          include: { org: true },
        });

        if (!userRole) {
          throw new ValidationError('orgId is required. User has no organization access.');
        }

        orgId = userRole.orgId;
      }

      const limit = limitParam ? parseInt(limitParam as string) : 20;
      if (isNaN(limit) || limit < 1) {
        throw new ValidationError('limit must be a positive number');
      }
      if (limit > 100) {
        throw new ValidationError('limit cannot exceed 100');
      }

      const result = await provenanceService.searchProvenance(
        orgId,
        query.trim(),
        req.user.id,
        limit
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
