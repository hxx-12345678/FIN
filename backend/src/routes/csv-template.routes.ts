/**
 * CSV Template Routes
 * Public routes for downloading CSV templates
 */

import { Router } from 'express';
import { csvTemplateController } from '../controllers/csv-template.controller';

const router = Router();

/**
 * GET /templates/csv
 * Download CSV template for specified industry
 * Query params: ?industry=saas|ecommerce|quickcommerce
 * 
 * Public endpoint (no authentication required)
 */
router.get('/templates/csv', csvTemplateController.downloadTemplate);

export default router;


