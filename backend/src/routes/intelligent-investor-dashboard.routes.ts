import { Router } from 'express';
import { intelligentInvestorDashboardController } from '../controllers/intelligent-investor-dashboard.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess } from '../middlewares/rbac';

const router = Router();

// Get intelligent investor dashboard data - requires org access
router.get('/orgs/:orgId/intelligent-investor-dashboard', authenticate, requireOrgAccess('orgId'), intelligentInvestorDashboardController.getDashboard);

// Live What-If recompute - requires org access
router.post('/orgs/:orgId/intelligent-investor-dashboard/recompute-what-if', authenticate, requireOrgAccess('orgId'), intelligentInvestorDashboardController.recomputeWhatIf);

export default router;
