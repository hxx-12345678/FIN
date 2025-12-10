/**
 * CSV Mapping Controller
 * Handles HTTP requests for automated CSV column mapping
 */

import { Request, Response } from 'express';
import { csvMappingService, ColumnMapping } from '../services/csv-mapping.service';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

interface AutoMapRequest {
  headers: string[];
}

interface SuggestMappingRequest {
  column: string;
}

interface ValidateMappingRequest {
  csvField: string;
  internalField: string;
}

export const csvMappingController = {
  /**
   * POST /import/map
   * Automatically map CSV headers to internal fields
   */
  autoMap: async (req: Request, res: Response): Promise<void> => {
    try {
      const { headers } = req.body as AutoMapRequest;

      // Validate input
      if (!headers || !Array.isArray(headers)) {
        res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'headers must be a non-empty array of strings',
          },
        });
        return;
      }

      if (headers.length === 0) {
        res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'headers array cannot be empty',
          },
        });
        return;
      }

      // Validate all headers are strings
      for (const header of headers) {
        if (typeof header !== 'string') {
          res.status(400).json({
            ok: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'All headers must be strings',
            },
          });
          return;
        }
      }

      // Perform auto-mapping
      const result = csvMappingService.autoMap(headers);

      logger.info(`Auto-mapped ${result.mappings.length} columns from ${headers.length} headers`);

      res.status(200).json({
        ok: true,
        data: {
          mappings: result.mappings.map(m => ({
            csv_field: m.csvField,
            internal_field: m.internalField,
            confidence: m.confidence,
            method: m.method,
            category: m.category,
          })),
          unmapped_columns: result.unmappedColumns,
          overall_confidence: result.overallConfidence,
          method: result.method,
        },
      });
    } catch (error: any) {
      logger.error(`Error in auto-map: ${error.message}`, error);

      if (error instanceof ValidationError) {
        res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to map CSV columns',
        },
      });
    }
  },

  /**
   * POST /import/map/suggest
   * Get mapping suggestions for a single column
   */
  suggestMapping: async (req: Request, res: Response): Promise<void> => {
    try {
      const { column } = req.body as SuggestMappingRequest;

      if (!column || typeof column !== 'string') {
        res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'column must be a non-empty string',
          },
        });
        return;
      }

      const suggestions = csvMappingService.suggestMapping(column);

      res.status(200).json({
        ok: true,
        data: {
          column,
          suggestions: suggestions.map(s => ({
            internal_field: s.internalField,
            confidence: s.confidence,
            method: s.method,
            category: s.category,
          })),
        },
      });
    } catch (error: any) {
      logger.error(`Error in suggest-mapping: ${error.message}`, error);

      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get mapping suggestions',
        },
      });
    }
  },

  /**
   * POST /import/map/validate
   * Validate a manual mapping
   */
  validateMapping: async (req: Request, res: Response): Promise<void> => {
    try {
      const { csvField, internalField } = req.body as ValidateMappingRequest;

      if (!csvField || typeof csvField !== 'string') {
        res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'csvField must be a non-empty string',
          },
        });
        return;
      }

      if (!internalField || typeof internalField !== 'string') {
        res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'internalField must be a non-empty string',
          },
        });
        return;
      }

      const validation = csvMappingService.validateMapping(csvField, internalField);

      res.status(200).json({
        ok: true,
        data: {
          valid: validation.valid,
          confidence: validation.confidence,
          category: validation.category,
        },
      });
    } catch (error: any) {
      logger.error(`Error in validate-mapping: ${error.message}`, error);

      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate mapping',
        },
      });
    }
  },
};


