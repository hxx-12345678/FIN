import { Router } from 'express';
import { monteCarloController } from '../controllers/montecarlo.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Get specific Monte Carlo job result (GET by jobId)
// This route doesn't conflict with model routes since it's /montecarlo/:jobId not /models/:model_id/...
router.get('/montecarlo/:jobId', authenticate, monteCarloController.getMonteCarlo);

export default router;

