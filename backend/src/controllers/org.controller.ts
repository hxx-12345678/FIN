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

  /**
   * GET /api/v1/orgs/:id/access-requests - List access requests (admin only)
   */
  listAccessRequests: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id: orgId } = req.params;
      const status = req.query.status as string | undefined;

      const requests = await orgService.listAccessRequests(orgId, req.user.id, status);
      res.json({ ok: true, requests });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orgs/:id/access-requests/:requestId/approve - Approve access request (admin only)
   */
  approveAccessRequest: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id: orgId, requestId } = req.params;
      const { role = 'viewer' } = req.body;

      const result = await orgService.approveAccessRequest(orgId, requestId, req.user.id, role);
      res.json({ ok: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orgs/:id/access-requests/:requestId/reject - Reject access request (admin only)
   */
  rejectAccessRequest: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id: orgId, requestId } = req.params;
      const { message } = req.body;

      await orgService.rejectAccessRequest(orgId, requestId, req.user.id, message);
      res.json({ ok: true, message: 'Access request rejected' });
    } catch (error) {
      next(error);
    }
  },
};

