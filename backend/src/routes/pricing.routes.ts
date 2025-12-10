/**
 * Pricing Routes
 * Routes for pricing plan management
 * Public endpoints (no authentication required)
 */

import { Router } from 'express';
import { pricingController } from '../controllers/pricing.controller';

const router = Router();

/**
 * GET /pricing
 * Get all pricing plans
 */
router.get('/pricing', pricingController.getPricing);

/**
 * GET /pricing/:planId
 * Get specific pricing plan
 */
router.get('/pricing/:planId', pricingController.getPlan);

/**
 * POST /pricing/check-upgrade
 * Check if upgrade path is allowed
 */
router.post('/pricing/check-upgrade', pricingController.checkUpgrade);

/**
 * POST /pricing/check-downgrade
 * Check if downgrade path is allowed with restrictions
 */
router.post('/pricing/check-downgrade', pricingController.checkDowngrade);

export default router;


