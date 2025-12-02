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

export default router;

