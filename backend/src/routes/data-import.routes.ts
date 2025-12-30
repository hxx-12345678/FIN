import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { requireFinanceOrAdmin } from '../middlewares/rbac';
import { dataImportController } from '../controllers/data-import.controller';

const router = Router();

// List recent import batches for org (lineage + audit entry point)
router.get(
  '/orgs/:orgId/data/import-batches',
  authenticate,
  requireFinanceOrAdmin('orgId'),
  dataImportController.listBatches
);

// Get one batch (includes mappingJson, statsJson)
router.get(
  '/orgs/:orgId/data/import-batches/:batchId',
  authenticate,
  requireFinanceOrAdmin('orgId'),
  dataImportController.getBatch
);

export default router;



