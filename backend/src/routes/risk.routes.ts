import { Router } from 'express';
import { riskController } from '../controllers/risk.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Get risk score for Monte Carlo job
router.get('/montecarlo/:jobId/risk', authenticate, riskController.getRiskScore);

// Get risk scores for model
router.get('/models/:modelId/risk', authenticate, riskController.getModelRiskScores);

export default router;


