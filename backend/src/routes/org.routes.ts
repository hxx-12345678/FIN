import { Router } from 'express';
import { orgController } from '../controllers/org.controller';
import { authenticate } from '../middlewares/auth';
import { requireAdmin, requireOrgAccess } from '../middlewares/rbac';

const router = Router();

// Get organization
router.get('/:id', authenticate, requireOrgAccess('id'), orgController.getOrg);

// Invite user (admin only)
router.post('/:id/invite', authenticate, requireAdmin('id'), orgController.invite);

// Update user role (admin only)
router.post('/:id/roles', authenticate, requireAdmin('id'), orgController.updateRole);

// Access requests (admin only)
router.get('/:id/access-requests', authenticate, requireAdmin('id'), orgController.listAccessRequests);
router.post('/:id/access-requests/:requestId/approve', authenticate, requireAdmin('id'), orgController.approveAccessRequest);
router.post('/:id/access-requests/:requestId/reject', authenticate, requireAdmin('id'), orgController.rejectAccessRequest);

export default router;

