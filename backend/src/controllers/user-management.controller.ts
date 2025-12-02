/**
 * User Management Controller
 * API endpoints for team members, invitations, roles, and activity logs
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { userManagementService } from '../services/user-management.service';
import { ValidationError } from '../utils/errors';

export const userManagementController = {
  /**
   * GET /api/v1/orgs/:orgId/users
   * Get all team members
   */
  getTeamMembers: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const members = await userManagementService.getTeamMembers(orgId, req.user.id);

      res.json({
        ok: true,
        data: members,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orgs/:orgId/users/invite
   * Invite a user to the organization
   */
  inviteUser: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { email, role, message } = req.body;

      if (!email || !role) {
        throw new ValidationError('Email and role are required');
      }

      const invitation = await userManagementService.inviteUser(
        orgId,
        email,
        role,
        req.user.id,
        message
      );

      res.status(201).json({
        ok: true,
        data: invitation,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/invitations
   * Get all invitations
   */
  getInvitations: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const invitations = await userManagementService.getInvitations(orgId, req.user.id);

      res.json({
        ok: true,
        data: invitations,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orgs/:orgId/invitations/:invitationId/resend
   * Resend an invitation
   */
  resendInvitation: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, invitationId } = req.params;
      const invitation = await userManagementService.resendInvitation(
        orgId,
        invitationId,
        req.user.id
      );

      res.json({
        ok: true,
        data: invitation,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/orgs/:orgId/invitations/:invitationId
   * Cancel an invitation
   */
  cancelInvitation: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, invitationId } = req.params;
      await userManagementService.cancelInvitation(orgId, invitationId, req.user.id);

      res.json({
        ok: true,
        message: 'Invitation cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/orgs/:orgId/users/:userId/role
   * Update user role
   */
  updateUserRole: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, userId } = req.params;
      const { role } = req.body;

      if (!role) {
        throw new ValidationError('Role is required');
      }

      const updated = await userManagementService.updateUserRole(
        orgId,
        userId,
        role,
        req.user.id
      );

      res.json({
        ok: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/orgs/:orgId/users/:userId
   * Remove user from organization
   */
  removeUser: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, userId } = req.params;
      await userManagementService.removeUser(orgId, userId, req.user.id);

      res.json({
        ok: true,
        message: 'User removed successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/orgs/:orgId/users/:userId/status
   * Activate/Deactivate user
   */
  toggleUserStatus: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, userId } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        throw new ValidationError('isActive must be a boolean');
      }

      const updated = await userManagementService.toggleUserStatus(
        orgId,
        userId,
        isActive,
        req.user.id
      );

      res.json({
        ok: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/activity
   * Get activity log
   */
  getActivityLog: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const activities = await userManagementService.getActivityLog(orgId, req.user.id, limit);

      res.json({
        ok: true,
        data: activities,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/auth/roles
   * Get all roles
   */
  getRoles: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const roles = await userManagementService.getRoles();

      res.json({
        ok: true,
        roles,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/auth/permissions
   * Get all permissions
   */
  getPermissions: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const permissions = await userManagementService.getPermissions();

      res.json({
        ok: true,
        permissions,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/auth/roles/:roleId
   * Update role permissions
   */
  updateRolePermissions: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { roleId } = req.params;
      const { permissions } = req.body;

      if (!Array.isArray(permissions)) {
        throw new ValidationError('Permissions must be an array');
      }

      const updated = await userManagementService.updateRolePermissions(roleId, permissions);

      res.json({
        ok: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },
};

