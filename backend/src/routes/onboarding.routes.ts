/**
 * Onboarding Routes
 * Routes for onboarding workflow management
 */

import { Router } from 'express';
import { onboardingController } from '../controllers/onboarding.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

/**
 * POST /onboarding/start
 * Start onboarding workflow
 */
router.post('/onboarding/start', authenticate, onboardingController.startOnboarding);

/**
 * PATCH /onboarding/step
 * Update onboarding step
 */
router.patch('/onboarding/step', authenticate, onboardingController.updateStep);

/**
 * GET /onboarding/status
 * Get onboarding status and completion percentage
 */
router.get('/onboarding/status', authenticate, onboardingController.getStatus);

/**
 * POST /onboarding/rollback
 * Rollback to previous step
 */
router.post('/onboarding/rollback', authenticate, onboardingController.rollbackStep);

export default router;


