import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { dataTransformationService, TransformationRequest } from '../services/data-transformation.service';
import { ValidationError } from '../utils/errors';

export const dataTransformationController = {
  transformData: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId } = req.params;
      const request: TransformationRequest = { ...req.body, orgId };
      const result = await dataTransformationService.transformData(request, req.user.id);
      res.json({ ok: true, ...result });
    } catch (error) { next(error); }
  },
  getTemplates: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const templates = await dataTransformationService.getTemplates();
      res.json({ ok: true, templates });
    } catch (error) { next(error); }
  },
};

