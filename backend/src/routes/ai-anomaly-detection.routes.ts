import { Router } from 'express';
import { aiAnomalyDetectionController } from '../controllers/ai-anomaly-detection.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess } from '../middlewares/rbac';
import { rateLimit } from '../middlewares/rateLimit';

const router = Router();

// Detect anomalies
router.post('/orgs/:orgId/anomalies/detect', authenticate, requireOrgAccess('orgId'), rateLimit(10), aiAnomalyDetectionController.detectAnomalies);

// Get recent anomalies
router.get('/orgs/:orgId/anomalies', authenticate, requireOrgAccess('orgId'), aiAnomalyDetectionController.getRecentAnomalies);

export default router;

