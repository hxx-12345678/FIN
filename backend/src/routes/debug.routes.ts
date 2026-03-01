import { Router } from 'express';
import { debugController } from '../controllers/debug.controller';
import { authenticate } from '../middlewares/auth';
import { requirePlatformAdmin } from '../middlewares/rbac';

const router = Router();

// Demo creation should be restricted to platform admins or disabled in production
router.post('/create-demo', authenticate, requirePlatformAdmin, debugController.createDemo);

export default router;

