import { Router } from 'express';
import { realtimeSimulationController } from '../controllers/realtime-simulation.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Get or create simulation
router.get('/orgs/:orgId/realtime-simulations', authenticate, realtimeSimulationController.getSimulation);

// Create or update simulation
router.post('/orgs/:orgId/realtime-simulations', authenticate, realtimeSimulationController.createOrUpdateSimulation);

// Toggle simulation run state
router.post('/orgs/:orgId/realtime-simulations/:simulationId/run', authenticate, realtimeSimulationController.toggleSimulation);

// Get initial values from model
router.get('/orgs/:orgId/realtime-simulations/initial-values', authenticate, realtimeSimulationController.getInitialValues);

export default router;


