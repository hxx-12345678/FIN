import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { drillDownService, DrillDownRequest } from '../services/drill-down.service';
import { ValidationError } from '../utils/errors';

export const drillDownController = {
  drillDown: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId } = req.params;
      const request: DrillDownRequest = { ...req.body, orgId };
      const result = await drillDownService.drillDown(request, req.user.id);
      res.json({ ok: true, ...result });
    } catch (error) { next(error); }
  },
  getAvailablePaths: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId } = req.params;
      const { metricType } = req.query;
      const paths = await drillDownService.getAvailablePaths(orgId, metricType as string, req.user.id);
      res.json({ ok: true, paths });
    } catch (error) { next(error); }
  },
};

