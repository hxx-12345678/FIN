import { Router } from 'express';
import { userManagementController } from '../controllers/user-management.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess } from '../middlewares/rbac';

const router = Router();

// Team Members
router.get(
  '/orgs/:orgId/users',
  authenticate,
  requireOrgAccess('orgId'),
  userManagementController.getTeamMembers
);

router.put(
  '/orgs/:orgId/users/:userId/role',
  authenticate,
  requireOrgAccess('orgId'),
  userManagementController.updateUserRole
);

router.put(
  '/orgs/:orgId/users/:userId/status',
  authenticate,
  requireOrgAccess('orgId'),
  userManagementController.toggleUserStatus
);

router.delete(
  '/orgs/:orgId/users/:userId',
  authenticate,
  requireOrgAccess('orgId'),
  userManagementController.removeUser
);

// Invitations
router.post(
  '/orgs/:orgId/users/invite',
  authenticate,
  requireOrgAccess('orgId'),
  userManagementController.inviteUser
);

router.get(
  '/orgs/:orgId/invitations',
  authenticate,
  requireOrgAccess('orgId'),
  userManagementController.getInvitations
);

router.post(
  '/orgs/:orgId/invitations/:invitationId/resend',
  authenticate,
  requireOrgAccess('orgId'),
  userManagementController.resendInvitation
);

router.delete(
  '/orgs/:orgId/invitations/:invitationId',
  authenticate,
  requireOrgAccess('orgId'),
  userManagementController.cancelInvitation
);

// Activity Log
router.get(
  '/orgs/:orgId/activity',
  authenticate,
  requireOrgAccess('orgId'),
  userManagementController.getActivityLog
);

// Roles and Permissions (global endpoints)
router.get('/auth/roles', authenticate, userManagementController.getRoles);
router.get('/auth/permissions', authenticate, userManagementController.getPermissions);
router.put('/auth/roles/:roleId', authenticate, userManagementController.updateRolePermissions);

export default router;

