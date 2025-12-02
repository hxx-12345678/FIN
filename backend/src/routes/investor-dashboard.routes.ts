import { Router } from 'express';
import { investorDashboardController } from '../controllers/investor-dashboard.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Get investor dashboard data
router.get('/orgs/:orgId/investor-dashboard', authenticate, investorDashboardController.getDashboard);

export default router;


