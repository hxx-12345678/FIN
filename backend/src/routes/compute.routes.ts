import { Router } from 'express';
import { computeController } from '../controllers/compute.controller';
import { authenticate } from '../middlewares/auth';
import { requireModelOwnership } from '../middlewares/rbac';

const router = Router();

// Financial Reasoning & Simulation routes
router.post('/reasoning', authenticate, requireModelOwnership('modelId'), computeController.getReasoning);
router.post('/scenario', authenticate, requireModelOwnership('modelId'), computeController.simulateScenario);

export default router;
