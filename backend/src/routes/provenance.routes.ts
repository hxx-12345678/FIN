import { Router } from 'express';
import { provenanceController } from '../controllers/provenance.controller';
import { provenanceExportController } from '../controllers/provenanceExport.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Get provenance for a specific cell
router.get('/', authenticate, provenanceController.getProvenance);

// Stream transactions for a specific cell (SSE)
router.get('/stream', authenticate, provenanceController.streamTransactions);

// Export/Link to Excel source
router.get('/export-excel', authenticate, provenanceController.exportExcel);

// Get provenance for multiple cells (bulk)
router.get('/bulk', authenticate, provenanceController.getBulkProvenance);

// Search provenance entries
router.get('/search', authenticate, provenanceController.searchProvenance);

// Create provenance export job
router.post('/export', authenticate, provenanceExportController.createExport);

export default router;

