import { Router } from 'express';
import { debugController } from '../controllers/debug.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/create-demo', authenticate, debugController.createDemo);

export default router;

