import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { consolidationService } from '../services/consolidation.service';
import { ValidationError } from '../utils/errors';

export const consolidationController = {
  // Entity CRUD
  createEntity: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId } = req.params;
      const entity = await consolidationService.createEntity(orgId, req.user.id, req.body);
      res.status(201).json({ ok: true, entity });
    } catch (error) { next(error); }
  },

  listEntities: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId } = req.params;
      const entities = await consolidationService.listEntities(orgId, req.user.id);
      res.json({ ok: true, entities });
    } catch (error) { next(error); }
  },

  updateEntity: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId, entityId } = req.params;
      const entity = await consolidationService.updateEntity(orgId, entityId, req.user.id, req.body);
      res.json({ ok: true, entity });
    } catch (error) { next(error); }
  },

  deleteEntity: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId, entityId } = req.params;
      await consolidationService.deleteEntity(orgId, entityId, req.user.id);
      res.json({ ok: true, message: 'Entity deactivated' });
    } catch (error) { next(error); }
  },

  // Consolidation
  runConsolidation: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId } = req.params;
      const result = await consolidationService.runConsolidation(orgId, req.user.id, req.body);
      res.json({ ok: true, ...result });
    } catch (error) { next(error); }
  },

  getSummary: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError('User not authenticated');
      const { orgId } = req.params;
      const summary = await consolidationService.getSummary(orgId, req.user.id);
      res.json({ ok: true, ...summary });
    } catch (error) { next(error); }
  },
};
