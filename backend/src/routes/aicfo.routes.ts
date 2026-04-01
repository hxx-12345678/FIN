import { Router } from 'express';
import multer from 'multer';
import { aicfoController } from '../controllers/aicfo.controller';
import { authenticate } from '../middlewares/auth';
import { rateLimit, orgRateLimit } from '../middlewares/rateLimit';
import { auditLogger } from '../middlewares/audit-logger';
import { requireOrgAccess, requireFinanceOrAdmin, requirePlanOwnership, requirePromptOwnership } from '../middlewares/rbac';

const router = Router();

// Configure multer for file uploads (memory storage for agentic ingestion)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_UPLOAD_SIZE || '104857600', 10), // 100MB default
  },
});

// NEW: Multi-agent orchestration endpoint for proper agentic AI CFO
router.post('/orgs/:orgId/ai-cfo/query', authenticate, rateLimit(), orgRateLimit, requireOrgAccess('orgId'), auditLogger, aicfoController.processAgenticQuery);
router.post('/orgs/:orgId/ai-cfo/query/stream', authenticate, orgRateLimit, requireOrgAccess('orgId'), aicfoController.streamAgenticQuery);
router.post('/orgs/:orgId/ai-cfo/upload', authenticate, orgRateLimit, requireOrgAccess('orgId'), upload.single('file'), aicfoController.uploadAttachment);

// Generate AI-CFO plan (with rate limiting and audit logging)
// Note: Rate limiting might be too strict for board reporting, but we keep it for now
router.post('/orgs/:orgId/ai-plans', authenticate, requireFinanceOrAdmin('orgId'), auditLogger, aicfoController.generatePlan);
// ... [rest same as before] ...

// Generate AI-CFO plan (with rate limiting and audit logging)
// Note: Rate limiting might be too strict for board reporting, but we keep it for now
router.post('/orgs/:orgId/ai-plans', authenticate, requireFinanceOrAdmin('orgId'), auditLogger, aicfoController.generatePlan);

// Apply AI-CFO plan changes (create scenario)
router.post('/orgs/:orgId/ai-plans/apply', authenticate, requireFinanceOrAdmin('orgId'), aicfoController.applyPlan);

// List AI-CFO plans
router.get('/orgs/:orgId/ai-plans', authenticate, requireOrgAccess('orgId'), aicfoController.listPlans);

// Get AI-CFO plan
router.get('/ai-plans/:planId', authenticate, requirePlanOwnership('planId'), aicfoController.getPlan);

// Update AI-CFO plan
router.put('/ai-plans/:planId', authenticate, requirePlanOwnership('planId'), aicfoController.updatePlan);

// Delete AI-CFO plan
router.delete('/ai-plans/:planId', authenticate, requirePlanOwnership('planId'), aicfoController.deletePlan);

// Get prompt details (AUDITABILITY)
router.get('/prompts/:promptId', authenticate, requirePromptOwnership('promptId'), aicfoController.getPrompt);

// Conversation History
router.get('/orgs/:orgId/ai-cfo/conversations', authenticate, requireOrgAccess('orgId'), aicfoController.listConversations);
router.get('/orgs/:orgId/ai-cfo/conversations/:conversationId', authenticate, requireOrgAccess('orgId'), aicfoController.getConversation);
router.delete('/orgs/:orgId/ai-cfo/conversations/:conversationId', authenticate, requireOrgAccess('orgId'), aicfoController.deleteConversation);

export default router;


