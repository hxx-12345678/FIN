import { Router } from 'express';
import { modelController } from '../controllers/model.controller';
import { monteCarloController } from '../controllers/montecarlo.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess, requireFinanceOrAdmin } from '../middlewares/rbac';

const router = Router();

router.post('/orgs/:org_id/models', authenticate, requireFinanceOrAdmin('org_id'), modelController.createModel);
router.get('/orgs/:org_id/models', authenticate, requireOrgAccess('org_id'), modelController.getModels);
router.delete('/orgs/:org_id/models/:model_id', authenticate, requireFinanceOrAdmin('org_id'), modelController.deleteModel);

// Monte Carlo routes must come BEFORE /models/:model_id to prevent route conflicts
// More specific routes should be registered first
router.get('/models/:model_id/montecarlo', authenticate, monteCarloController.listMonteCarlo);
router.post('/models/:model_id/montecarlo', authenticate, monteCarloController.createMonteCarlo);

router.get('/models/:model_id', authenticate, modelController.getModel);
router.patch('/models/:model_id', authenticate, modelController.updateModel);
router.get('/models/:model_id/runs', authenticate, modelController.getModelRuns);
router.post('/models/:model_id/run', authenticate, modelController.createModelRun);
router.get('/models/:model_id/runs/:run_id', authenticate, modelController.getModelRun);

// Snapshot & Compare routes
router.post('/models/:model_id/snapshot', authenticate, modelController.createSnapshot);
router.get('/models/:model_id/snapshots', authenticate, modelController.getSnapshots);
router.delete('/models/:model_id/snapshots/:run_id', authenticate, modelController.deleteSnapshot);
router.get('/models/:model_id/compare', authenticate, modelController.compareRuns);

// Provenance route (matches frontend expected path)
router.get('/orgs/:org_id/models/:model_id/runs/:run_id/provenance/:cell', authenticate, async (req, res, next) => {
  try {
    const { run_id, cell } = req.params;
    // Redirect to the provenance controller with query parameters
    req.query = {
      model_run_id: run_id,
      cell: decodeURIComponent(cell),
      ...req.query,
    };
    const { provenanceController } = await import('../controllers/provenance.controller');
    return provenanceController.getProvenance(req as any, res, next);
  } catch (error) {
    next(error);
  }
});

export default router;

