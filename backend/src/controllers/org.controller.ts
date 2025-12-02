import { Response, NextFunction } from 'express';
import { orgService } from '../services/org.service';
import { ValidationError } from '../utils/errors';
import { AuthRequest } from '../middlewares/auth';

export const orgController = {
  getOrg: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id: orgId } = req.params;
      const org = await orgService.getOrg(orgId, req.user.id);
      res.json(org);
    } catch (error) {
      next(error);
    }
  },

  invite: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id: orgId } = req.params;
      const { email, role } = req.body;

      if (!email || !role) {
        throw new ValidationError('Email and role are required');
      }

      const result = await orgService.inviteUser(orgId, email, role, req.user.id);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  updateRole: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id: orgId } = req.params;
      const { userId, role } = req.body;

      if (!userId || !role) {
        throw new ValidationError('UserId and role are required');
      }

      const updated = await orgService.updateUserRole(orgId, userId, role, req.user.id);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  },
};

