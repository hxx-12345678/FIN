import { Router } from 'express';
import { scheduledAutoModelController } from '../controllers/scheduled-auto-model.controller';

const router = Router();

// Trigger scheduled auto-model (for cron jobs)
// This should be called every 6 hours
router.post('/scheduled/auto-model', scheduledAutoModelController.triggerScheduled);

export default router;


