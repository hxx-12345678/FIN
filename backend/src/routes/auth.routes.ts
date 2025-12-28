import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { ssoController } from '../controllers/sso.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Standard auth routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/accept-invite', authController.acceptInvite);
router.get('/me', authenticate, authController.getMe);
router.get('/me/excel-perms', authenticate, authController.getExcelPerms);
router.post('/logout', authenticate, authController.logout);
router.post('/switch-org', authenticate, authController.switchOrg);

// SSO routes
router.post('/sso/:provider', ssoController.initiateSSO);
router.get('/sso/callback', ssoController.handleCallback);

export default router;

