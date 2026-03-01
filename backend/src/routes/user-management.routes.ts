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
  requireOrgAccess('orgId', 'admin'),
  userManagementController.updateUserRole
);

router.put(
  '/orgs/:orgId/users/:userId/status',
  authenticate,
  requireOrgAccess('orgId', 'admin'),
  userManagementController.toggleUserStatus
);

router.delete(
  '/orgs/:orgId/users/:userId',
  authenticate,
  requireOrgAccess('orgId', 'admin'),
  userManagementController.removeUser
);

// Invitations
router.post(
  '/orgs/:orgId/users/invite',
  authenticate,
  requireOrgAccess('orgId', 'admin'),
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
  requireOrgAccess('orgId', 'admin'),
  userManagementController.resendInvitation
);

router.delete(
  '/orgs/:orgId/invitations/:invitationId',
  authenticate,
  requireOrgAccess('orgId', 'admin'),
  userManagementController.cancelInvitation
);

// Activity Log
router.get(
  '/orgs/:orgId/activity',
  authenticate,
  requireOrgAccess('orgId'),
  userManagementController.getActivityLog
);

// Roles and Permissions (global system endpoints)
router.get('/system/roles', authenticate, userManagementController.getRoles);
router.get('/system/permissions', authenticate, userManagementController.getPermissions);
router.put('/system/roles/:roleId', authenticate, requireOrgAccess('orgId', 'admin'), userManagementController.updateRolePermissions);

export default router;

