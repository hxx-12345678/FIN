import { Router } from 'express';
import { monteCarloController } from '../controllers/montecarlo.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/models/:model_id/montecarlo', authenticate, monteCarloController.createMonteCarlo);
router.get('/montecarlo/:jobId', authenticate, monteCarloController.getMonteCarlo);

export default router;

