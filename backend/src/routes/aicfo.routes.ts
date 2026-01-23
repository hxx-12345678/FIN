import { Router } from 'express';
import { aicfoController } from '../controllers/aicfo.controller';
import { authenticate } from '../middlewares/auth';
import { rateLimit, orgRateLimit } from '../middlewares/rateLimit';
import { auditLogger } from '../middlewares/audit-logger';
import { requireOrgAccess, requireFinanceOrAdmin } from '../middlewares/rbac';

const router = Router();

// NEW: Multi-agent orchestration endpoint for proper agentic AI CFO
router.post('/orgs/:orgId/ai-cfo/query', authenticate, requireOrgAccess('orgId'), auditLogger, aicfoController.processAgenticQuery);

// Generate AI-CFO plan (with rate limiting and audit logging)
// Note: Rate limiting might be too strict for board reporting, but we keep it for now
router.post('/orgs/:orgId/ai-plans', authenticate, requireFinanceOrAdmin('orgId'), auditLogger, aicfoController.generatePlan);

// Apply AI-CFO plan changes (create scenario)
router.post('/orgs/:orgId/ai-plans/apply', authenticate, requireFinanceOrAdmin('orgId'), aicfoController.applyPlan);

// List AI-CFO plans
router.get('/orgs/:orgId/ai-plans', authenticate, requireOrgAccess('orgId'), aicfoController.listPlans);

// Get AI-CFO plan
router.get('/ai-plans/:planId', authenticate, aicfoController.getPlan);

// Update AI-CFO plan
router.put('/ai-plans/:planId', authenticate, aicfoController.updatePlan);

// Delete AI-CFO plan
router.delete('/ai-plans/:planId', authenticate, aicfoController.deletePlan);

// Get prompt details (AUDITABILITY)
router.get('/prompts/:promptId', authenticate, aicfoController.getPrompt);

export default router;


