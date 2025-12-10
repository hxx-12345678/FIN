/**
 * Pricing Controller
 * Handles HTTP requests for pricing plans
 */

import { Request, Response } from 'express';
import { pricingService } from '../services/pricing.service';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export const pricingController = {
  /**
   * GET /pricing
   * Get all pricing plans
   */
  getPricing: async (req: Request, res: Response): Promise<void> => {
    try {
      const pricing = pricingService.getPlans();

      res.status(200).json({
        ok: true,
        data: pricing,
      });
    } catch (error: any) {
      logger.error(`Error getting pricing: ${error.message}`, error);

      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get pricing plans',
        },
      });
    }
  },

  /**
   * GET /pricing/:planId
   * Get specific pricing plan
   */
  getPlan: async (req: Request, res: Response): Promise<void> => {
    try {
      const { planId } = req.params;

      if (!planId) {
        res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'planId is required',
          },
        });
        return;
      }

      const plan = pricingService.getPlan(planId);

      if (!plan) {
        res.status(404).json({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: `Pricing plan not found: ${planId}`,
          },
        });
        return;
      }

      res.status(200).json({
        ok: true,
        data: plan,
      });
    } catch (error: any) {
      logger.error(`Error getting plan: ${error.message}`, error);

      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get pricing plan',
        },
      });
    }
  },

  /**
   * POST /pricing/check-upgrade
   * Check if upgrade path is allowed
   */
  checkUpgrade: async (req: Request, res: Response): Promise<void> => {
    try {
      const { fromPlanId, toPlanId } = req.body;

      if (!fromPlanId || !toPlanId) {
        res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'fromPlanId and toPlanId are required',
          },
        });
        return;
      }

      try {
        const result = pricingService.checkUpgradePath(fromPlanId, toPlanId);

        res.status(200).json({
          ok: true,
          data: result,
        });
      } catch (serviceError: any) {
        // Check if it's a ValidationError from the service
        if (serviceError.constructor.name === 'ValidationError' || serviceError.statusCode === 400) {
          res.status(400).json({
            ok: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: serviceError.message || 'Invalid plan ID',
            },
          });
          return;
        }
        throw serviceError; // Re-throw if not a validation error
      }
    } catch (error: any) {
      logger.error(`Error checking upgrade path: ${error.message}`, error);

      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check upgrade path',
        },
      });
    }
  },

  /**
   * POST /pricing/check-downgrade
   * Check if downgrade path is allowed with restrictions
   */
  checkDowngrade: async (req: Request, res: Response): Promise<void> => {
    try {
      const { fromPlanId, toPlanId } = req.body;

      if (!fromPlanId || !toPlanId) {
        res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'fromPlanId and toPlanId are required',
          },
        });
        return;
      }

      try {
        const result = pricingService.checkDowngradePath(fromPlanId, toPlanId);

        res.status(200).json({
          ok: true,
          data: result,
        });
      } catch (serviceError: any) {
        // Check if it's a ValidationError from the service
        if (serviceError.constructor.name === 'ValidationError' || serviceError.statusCode === 400) {
          res.status(400).json({
            ok: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: serviceError.message || 'Invalid plan ID',
            },
          });
          return;
        }
        throw serviceError; // Re-throw if not a validation error
      }
    } catch (error: any) {
      logger.error(`Error checking downgrade path: ${error.message}`, error);

      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check downgrade path',
        },
      });
    }
  },
};

