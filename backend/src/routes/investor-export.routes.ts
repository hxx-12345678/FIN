import { Router } from 'express';
import { investorExportController } from '../controllers/investor-export.controller';
import { shareableLinkController } from '../controllers/shareable-link.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// One-click investor export
router.post('/orgs/:orgId/investor-export', authenticate, investorExportController.createExport);

// Get export status
router.get('/exports/:id/status', authenticate, investorExportController.getExportStatus);

// Shareable links
router.post('/exports/:exportId/shareable-link', authenticate, shareableLinkController.createShareableLink);
router.get('/share-export/:token/download', shareableLinkController.downloadByToken); // Public download endpoint (must come before /share-export/:token)
router.get('/share-export/:token', shareableLinkController.accessByToken); // Public endpoint (redirects to download)
router.delete('/exports/:exportId/shareable-link/:token', authenticate, shareableLinkController.revokeShareableLink);
router.get('/exports/:exportId/shareable-links', authenticate, shareableLinkController.listShareableLinks);

export default router;

