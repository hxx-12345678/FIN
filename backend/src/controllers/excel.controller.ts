import { Response, NextFunction } from 'express';
import { excelService } from '../services/excel.service';
import { ValidationError } from '../utils/errors';
import { AuthRequest } from '../middlewares/auth';
import {
  excelMappingSchema,
  excelUploadSchema,
  excelSyncSchema,
  excelExportSchema,
  excelMergeSchema,
  uuidSchema,
  paginationSchema,
} from '../validators/excel.validator';

export const excelController = {
  /**
   * POST /api/v1/orgs/:orgId/import/xlsx
   * Upload XLSX file
   */
  uploadXlsx: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const file = req.file;

      if (!file) {
        throw new ValidationError('No file uploaded');
      }

      // Validate UUID
      uuidSchema.parse(orgId);

      const result = await excelService.uploadXlsx(orgId, req.user.id, file);

      res.status(201).json({
        ok: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orgs/:orgId/import/xlsx/map
   * Map XLSX columns and start import
   */
  mapXlsx: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { uploadKey, mappingJson, mappingId } = req.body;

      if (!uploadKey || !mappingJson) {
        throw new ValidationError('uploadKey and mappingJson are required');
      }

      // Validate UUIDs
      uuidSchema.parse(orgId);
      if (mappingId) {
        uuidSchema.parse(mappingId);
      }

      // Validate mapping structure
      excelMappingSchema.parse({ name: mappingJson.name || 'Untitled', mappingJson });

      const result = await excelService.mapXlsx(
        orgId,
        req.user.id,
        uploadKey,
        mappingJson,
        mappingId
      );

      res.status(201).json({
        ok: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/excel/mappings
   * List mapping templates
   */
  listMappings: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      uuidSchema.parse(orgId);

      const mappings = await excelService.listMappings(orgId, req.user.id);

      res.json({
        ok: true,
        data: mappings,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orgs/:orgId/excel/mappings
   * Create mapping template
   */
  createMapping: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const mappingData = excelMappingSchema.parse(req.body);

      uuidSchema.parse(orgId);

      const mapping = await excelService.createMapping(
        orgId,
        req.user.id,
        mappingData
      );

      res.status(201).json({
        ok: true,
        data: mapping,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orgs/:orgId/excel/sync
   * Create Excel sync configuration
   */
  createSync: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const syncData = excelSyncSchema.parse(req.body);

      uuidSchema.parse(orgId);

      const sync = await excelService.createSync(
        orgId,
        req.user.id,
        syncData.fileHash,
        syncData.mappingId,
        syncData.fileName
      );

      res.status(201).json({
        ok: true,
        data: sync,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/excel/syncs
   * List Excel syncs
   */
  listSyncs: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      uuidSchema.parse(orgId);

      const syncs = await excelService.listSyncs(orgId, req.user.id);

      res.json({
        ok: true,
        data: syncs,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/excel/syncs/:syncId
   * Get sync status
   */
  getSyncStatus: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, syncId } = req.params;
      uuidSchema.parse(orgId);
      uuidSchema.parse(syncId);

      const sync = await excelService.getSyncStatus(orgId, req.user.id, syncId);

      res.json({
        ok: true,
        data: sync,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orgs/:orgId/excel/export
   * Export model to XLSX
   */
  exportToXlsx: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const exportData = excelExportSchema.parse(req.body);

      uuidSchema.parse(orgId);

      const result = await excelService.exportToXlsx(
        orgId,
        req.user.id,
        exportData.modelRunId,
        exportData.mappingId
      );

      res.status(201).json({
        ok: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orgs/:orgId/excel/merge
   * Merge updated XLSX with model
   */
  mergeXlsx: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const file = req.file;
      const { fileHash, mappingId } = excelMergeSchema.parse(req.body);

      if (!file) {
        throw new ValidationError('No file uploaded');
      }

      uuidSchema.parse(orgId);

      const result = await excelService.mergeXlsx(
        orgId,
        req.user.id,
        file,
        fileHash,
        mappingId
      );

      res.status(201).json({
        ok: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};

