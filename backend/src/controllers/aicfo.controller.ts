import { Response, NextFunction } from 'express';
import { aicfoService } from '../services/aicfo.service';
import { ValidationError, NotFoundError } from '../utils/errors';
import { AuthRequest } from '../middlewares/auth';

import { ApplyPlanSchema } from '../validators/aicfo.validator';

export const aicfoController = {
  /**
   * POST /api/v1/orgs/:orgId/ai-plans/apply - Apply plan changes
   */
  applyPlan: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { planId, changes } = ApplyPlanSchema.parse(req.body);

      const result = await aicfoService.applyPlan(orgId, req.user.id, {
        planId,
        changes,
      });

      res.status(201).json({
        ok: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orgs/:orgId/ai-plans - Generate AI-CFO plan
   */
  generatePlan: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { modelRunId, goal, constraints } = req.body;

      if (!goal) {
        throw new ValidationError('goal is required');
      }

      const plan = await aicfoService.generatePlan(
        orgId,
        req.user.id,
        {
          modelRunId,
          goal,
          constraints,
        }
      );

      res.status(201).json({
        ok: true,
        plan,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/ai-plans - List AI-CFO plans
   */
  listPlans: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const status = req.query.status as string | undefined;

      const plans = await aicfoService.listPlans(orgId, req.user.id, status);

      res.json({
        ok: true,
        plans,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/ai-plans/:planId - Get AI-CFO plan
   */
  getPlan: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { planId } = req.params;
      const plan = await aicfoService.getPlan(planId, req.user.id);

      res.json({
        ok: true,
        plan,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/ai-plans/:planId - Update AI-CFO plan
   */
  updatePlan: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { planId } = req.params;
      const updateData = req.body;

      const plan = await aicfoService.updatePlan(planId, req.user.id, updateData);

      res.json({
        ok: true,
        plan,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/ai-plans/:planId - Delete AI-CFO plan
   */
  deletePlan: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { planId } = req.params;
      await aicfoService.deletePlan(planId, req.user.id);

      res.json({
        ok: true,
        message: 'Plan deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/prompts/:promptId - Get prompt details (AUDITABILITY)
   */
  getPrompt: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { promptId } = req.params;
      const prompt = await aicfoService.getPrompt(promptId, req.user.id);

      res.json({
        ok: true,
        prompt,
      });
    } catch (error) {
      next(error);
    }
  },
};


