import { Router } from 'express';
import { semanticLayerController } from '../controllers/semantic-layer.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgRole, validateUUIDParams } from '../middlewares/rbac';

const router = Router();

router.post(
  '/orgs/:orgId/semantic-layer/promote/:batchId',
  authenticate,
  requireOrgRole('admin', 'orgId'),
  validateUUIDParams(['orgId', 'batchId']),
  semanticLayerController.promoteBatch
);

router.get(
  '/orgs/:orgId/semantic-layer/ledger',
  authenticate,
  requireOrgRole('finance', 'orgId'),
  validateUUIDParams(['orgId']),
  semanticLayerController.getLedger
);

router.post(
  '/orgs/:orgId/semantic-layer/adjustment',
  authenticate,
  requireOrgRole('admin', 'orgId'),
  validateUUIDParams(['orgId']),
  semanticLayerController.addAdjustment
);

export default router;


