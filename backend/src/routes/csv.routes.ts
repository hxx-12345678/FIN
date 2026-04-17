import { Router } from 'express';
import multer from 'multer';
import { csvController } from '../controllers/csv.controller';
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

// Upload CSV file (finance or admin required)
router.post(
  '/orgs/:orgId/import/csv/upload',
  authenticate,
  requireFinanceOrAdmin('orgId'),
  upload.single('file'),
  csvController.uploadCsv
);

// Map CSV columns (finance or admin required)
router.post(
  '/orgs/:orgId/import/csv/map',
  authenticate,
  requireFinanceOrAdmin('orgId'),
  csvController.mapCsv
);

// Auto-map CSV columns (viewer allowed as it's a suggestion)
router.post(
  '/orgs/:orgId/import/csv/automap',
  authenticate,
  requireOrgAccess('orgId'),
  csvController.autoMap
);

// Save mapping template (finance or admin required)
router.post(
  '/orgs/:orgId/import/csv/save-mapping-template',
  authenticate,
  requireFinanceOrAdmin('orgId'),
  csvController.saveMappingTemplate
);

// Validate CSV data quality before import
router.post(
  '/orgs/:orgId/import/csv/validate',
  authenticate,
  requireOrgAccess('orgId'),
  csvController.validateData
);

export default router;
