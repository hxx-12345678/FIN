import { Router } from 'express';
import { aiSummariesController } from '../controllers/ai-summaries.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess } from '../middlewares/rbac';
import { rateLimit } from '../middlewares/rateLimit';

const router = Router();

// Generate AI summary
router.post('/orgs/:orgId/ai-summaries', authenticate, requireOrgAccess('orgId'), rateLimit(20), aiSummariesController.generateSummary);

// Get cached summary
router.get('/orgs/:orgId/ai-summaries/:reportType', authenticate, requireOrgAccess('orgId'), aiSummariesController.getCachedSummary);

export default router;

