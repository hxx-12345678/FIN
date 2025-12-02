import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Get org settings
router.get('/orgs/:orgId/settings', authenticate, settingsController.getSettings);

// Update org settings
router.put('/orgs/:orgId/settings', authenticate, settingsController.updateSettings);

export default router;


