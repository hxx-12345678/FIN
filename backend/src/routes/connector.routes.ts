import { Router } from 'express';
import { connectorController } from '../controllers/connector.controller';
import { connectorSyncController } from '../controllers/connector-sync.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess } from '../middlewares/rbac';

const router = Router();

// Start OAuth flow
router.post(
  '/orgs/:orgId/connectors/:type/start-oauth',
  authenticate,
  requireOrgAccess,
  connectorController.startOAuth
);

// Stripe API-key connect (no OAuth)
router.post(
  '/orgs/:orgId/connectors/stripe/connect',
  authenticate,
  requireOrgAccess,
  connectorController.connectStripe
);

// OAuth callback (no auth required - handled by state token)
// Note: OAuth providers require static callback URL, so connectorId comes from state token
router.get('/callback', connectorController.oauthCallback);

// Sync connector
router.post('/:id/sync', authenticate, connectorController.sync);

// Get connector status
router.get('/:id/status', authenticate, connectorController.getStatus);

// List connectors for org
router.get(
  '/orgs/:orgId/connectors',
  authenticate,
  requireOrgAccess,
  connectorController.listConnectors
);

// Connector sync health
router.get('/:id/health', authenticate, connectorSyncController.getConnectorHealth);

// Update sync settings
router.patch('/:id/sync-settings', authenticate, connectorSyncController.updateSyncSettings);

// Scheduled sync trigger (for cron)
router.post('/scheduled/sync', connectorSyncController.triggerScheduledSync);

export default router;
