/**
 * CSV Mapping Routes
 * Routes for automated CSV column mapping
 */

import { Router } from 'express';
import { csvMappingController } from '../controllers/csv-mapping.controller';

const router = Router();

/**
 * POST /import/map
 * Automatically map CSV headers to internal fields
 * Body: { headers: string[] }
 */
router.post('/import/map', csvMappingController.autoMap);

/**
 * POST /import/map/suggest
 * Get mapping suggestions for a single column
 * Body: { column: string }
 */
router.post('/import/map/suggest', csvMappingController.suggestMapping);

/**
 * POST /import/map/validate
 * Validate a manual mapping
 * Body: { csvField: string, internalField: string }
 */
router.post('/import/map/validate', csvMappingController.validateMapping);

export default router;


