import { Router } from 'express';
import { transactionController } from '../controllers/transaction.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess } from '../middlewares/rbac';

const router = Router();

// List transactions
router.get('/orgs/:orgId/transactions', authenticate, requireOrgAccess('orgId'), transactionController.listTransactions);

// Get transaction statistics
router.get('/orgs/:orgId/transactions/stats', authenticate, requireOrgAccess('orgId'), transactionController.getStats);

// Get reconciliation preview
router.get('/orgs/:orgId/transactions/reconciliation', authenticate, requireOrgAccess('orgId'), transactionController.getReconciliationPreview);

export default router;

