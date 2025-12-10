/**
 * Usage Routes
 * Routes for simulation credit usage tracking
 */

import { Router } from 'express';
import { usageController } from '../controllers/usage.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

/**
 * GET /usage
 * Get usage summary for organization
 */
router.get('/usage', authenticate, usageController.getUsage);

/**
 * GET /usage/balance
 * Get current credit balance
 */
router.get('/usage/balance', authenticate, usageController.getBalance);

/**
 * POST /usage/admin/add-credits
 * Admin override: Add credits manually
 */
router.post('/usage/admin/add-credits', authenticate, usageController.adminAddCredits);

export default router;


