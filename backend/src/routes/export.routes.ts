import { Router } from 'express';
import { exportController } from '../controllers/export.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess } from '../middlewares/rbac';

const router = Router();

router.post('/model-runs/:run_id/export', authenticate, exportController.createExport);
router.get('/exports/:id', authenticate, exportController.getExport);
router.get('/exports/:id/download', authenticate, exportController.downloadExport);
router.get('/orgs/:orgId/exports', authenticate, requireOrgAccess('orgId'), exportController.listExports);

export default router;

