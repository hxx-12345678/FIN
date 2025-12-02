import { Router } from 'express';
import { modelController } from '../controllers/model.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess, requireFinanceOrAdmin } from '../middlewares/rbac';

const router = Router();

router.post('/orgs/:org_id/models', authenticate, requireFinanceOrAdmin('org_id'), modelController.createModel);
router.get('/orgs/:org_id/models', authenticate, requireOrgAccess('org_id'), modelController.getModels);
router.delete('/orgs/:org_id/models/:model_id', authenticate, requireFinanceOrAdmin('org_id'), modelController.deleteModel);
router.get('/models/:model_id', authenticate, modelController.getModel);
router.get('/models/:model_id/runs', authenticate, modelController.getModelRuns);
router.post('/models/:model_id/run', authenticate, modelController.createModelRun);
router.get('/models/:model_id/runs/:run_id', authenticate, modelController.getModelRun);

// Snapshot & Compare routes
router.post('/models/:model_id/snapshot', authenticate, modelController.createSnapshot);
router.get('/models/:model_id/snapshots', authenticate, modelController.getSnapshots);
router.delete('/models/:model_id/snapshots/:run_id', authenticate, modelController.deleteSnapshot);
router.get('/models/:model_id/compare', authenticate, modelController.compareRuns);

export default router;

