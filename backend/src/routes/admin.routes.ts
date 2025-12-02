import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Admin Metrics
router.get('/metrics', authenticate, adminController.getMetrics);

export default router;
