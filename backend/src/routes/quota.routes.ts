import { Router } from 'express';
import { quotaController } from '../controllers/quota.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess } from '../middlewares/rbac';

const router = Router();

// Get quota usage for org
router.get('/orgs/:orgId/quota', authenticate, requireOrgAccess('orgId'), quotaController.getQuotaUsage);

export default router;

