import { Router } from 'express';
import multer from 'multer';
import { csvController } from '../controllers/csv.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess } from '../middlewares/rbac';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_UPLOAD_SIZE || '104857600', 10), // 100MB default
  },
});

// Upload CSV file - REMOVED requireOrgAccess middleware (checking in controller instead)
router.post(
  '/orgs/:orgId/import/csv/upload',
  authenticate,
  upload.single('file'),
  csvController.uploadCsv
);

// Map CSV columns - REMOVED requireOrgAccess middleware (checking in service)
router.post(
  '/orgs/:orgId/import/csv/map',
  authenticate,
  csvController.mapCsv
);

// Auto-map CSV columns
router.post(
  '/orgs/:orgId/import/csv/automap',
  authenticate,
  requireOrgAccess('orgId'),
  csvController.autoMap
);

// Save mapping template
router.post(
  '/orgs/:orgId/import/csv/save-mapping-template',
  authenticate,
  requireOrgAccess,
  csvController.saveMappingTemplate
);

export default router;
