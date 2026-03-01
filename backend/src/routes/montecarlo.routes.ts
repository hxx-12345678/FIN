import { Router } from 'express';
import { monteCarloController } from '../controllers/montecarlo.controller';
import { authenticate } from '../middlewares/auth';
import { requireJobOwnership } from '../middlewares/rbac';

const router = Router();

// Get specific Monte Carlo job result (GET by jobId)
// jobId can be either jobs.id or monte_carlo_jobs.id
router.get('/montecarlo/:jobId', authenticate, requireJobOwnership('jobId'), monteCarloController.getMonteCarlo);

export default router;

