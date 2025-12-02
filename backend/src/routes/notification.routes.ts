/**
 * Notification Routes
 */

import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess } from '../middlewares/rbac';

const router = Router();

// Notifications
router.get(
  '/orgs/:orgId/notifications',
  authenticate,
  requireOrgAccess('orgId'),
  notificationController.getNotifications
);
router.put(
  '/orgs/:orgId/notifications/:notificationId/read',
  authenticate,
  requireOrgAccess('orgId'),
  notificationController.markAsRead
);
router.put(
  '/orgs/:orgId/notifications/read-all',
  authenticate,
  requireOrgAccess('orgId'),
  notificationController.markAllAsRead
);
router.get(
  '/orgs/:orgId/notifications/stats',
  authenticate,
  requireOrgAccess('orgId'),
  notificationController.getStats
);

// Alert Rules
router.get(
  '/orgs/:orgId/alert-rules',
  authenticate,
  requireOrgAccess('orgId'),
  notificationController.getAlertRules
);
router.post(
  '/orgs/:orgId/alert-rules',
  authenticate,
  requireOrgAccess('orgId'),
  notificationController.createAlertRule
);
router.put(
  '/orgs/:orgId/alert-rules/:ruleId',
  authenticate,
  requireOrgAccess('orgId'),
  notificationController.updateAlertRule
);
router.delete(
  '/orgs/:orgId/alert-rules/:ruleId',
  authenticate,
  requireOrgAccess('orgId'),
  notificationController.deleteAlertRule
);

// Notification Channels
router.get(
  '/orgs/:orgId/notification-channels',
  authenticate,
  requireOrgAccess('orgId'),
  notificationController.getChannels
);
router.put(
  '/orgs/:orgId/notification-channels/:channelType',
  authenticate,
  requireOrgAccess('orgId'),
  notificationController.updateChannel
);

export default router;

