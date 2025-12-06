import { Router } from 'express';
import { drillDownController } from '../controllers/drill-down.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess } from '../middlewares/rbac';
import { rateLimit } from '../middlewares/rateLimit';

const router = Router();
router.post('/orgs/:orgId/drill-down', authenticate, requireOrgAccess('orgId'), rateLimit(50), drillDownController.drillDown);
router.get('/orgs/:orgId/drill-down/paths', authenticate, requireOrgAccess('orgId'), drillDownController.getAvailablePaths);
export default router;

