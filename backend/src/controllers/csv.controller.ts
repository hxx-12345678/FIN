import { Response, NextFunction } from 'express';
import { csvService } from '../services/csv.service';
import { dataQualityService } from '../services/data-quality.service';
import { ValidationError } from '../utils/errors';
import { AuthRequest } from '../middlewares/auth';

export const csvController = {
  uploadCsv: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      console.log('📥 CSV uploadCsv endpoint called');
      console.log('Request params:', { orgId: req.params.orgId, userId: req.user?.id });
      console.log('File present:', !!req.file, 'File name:', req.file?.originalname);
      
      if (!req.user) {
        console.error('❌ User not authenticated');
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const file = req.file;

      if (!file) {
        console.error('❌ No file in request');
        throw new ValidationError('No file uploaded');
      }

      console.log('✅ Calling csvService.uploadCsv...', {
        orgId,
        userId: req.user.id,
        fileName: file.originalname,
        fileSize: file.size
      });
      
      const result = await csvService.uploadCsv(orgId, req.user.id, file);

      console.log('✅ Upload successful:', result);

      res.status(201).json({
        ok: true,
        data: result,
      });
    } catch (error: any) {
      console.error('❌ Error in uploadCsv controller:', error);
      console.error('Error message:', error.message);
      next(error);
    }
  },

  mapCsv: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      console.log('📥 CSV mapCsv endpoint called');
      console.log('Request params:', { orgId: req.params.orgId, userId: req.user?.id });
      console.log('Request body keys:', Object.keys(req.body));
      
      if (!req.user) {
        console.error('❌ User not authenticated');
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { uploadKey, mappings, dateFormat, currency, defaultCategory, initialCash, initialCustomers, fileHash } = req.body;

      console.log('Parsed request data:', {
        uploadKey,
        mappingsCount: mappings ? Object.keys(mappings).length : 0,
        dateFormat,
        currency,
        defaultCategory,
        initialCash,
        initialCustomers,
      });

      if (!uploadKey || !mappings) {
        console.error('❌ Missing required fields:', { hasUploadKey: !!uploadKey, hasMappings: !!mappings });
        throw new ValidationError('uploadKey and mappings are required');
      }

      console.log('✅ Calling csvService.mapCsv...');
      const result = await csvService.mapCsv(
        orgId,
        req.user.id,
        uploadKey,
        mappings,
        dateFormat,
        currency,
        defaultCategory,
        initialCash,
        initialCustomers,
        fileHash
      );

      console.log('✅ csvService.mapCsv completed:', result);

      res.status(201).json({
        ok: true,
        data: result,
      });
    } catch (error: any) {
      console.error('❌ Error in mapCsv controller:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      next(error);
    }
  },

  autoMap: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { uploadKey, sampleRowsS3Key } = req.body;

      if (!uploadKey) {
        throw new ValidationError('uploadKey is required');
      }

      const result = await csvService.autoMap(orgId, req.user.id, uploadKey, sampleRowsS3Key);

      res.json({
        ok: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  saveMappingTemplate: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { name, templateJson } = req.body;

      if (!name || !templateJson) {
        throw new ValidationError('name and templateJson are required');
      }

      const result = await csvService.saveMappingTemplate(orgId, req.user.id, name, templateJson);

      res.status(201).json({
        ok: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /** 
   * Validate CSV data quality before import
   * Runs schema validation, period detection, and outlier detection
   */
  validateData: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { headers, rows, mappings } = req.body;

      if (!headers || !rows || !mappings) {
        throw new ValidationError('headers, rows, and mappings are required');
      }

      const report = dataQualityService.runFullValidation(headers, rows, mappings);

      res.json({
        ok: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  },
};

