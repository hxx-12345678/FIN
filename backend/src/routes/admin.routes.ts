import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate } from '../middlewares/auth';

import { requirePlatformAdmin } from '../middlewares/rbac';

const router = Router();

// Admin Metrics - Restricted to platform admins only
router.get('/metrics', authenticate, requirePlatformAdmin, adminController.getMetrics);

export default router;
