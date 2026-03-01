import { Router } from 'express';
import { connectorController } from '../controllers/connector.controller';
import { connectorSyncController } from '../controllers/connector-sync.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess, requireConnectorOwnership, requireFinanceOrAdmin } from '../middlewares/rbac';

const router = Router();

// Start OAuth flow
router.post(
  '/orgs/:orgId/connectors/:type/start-oauth',
  authenticate,
  requireFinanceOrAdmin('orgId'),
  connectorController.startOAuth
);

// Stripe API-key connect (no OAuth)
router.post(
  '/orgs/:orgId/connectors/stripe/connect',
  authenticate,
  requireFinanceOrAdmin('orgId'),
  connectorController.connectStripe
);

// OAuth callback (no auth required - handled by state token)
// Note: OAuth providers require static callback URL, so connectorId comes from state token
router.get('/connectors/callback', connectorController.oauthCallback);

// Sync connector
router.post('/connectors/:id/sync', authenticate, requireConnectorOwnership('id'), connectorController.sync);

// Get connector status
router.get('/connectors/:id/status', authenticate, requireConnectorOwnership('id'), connectorController.getStatus);

// List connectors for org
router.get(
  '/orgs/:orgId/connectors',
  authenticate,
  requireOrgAccess('orgId'),
  connectorController.listConnectors
);

// Connector sync health
router.get('/connectors/:id/health', authenticate, requireConnectorOwnership('id'), connectorSyncController.getConnectorHealth);

// Update sync settings
router.patch('/connectors/:id/sync-settings', authenticate, requireConnectorOwnership('id'), connectorSyncController.updateSyncSettings);

// Scheduled sync trigger (for cron)
router.post('/connectors/scheduled/sync', connectorSyncController.triggerScheduledSync);

export default router;
