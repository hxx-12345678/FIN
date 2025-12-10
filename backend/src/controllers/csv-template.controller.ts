/**
 * CSV Template Controller
 * Handles HTTP requests for CSV template downloads
 */

import { Request, Response } from 'express';
import { csvTemplateService } from '../services/csv-template.service';
import { isValidIndustry, IndustryType } from '../config/csv-templates.config';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export const csvTemplateController = {
  /**
   * GET /templates/csv?industry=saas|ecommerce|quickcommerce
   * Download CSV template for specified industry
   */
  downloadTemplate: async (req: Request, res: Response): Promise<void> => {
    try {
      const { industry } = req.query;

      // Validate industry parameter
      if (!industry || typeof industry !== 'string') {
        res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Industry parameter is required. Must be one of: saas, ecommerce, quickcommerce',
          },
        });
        return;
      }

      const industryLower = industry.toLowerCase().trim();

      if (!isValidIndustry(industryLower)) {
        res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid industry: ${industry}. Must be one of: saas, ecommerce, quickcommerce`,
          },
        });
        return;
      }

      // Get template
      const template = csvTemplateService.getTemplate(industryLower as IndustryType);

      // Set headers for file download
      res.setHeader('Content-Type', template.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

      // Send CSV content
      res.status(200).send(template.csvContent);

      logger.info(`CSV template downloaded: ${industryLower}`);
    } catch (error: any) {
      logger.error(`Error downloading CSV template: ${error.message}`, error);

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
          message: 'Failed to generate CSV template',
        },
      });
    }
  },
};


