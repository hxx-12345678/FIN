import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { ssoController } from '../controllers/sso.controller';
import { mfaController } from '../controllers/mfa.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Standard auth routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/mfa/verify-login', authController.verifyLoginMFA);
router.post('/refresh', authController.refresh);
router.post('/accept-invite', authController.acceptInvite);
router.get('/me', authenticate, authController.getMe);
router.get('/me/excel-perms', authenticate, authController.getExcelPerms);
router.get('/permissions', authenticate, authController.getPermissions);
router.get('/roles', authenticate, authController.getRoles);
router.get('/sessions', authenticate, authController.getSessions);
router.delete('/sessions/:sessionId', authenticate, authController.revokeSession);
router.post('/sessions/revoke-all', authenticate, authController.revokeAllSessions);
router.post('/logout', authenticate, authController.logout);
router.post('/switch-org', authenticate, authController.switchOrg);

// MFA routes
router.post('/mfa/setup', authenticate, mfaController.setupMFA);
router.post('/mfa/verify', authenticate, mfaController.verifyMFA);
router.get('/mfa/backup-codes', authenticate, mfaController.getBackupCodes);
router.post('/mfa/enable', authenticate, mfaController.enableMFA);

// SSO routes
router.post('/sso/:provider', ssoController.initiateSSO);
router.get('/sso/callback', ssoController.handleCallback);

export default router;

