import { Router } from 'express';
import { headcountPlanningController } from '../controllers/headcount-planning.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess, requireFinanceOrAdmin } from '../middlewares/rbac';
import { rateLimit } from '../middlewares/rateLimit';

const router = Router();
router.post('/orgs/:orgId/headcount-plans', authenticate, requireFinanceOrAdmin('orgId'), rateLimit(20), headcountPlanningController.createPlan);
router.get('/orgs/:orgId/headcount-plans/forecast', authenticate, requireOrgAccess('orgId'), headcountPlanningController.getForecast);
router.get('/orgs/:orgId/headcount-plans', authenticate, requireOrgAccess('orgId'), headcountPlanningController.getPlans);
export default router;

