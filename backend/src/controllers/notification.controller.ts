/**
 * Notification Controller
 * API endpoints for notifications, alert rules, and channels
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { notificationService } from '../services/notification.service';
import { ValidationError } from '../utils/errors';

export const notificationController = {
  /**
   * GET /api/v1/orgs/:orgId/notifications
   * Get notifications
   */
  getNotifications: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { limit, offset, read, category, priority } = req.query;

      const result = await notificationService.getNotifications(orgId, req.user.id, {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        read: read === 'true' ? true : read === 'false' ? false : undefined,
        category: category as string,
        priority: priority as string,
      });

      res.json({
        ok: true,
        data: result.notifications,
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/orgs/:orgId/notifications/:notificationId/read
   * Mark notification as read
   */
  markAsRead: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, notificationId } = req.params;
      await notificationService.markAsRead(orgId, req.user.id, notificationId);

      res.json({
        ok: true,
        message: 'Notification marked as read',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/orgs/:orgId/notifications/read-all
   * Mark all notifications as read
   */
  markAllAsRead: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      await notificationService.markAllAsRead(orgId, req.user.id);

      res.json({
        ok: true,
        message: 'All notifications marked as read',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/notifications/stats
   * Get notification statistics
   */
  getStats: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const stats = await notificationService.getStats(orgId, req.user.id);

      res.json({
        ok: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/alert-rules
   * Get alert rules
   */
  getAlertRules: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const rules = await notificationService.getAlertRules(orgId, req.user.id);

      res.json({
        ok: true,
        data: rules,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orgs/:orgId/alert-rules
   * Create alert rule
   */
  createAlertRule: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { name, description, metric, operator, threshold, channels, frequency } = req.body;

      if (!name || !metric || !operator || threshold === undefined || !channels) {
        throw new ValidationError('Name, metric, operator, threshold, and channels are required');
      }

      const rule = await notificationService.createAlertRule(orgId, req.user.id, {
        name,
        description,
        metric,
        operator,
        threshold,
        channels,
        frequency,
      });

      res.status(201).json({
        ok: true,
        data: rule,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/orgs/:orgId/alert-rules/:ruleId
   * Update alert rule
   */
  updateAlertRule: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, ruleId } = req.params;
      const { enabled, channels, threshold } = req.body;

      const rule = await notificationService.updateAlertRule(orgId, req.user.id, ruleId, {
        enabled,
        channels,
        threshold,
      });

      res.json({
        ok: true,
        data: rule,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/orgs/:orgId/alert-rules/:ruleId
   * Delete alert rule
   */
  deleteAlertRule: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, ruleId } = req.params;
      await notificationService.deleteAlertRule(orgId, req.user.id, ruleId);

      res.json({
        ok: true,
        message: 'Alert rule deleted',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/notification-channels
   * Get notification channels
   */
  getChannels: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const channels = await notificationService.getChannels(orgId, req.user.id);

      res.json({
        ok: true,
        data: channels,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/orgs/:orgId/notification-channels/:channelType
   * Update notification channel
   */
  updateChannel: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, channelType } = req.params;
      const { enabled, config } = req.body;

      const channel = await notificationService.updateChannel(orgId, req.user.id, channelType, {
        enabled,
        config,
      });

      res.json({
        ok: true,
        data: channel,
      });
    } catch (error) {
      next(error);
    }
  },
};

