/**
 * CSV Mapping Routes
 * Routes for automated CSV column mapping
 */

import { Router } from 'express';
import { csvMappingController } from '../controllers/csv-mapping.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

/**
 * POST /import/map
 * Automatically map CSV headers to internal fields
 * Body: { headers: string[] }
 * Requires authentication
 */
router.post('/import/map', authenticate, csvMappingController.autoMap);

/**
 * POST /import/map/suggest
 * Get mapping suggestions for a single column
 * Body: { column: string }
 * Requires authentication
 */
router.post('/import/map/suggest', authenticate, csvMappingController.suggestMapping);

/**
 * POST /import/map/validate
 * Validate a manual mapping
 * Body: { csvField: string, internalField: string }
 * Requires authentication
 */
router.post('/import/map/validate', authenticate, csvMappingController.validateMapping);

export default router;


