import { Router } from 'express';
import { modelController } from '../controllers/model.controller';
import { monteCarloController } from '../controllers/montecarlo.controller';
import { hyperblockController } from '../controllers/hyperblock.controller';
import { multidimensionalController } from '../controllers/multidimensional.controller';
import { forecastingController } from '../controllers/forecasting.controller';
import { riskController } from '../controllers/risk.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess, requireFinanceOrAdmin } from '../middlewares/rbac';

const router = Router();

router.post('/orgs/:org_id/models', authenticate, requireFinanceOrAdmin('org_id'), modelController.createModel);
router.get('/orgs/:org_id/models', authenticate, requireOrgAccess('org_id'), modelController.getModels);
router.delete('/orgs/:org_id/models/:model_id', authenticate, requireFinanceOrAdmin('org_id'), modelController.deleteModel);

// Monte Carlo routes must come BEFORE /models/:model_id to prevent route conflicts
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

// Driver & Scenario routes
router.get('/orgs/:org_id/models/:model_id/drivers', authenticate, requireOrgAccess('org_id'), modelController.getDrivers);
router.post('/orgs/:org_id/models/:model_id/drivers', authenticate, requireFinanceOrAdmin('org_id'), modelController.upsertDriver);
router.get('/orgs/:org_id/models/:model_id/scenarios', authenticate, requireOrgAccess('org_id'), modelController.getScenarios);
router.post('/orgs/:org_id/models/:model_id/scenarios/:scenario_id/drivers/:driver_id/values', authenticate, requireFinanceOrAdmin('org_id'), modelController.updateDriverValues);

// Hyperblock engine routes
router.post('/orgs/:orgId/models/:modelId/recompute', authenticate, requireOrgAccess('orgId'), hyperblockController.recompute);
router.get('/orgs/:orgId/models/:modelId/traces', authenticate, requireOrgAccess('orgId'), hyperblockController.getTraces);

// Multidimensional / Hypercube routes
router.post('/orgs/:orgId/models/:modelId/dimensions/init', authenticate, requireFinanceOrAdmin('orgId'), multidimensionalController.initializeDimensions);
router.get('/orgs/:orgId/models/:modelId/dimensions', authenticate, requireOrgAccess('orgId'), multidimensionalController.getDimensions);
router.post('/orgs/:orgId/dimensions/:dimensionId/members', authenticate, requireFinanceOrAdmin('orgId'), multidimensionalController.addDimensionMember);
router.post('/orgs/:orgId/models/:modelId/cube', authenticate, requireFinanceOrAdmin('orgId'), multidimensionalController.setCubeValue);
router.post('/orgs/:orgId/models/:modelId/cube/query', authenticate, requireOrgAccess('orgId'), multidimensionalController.queryCube);
router.get('/orgs/:orgId/models/:modelId/cube/rollup', authenticate, requireOrgAccess('orgId'), multidimensionalController.getRollup);
router.get('/orgs/:orgId/models/:modelId/cube/drilldown', authenticate, requireOrgAccess('orgId'), multidimensionalController.drilldown);
router.get('/orgs/:orgId/models/:modelId/cube/pivot', authenticate, requireOrgAccess('orgId'), multidimensionalController.getPivotTable);

// Forecasting routes
router.post('/orgs/:orgId/models/:modelId/forecast', authenticate, requireOrgAccess('orgId'), forecastingController.forecastMetric);
router.post('/orgs/:orgId/models/:modelId/backtest', authenticate, requireOrgAccess('orgId'), forecastingController.backtestMetric);

// Risk routes
router.post('/orgs/:orgId/models/:modelId/risk', authenticate, requireOrgAccess('orgId'), riskController.analyzeRisk);

// Provenance route (matches frontend expected path)
router.get('/orgs/:org_id/models/:model_id/runs/:run_id/provenance/:cell', authenticate, async (req, res, next) => {
  try {
    const { run_id, cell } = req.params;
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
