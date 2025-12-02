import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/accept-invite', authController.acceptInvite);
router.get('/me', authenticate, authController.getMe);
router.get('/me/excel-perms', authenticate, authController.getExcelPerms);
router.post('/logout', authenticate, authController.logout);

export default router;

