import { Router } from 'express';
import { scenarioController } from '../controllers/scenario.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// List scenarios
router.get('/models/:model_id/scenarios', authenticate, scenarioController.getScenarios);

// Create scenario snapshot
router.post('/models/:model_id/scenarios', authenticate, scenarioController.createScenario);

// Update scenario
router.put('/scenarios/:run_id', authenticate, scenarioController.updateScenario);

// Delete scenario
router.delete('/scenarios/:run_id', authenticate, scenarioController.deleteScenario);

// Get scenario comparison
router.get('/scenarios/:run_id/comparison', authenticate, scenarioController.getScenarioComparison);

export default router;


