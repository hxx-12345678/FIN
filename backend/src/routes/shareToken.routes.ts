import { Router } from 'express';
import { shareTokenController } from '../controllers/shareToken.controller';
import { authenticate } from '../middlewares/auth';
import { authenticateShareToken, requireShareTokenScope } from '../middlewares/shareToken';

const router = Router();

// Create share token (admin only)
router.post('/orgs/:orgId/share-tokens', authenticate, shareTokenController.createShareToken);

// List share tokens
router.get('/orgs/:orgId/share-tokens', authenticate, shareTokenController.listShareTokens);

// Revoke share token
router.delete('/share-tokens/:tokenId', authenticate, shareTokenController.revokeShareToken);

// Get shared data (read-only via share token)
router.get(
  '/share/:token',
  authenticateShareToken,
  requireShareTokenScope('read-only'),
  shareTokenController.getSharedData
);

export default router;


