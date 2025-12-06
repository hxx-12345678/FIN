import { Router } from 'express';
import { reportApprovalController } from '../controllers/report-approval.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess, requireFinanceOrAdmin } from '../middlewares/rbac';
import { rateLimit } from '../middlewares/rateLimit';

const router = Router();

// Create report with approval workflow
router.post('/orgs/:orgId/reports', authenticate, requireOrgAccess('orgId'), rateLimit(20), reportApprovalController.createReport);

// Submit report for approval
router.post('/orgs/:orgId/reports/:exportId/submit', authenticate, requireFinanceOrAdmin('orgId'), rateLimit(10), reportApprovalController.submitForApproval);

// Approve or reject report
router.post('/orgs/:orgId/reports/:exportId/approve', authenticate, requireOrgAccess('orgId'), rateLimit(20), reportApprovalController.approveOrReject);

// Get approval status
router.get('/orgs/:orgId/reports/:exportId/approval-status', authenticate, requireOrgAccess('orgId'), reportApprovalController.getApprovalStatus);

// Schedule report
router.post('/orgs/:orgId/reports/:exportId/schedule', authenticate, requireFinanceOrAdmin('orgId'), rateLimit(10), reportApprovalController.scheduleReport);

export default router;

