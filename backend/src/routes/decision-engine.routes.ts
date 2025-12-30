import { Router } from 'express';
import { decisionEngineController } from '../controllers/decision-engine.controller';
import { authenticate } from '../middlewares/auth';
import { requireFinanceOrAdmin } from '../middlewares/rbac';

const router = Router();

/**
 * @route POST /api/v1/orgs/:orgId/decision-impact
 * @desc Get instant financial impact of a hypothetical change
 * @access Private (Admin, Finance)
 */
router.post(
  '/orgs/:orgId/decision-impact',
  authenticate,
  requireFinanceOrAdmin('orgId'),
  decisionEngineController.getImpact
);

/**
 * @route POST /api/v1/orgs/:orgId/decision-snapshots
 * @desc Create a permanent shareable snapshot of a decision
 */
router.post(
  '/orgs/:orgId/decision-snapshots',
  authenticate,
  requireFinanceOrAdmin('orgId'),
  decisionEngineController.createSnapshot
);

/**
 * @route GET /api/v1/public/snapshots/:token
 * @desc Public endpoint to view a board snapshot
 */
router.get(
  '/public/snapshots/:token',
  decisionEngineController.getPublicSnapshot
);

export default router;

