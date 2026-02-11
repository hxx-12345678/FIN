import { Router } from 'express';
import { computeController } from '../controllers/compute.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Financial Reasoning & Simulation routes
router.post('/reasoning', authenticate, computeController.getReasoning);
router.post('/scenario', authenticate, computeController.simulateScenario);

export default router;
