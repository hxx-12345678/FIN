import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { headcountPlanningService, CreateHeadcountPlanRequest } from '../services/headcount-planning.service';
import { ValidationError } from '../utils/errors';

export const headcountPlanningController = {
  createPlan: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId } = req.params;
      const request: CreateHeadcountPlanRequest = { ...req.body, orgId };
      const plan = await headcountPlanningService.createPlan(request, req.user.id);
      res.status(201).json({ ok: true, plan });
    } catch (error) { next(error); }
  },
  getForecast: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId } = req.params;
      const months = parseInt(req.query.months as string) || 12;
      const forecast = await headcountPlanningService.getForecast(orgId, req.user.id, months);
      res.json({ ok: true, forecast });
    } catch (error) { next(error); }
  },
  getPlans: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId } = req.params;
      const plans = await headcountPlanningService.getPlans(orgId, req.user.id);
      res.json({ ok: true, plans });
    } catch (error) { next(error); }
  },
};

