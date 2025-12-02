import { Router } from 'express';
import multer from 'multer';
import { excelController } from '../controllers/excel.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess, requireFinanceOrAdmin } from '../middlewares/rbac';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_UPLOAD_SIZE || '104857600', 10), // 100MB default
  },
});

// Excel Import
router.post(
  '/orgs/:orgId/import/xlsx',
  authenticate,
  requireFinanceOrAdmin('orgId'),
  upload.single('file'),
  excelController.uploadXlsx
);

router.post(
  '/orgs/:orgId/import/xlsx/map',
  authenticate,
  requireFinanceOrAdmin('orgId'),
  excelController.mapXlsx
);

// Excel Mappings
router.get(
  '/orgs/:orgId/excel/mappings',
  authenticate,
  requireOrgAccess('orgId'),
  excelController.listMappings
);

router.post(
  '/orgs/:orgId/excel/mappings',
  authenticate,
  requireFinanceOrAdmin('orgId'),
  excelController.createMapping
);

// Excel Sync
router.post(
  '/orgs/:orgId/excel/sync',
  authenticate,
  requireFinanceOrAdmin('orgId'),
  excelController.createSync
);

router.get(
  '/orgs/:orgId/excel/syncs',
  authenticate,
  requireOrgAccess('orgId'),
  excelController.listSyncs
);

router.get(
  '/orgs/:orgId/excel/syncs/:syncId',
  authenticate,
  requireOrgAccess('orgId'),
  excelController.getSyncStatus
);

// Excel Export
router.post(
  '/orgs/:orgId/excel/export',
  authenticate,
  requireOrgAccess('orgId'),
  excelController.exportToXlsx
);

// Excel Merge
router.post(
  '/orgs/:orgId/excel/merge',
  authenticate,
  requireFinanceOrAdmin('orgId'),
  upload.single('file'),
  excelController.mergeXlsx
);

export default router;


