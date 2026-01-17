import { Router } from 'express';
import { overviewDashboardController } from '../controllers/overview-dashboard.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess } from '../middlewares/rbac';

const router = Router();

// Get overview dashboard data
router.get(
  '/orgs/:orgId/overview',
  authenticate,
  requireOrgAccess('orgId'), // Add proper RBAC middleware
  overviewDashboardController.getOverview
);

export default router;


