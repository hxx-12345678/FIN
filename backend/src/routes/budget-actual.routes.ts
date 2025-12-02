import { Router } from 'express';
import { budgetActualController } from '../controllers/budget-actual.controller';
import { budgetController } from '../controllers/budget.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess } from '../middlewares/rbac';

const router = Router();

// Get budget vs actual data (simple endpoint without modelId)
// Note: Access check is done in controller to allow proper 404 for non-existent orgs
router.get(
  '/orgs/:orgId/budget-actual',
  authenticate,
  budgetActualController.getBudgetActualSimple
);

// Get budget vs actual data (with modelId - for backward compatibility)
router.get(
  '/orgs/:orgId/models/:modelId/budget-actual',
  authenticate,
  // requireOrgAccess removed - controller already checks access
  budgetActualController.getBudgetActual
);

// Budget management routes
router.post(
  '/orgs/:orgId/budgets',
  authenticate,
  requireOrgAccess,
  budgetController.upsertBudgets
);

router.get(
  '/orgs/:orgId/budgets',
  authenticate,
  requireOrgAccess,
  budgetController.getBudgets
);

router.get(
  '/orgs/:orgId/budgets/summary',
  authenticate,
  requireOrgAccess,
  budgetController.getBudgetSummary
);

router.delete(
  '/orgs/:orgId/budgets/:budgetId',
  authenticate,
  requireOrgAccess,
  budgetController.deleteBudget
);

router.delete(
  '/orgs/:orgId/budgets',
  authenticate,
  requireOrgAccess,
  budgetController.deleteBudgets
);

export default router;

