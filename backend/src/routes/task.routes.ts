import { Router } from 'express';
import { taskController } from '../controllers/task.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Create Slack task (stub)
router.post('/tasks/slack', authenticate, taskController.createSlackTask);

// Create email task (stub)
router.post('/tasks/email', authenticate, taskController.createEmailTask);

export default router;


