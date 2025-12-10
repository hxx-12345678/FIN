/**
 * Onboarding Controller
 * Handles HTTP requests for onboarding workflow
 */

import { Request, Response } from 'express';
import { onboardingService, StartOnboardingParams, UpdateStepParams } from '../services/onboarding.service';
import { ValidationError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middlewares/auth';

export const onboardingController = {
  /**
   * POST /onboarding/start
   * Start onboarding workflow
   */
  startOnboarding: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const params: StartOnboardingParams = {
        orgId: req.body.orgId,
        initialData: req.body.initialData,
      };

      const result = await onboardingService.startOnboarding(req.user.id, params);

      res.status(200).json({
        ok: true,
        data: {
          currentStep: result.currentStep,
          completedSteps: result.completedSteps,
          stepData: result.stepData,
          startedAt: result.startedAt,
          updatedAt: result.updatedAt,
        },
      });
    } catch (error: any) {
      logger.error(`Error starting onboarding: ${error.message}`, error);

      if (error instanceof ValidationError || error instanceof NotFoundError) {
        res.status(error.statusCode).json({
          ok: false,
          error: {
            code: error.constructor.name,
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to start onboarding',
        },
      });
    }
  },

  /**
   * PATCH /onboarding/step
   * Update onboarding step
   */
  updateStep: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const { stepId, stepData, moveToStep } = req.body;

      if (!stepId) {
        res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'stepId is required',
          },
        });
        return;
      }

      if (!stepData) {
        res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'stepData is required',
          },
        });
        return;
      }

      const params: UpdateStepParams = {
        stepId,
        stepData,
        moveToStep,
      };

      const result = await onboardingService.updateStep(req.user.id, params);

      res.status(200).json({
        ok: true,
        data: {
          currentStep: result.currentStep,
          completedSteps: result.completedSteps,
          stepData: result.stepData,
          updatedAt: result.updatedAt,
          completedAt: result.completedAt,
        },
      });
    } catch (error: any) {
      logger.error(`Error updating onboarding step: ${error.message}`, error);

      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({
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
          message: 'Failed to update onboarding step',
        },
      });
    }
  },

  /**
   * GET /onboarding/status
   * Get onboarding status
   */
  getStatus: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const status = await onboardingService.getStatus(req.user.id);

      res.status(200).json({
        ok: true,
        data: status,
      });
    } catch (error: any) {
      logger.error(`Error getting onboarding status: ${error.message}`, error);

      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get onboarding status',
        },
      });
    }
  },

  /**
   * POST /onboarding/rollback
   * Rollback to previous step
   */
  rollbackStep: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const { targetStepId } = req.body;

      const result = await onboardingService.rollbackStep(req.user.id, targetStepId);

      res.status(200).json({
        ok: true,
        data: {
          currentStep: result.currentStep,
          completedSteps: result.completedSteps,
          stepData: result.stepData,
          updatedAt: result.updatedAt,
        },
      });
    } catch (error: any) {
      logger.error(`Error rolling back onboarding step: ${error.message}`, error);

      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({
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
          message: 'Failed to rollback onboarding step',
        },
      });
    }
  },
};


