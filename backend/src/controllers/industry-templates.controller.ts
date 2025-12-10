/**
 * Industry Templates Controller
 * Provides endpoints for industry template management
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { industryTemplatesService } from '../services/industry-templates.service';
import { ValidationError } from '../utils/errors';

export const industryTemplatesController = {
  /**
   * GET /api/v1/industry-templates
   * Get all available industry templates
   */
  getTemplates: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const templates = industryTemplatesService.getTemplates();
      res.json({
        ok: true,
        templates,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/industry-templates/:templateId
   * Get a specific template by ID
   */
  getTemplateById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { templateId } = req.params;
      const template = industryTemplatesService.getTemplateById(templateId);

      if (!template) {
        throw new ValidationError(`Template not found: ${templateId}`);
      }

      res.json({
        ok: true,
        template,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/industry-templates/industry/:industry
   * Get template by industry name
   */
  getTemplateByIndustry: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { industry } = req.params;
      const template = industryTemplatesService.getTemplateByIndustry(industry);

      if (!template) {
        throw new ValidationError(`Template not found for industry: ${industry}`);
      }

      res.json({
        ok: true,
        template,
      });
    } catch (error) {
      next(error);
    }
  },
};

