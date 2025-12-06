/**
 * FORMULA AUTOCOMPLETE CONTROLLER
 * Handles HTTP requests for formula autocomplete
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { formulaAutocompleteService, AutocompleteRequest } from '../services/formula-autocomplete.service';
import { ValidationError } from '../utils/errors';

export const formulaAutocompleteController = {
  /**
   * Get formula suggestions
   * GET /api/v1/formulas/suggestions
   */
  getSuggestions: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { context, partialFormula, modelType, category, existingFormulas } = req.query;

      const request: AutocompleteRequest = {
        context: context as string || '',
        partialFormula: partialFormula as string,
        modelType: modelType as any,
        category: category as string,
        existingFormulas: existingFormulas ? (existingFormulas as string).split(',') : undefined,
      };

      const result = await formulaAutocompleteService.getSuggestions(request);

      res.json({
        ok: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Validate a formula
   * POST /api/v1/formulas/validate
   */
  validateFormula: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { formula } = req.body;

      if (!formula) {
        throw new ValidationError('Formula is required');
      }

      const validation = formulaAutocompleteService.validateFormula(formula);

      res.json({
        ok: true,
        ...validation,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get formula by name
   * GET /api/v1/formulas/:formulaName
   */
  getFormula: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { formulaName } = req.params;

      const formula = formulaAutocompleteService.getFormula(formulaName);

      if (!formula) {
        return res.status(404).json({
          ok: false,
          error: 'Formula not found',
        });
      }

      res.json({
        ok: true,
        formula,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get formulas by category
   * GET /api/v1/formulas/category/:category
   */
  getFormulasByCategory: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { category } = req.params;

      const validCategories = ['revenue', 'expense', 'calculation', 'ratio', 'forecast', 'custom'];
      if (!validCategories.includes(category)) {
        throw new ValidationError(`Category must be one of: ${validCategories.join(', ')}`);
      }

      const formulas = formulaAutocompleteService.getFormulasByCategory(category);

      res.json({
        ok: true,
        formulas,
      });
    } catch (error) {
      next(error);
    }
  },
};

