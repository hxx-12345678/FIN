import { Router } from 'express';
import { headcountPlanningController } from '../controllers/headcount-planning.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess, requireFinanceOrAdmin } from '../middlewares/rbac';

const router = Router();

router.post('/orgs/:orgId/headcount-plans', authenticate, requireFinanceOrAdmin('orgId'), headcountPlanningController.createPlan);
router.put('/orgs/:orgId/headcount-plans/:planId', authenticate, requireFinanceOrAdmin('orgId'), headcountPlanningController.updatePlan);
router.delete('/orgs/:orgId/headcount-plans/:planId', authenticate, requireFinanceOrAdmin('orgId'), headcountPlanningController.deletePlan);
router.get('/orgs/:orgId/headcount-plans/forecast', authenticate, requireOrgAccess('orgId'), headcountPlanningController.getForecast);
router.get('/orgs/:orgId/headcount-plans/departments', authenticate, requireOrgAccess('orgId'), headcountPlanningController.getDepartmentSummary);
router.get('/orgs/:orgId/headcount-plans', authenticate, requireOrgAccess('orgId'), headcountPlanningController.getPlans);

export default router;
