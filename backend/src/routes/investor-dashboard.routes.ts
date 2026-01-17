import { Router } from 'express';
import { investorDashboardController } from '../controllers/investor-dashboard.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess } from '../middlewares/rbac';

const router = Router();

// Get investor dashboard data - requires org access
router.get('/orgs/:orgId/investor-dashboard', authenticate, requireOrgAccess('orgId'), investorDashboardController.getDashboard);

export default router;


