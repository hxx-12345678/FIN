/**
 * Settings Routes
 * Comprehensive settings management routes
 */

import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess } from '../middlewares/rbac';

const router = Router();

// Organization settings
router.get('/orgs/:orgId/settings', authenticate, requireOrgAccess('orgId'), settingsController.getSettings);
router.put('/orgs/:orgId/settings', authenticate, requireOrgAccess('orgId'), settingsController.updateSettings);

// User profile
router.get('/users/profile', authenticate, settingsController.getProfile);
router.put('/users/profile', authenticate, settingsController.updateProfile);

// Organization details
router.get('/orgs/:orgId/organization', authenticate, requireOrgAccess('orgId'), settingsController.getOrganization);
router.put('/orgs/:orgId/organization', authenticate, requireOrgAccess('orgId'), settingsController.updateOrganization);

// Appearance preferences
router.get('/users/appearance', authenticate, settingsController.getAppearance);
router.put('/users/appearance', authenticate, settingsController.updateAppearance);

// Notification preferences
router.get('/orgs/:orgId/notifications/preferences', authenticate, requireOrgAccess('orgId'), settingsController.getNotificationPreferences);
router.put('/orgs/:orgId/notifications/preferences', authenticate, requireOrgAccess('orgId'), settingsController.updateNotificationPreferences);

// Localization
router.get('/orgs/:orgId/localization', authenticate, requireOrgAccess('orgId'), settingsController.getLocalization);
router.put('/orgs/:orgId/localization', authenticate, requireOrgAccess('orgId'), settingsController.updateLocalization);
router.post('/orgs/:orgId/localization/fx-rates/update', authenticate, requireOrgAccess('orgId'), settingsController.updateFxRates);

// Security
router.post('/users/password/change', authenticate, settingsController.changePassword);
router.get('/orgs/:orgId/api-key', authenticate, requireOrgAccess('orgId'), settingsController.getApiKey);
router.post('/orgs/:orgId/api-key/regenerate', authenticate, requireOrgAccess('orgId'), settingsController.regenerateApiKey);

// Sync audit log
router.get('/orgs/:orgId/sync-audit', authenticate, requireOrgAccess('orgId'), settingsController.getSyncAuditLog);

// Export data
router.get('/orgs/:orgId/export-data', authenticate, requireOrgAccess('orgId'), settingsController.exportData);

export default router;
