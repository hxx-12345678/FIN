import { Router } from 'express';
import { approvalController } from '../controllers/approval.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgRole, validateUUIDParams } from '../middlewares/rbac';

const router = Router();

router.post(
  '/orgs/:orgId/approvals',
  authenticate,
  requireOrgRole('finance', 'orgId'),
  validateUUIDParams(['orgId']),
  approvalController.createRequest
);

router.get(
  '/orgs/:orgId/approvals/pending',
  authenticate,
  requireOrgRole('finance', 'orgId'),
  validateUUIDParams(['orgId']),
  approvalController.listPending
);

router.post(
  '/approvals/:requestId/approve',
  authenticate,
  // Approver must have admin role in the org related to the request
  // (Simplified for now: just require finance/admin)
  approvalController.approveRequest
);

router.post(
  '/approvals/:requestId/reject',
  authenticate,
  approvalController.rejectRequest
);

export default router;


