/**
 * Notification Service
 * Handles notifications, alert rules, and notification channels
 */

import prisma from '../config/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { auditService } from './audit.service';
import { logger } from '../utils/logger';

export interface Notification {
  id: string;
  type: 'alert' | 'success' | 'warning' | 'info';
  title: string;
  message: string;
  category: 'financial' | 'growth' | 'reporting' | 'system';
  priority: 'high' | 'medium' | 'low';
  read: boolean;
  readAt: Date | null;
  timestamp: Date;
  metadata?: any;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  channels: string[];
  threshold: string;
  frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
  metric?: string;
  operator?: string;
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'sms' | 'in-app';
  enabled: boolean;
  config: any;
}

export const notificationService = {
  /**
   * Get notifications for a user/organization
   */
  getNotifications: async (
    orgId: string,
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      read?: boolean;
      category?: string;
      priority?: string;
    }
  ): Promise<{ notifications: Notification[]; total: number }> => {
    // Verify user access
    const userRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!userRole) {
      throw new ForbiddenError('No access to this organization');
    }

    const where: any = {
      orgId,
      OR: [
        { userId: null }, // Org-wide notifications
        { userId }, // User-specific notifications
      ],
    };

    if (options?.read !== undefined) {
      where.read = options.read;
    }
    if (options?.category) {
      where.category = options.category;
    }
    if (options?.priority) {
      where.priority = options.priority;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type as any,
        title: n.title,
        message: n.message,
        category: n.category as any,
        priority: n.priority as any,
        read: n.read,
        readAt: n.readAt,
        timestamp: n.createdAt,
        metadata: n.metadata as any,
      })),
      total,
    };
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (orgId: string, userId: string, notificationId: string): Promise<void> => {
    // Verify user access
    const userRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!userRole) {
      throw new ForbiddenError('No access to this organization');
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.orgId !== orgId) {
      throw new NotFoundError('Notification not found');
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (orgId: string, userId: string): Promise<void> => {
    // Verify user access
    const userRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!userRole) {
      throw new ForbiddenError('No access to this organization');
    }

    await prisma.notification.updateMany({
      where: {
        orgId,
        OR: [
          { userId: null },
          { userId },
        ],
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  },

  /**
   * Get alert rules
   */
  getAlertRules: async (orgId: string, userId: string): Promise<AlertRule[]> => {
    // Verify user access
    const userRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!userRole) {
      throw new ForbiddenError('No access to this organization');
    }

    const rules = await prisma.alertRule.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });

    return rules.map((rule) => {
      const channels: string[] = [];
      if (rule.notifyEmail) channels.push('email');
      if (rule.notifySlack) channels.push('slack');

      return {
        id: rule.id,
        name: rule.name,
        description: rule.description || '',
        enabled: rule.enabled,
        channels,
        threshold: rule.threshold.toString(),
        frequency: 'immediate' as const, // Can be extended
        metric: rule.metric,
        operator: rule.operator,
      };
    });
  },

  /**
   * Create alert rule
   */
  createAlertRule: async (
    orgId: string,
    userId: string,
    params: {
      name: string;
      description?: string;
      metric: string;
      operator: string;
      threshold: number;
      channels: string[];
      frequency?: 'immediate' | 'daily' | 'weekly' | 'monthly';
    }
  ): Promise<AlertRule> => {
    // Verify user access
    const userRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!userRole || !['admin', 'finance'].includes(userRole.role)) {
      throw new ForbiddenError('Only admins and finance users can create alert rules');
    }

    const rule = await prisma.alertRule.create({
      data: {
        orgId,
        name: params.name,
        description: params.description,
        metric: params.metric,
        operator: params.operator,
        threshold: params.threshold,
        notifyEmail: params.channels.includes('email'),
        notifySlack: params.channels.includes('slack'),
        createdById: userId,
      },
    });

    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'alert_rule_created',
      objectType: 'alert_rule',
      objectId: rule.id,
    });

    return {
      id: rule.id,
      name: rule.name,
      description: rule.description || '',
      enabled: rule.enabled,
      channels: params.channels,
      threshold: rule.threshold.toString(),
      frequency: params.frequency || 'immediate',
      metric: rule.metric,
      operator: rule.operator,
    };
  },

  /**
   * Update alert rule
   */
  updateAlertRule: async (
    orgId: string,
    userId: string,
    ruleId: string,
    params: {
      enabled?: boolean;
      channels?: string[];
      threshold?: number;
    }
  ): Promise<AlertRule> => {
    // Verify user access
    const userRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!userRole || !['admin', 'finance'].includes(userRole.role)) {
      throw new ForbiddenError('Only admins and finance users can update alert rules');
    }

    const rule = await prisma.alertRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule || rule.orgId !== orgId) {
      throw new NotFoundError('Alert rule not found');
    }

    const updateData: any = {};
    if (params.enabled !== undefined) {
      updateData.enabled = params.enabled;
    }
    if (params.channels) {
      updateData.notifyEmail = params.channels.includes('email');
      updateData.notifySlack = params.channels.includes('slack');
    }
    if (params.threshold !== undefined) {
      updateData.threshold = params.threshold;
    }

    const updated = await prisma.alertRule.update({
      where: { id: ruleId },
      data: updateData,
    });

    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'alert_rule_updated',
      objectType: 'alert_rule',
      objectId: ruleId,
    });

    const channels: string[] = [];
    if (updated.notifyEmail) channels.push('email');
    if (updated.notifySlack) channels.push('slack');

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description || '',
      enabled: updated.enabled,
      channels,
      threshold: updated.threshold.toString(),
      frequency: 'immediate',
      metric: updated.metric,
      operator: updated.operator,
    };
  },

  /**
   * Delete alert rule
   */
  deleteAlertRule: async (orgId: string, userId: string, ruleId: string): Promise<void> => {
    // Verify user access
    const userRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!userRole || !['admin', 'finance'].includes(userRole.role)) {
      throw new ForbiddenError('Only admins and finance users can delete alert rules');
    }

    const rule = await prisma.alertRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule || rule.orgId !== orgId) {
      throw new NotFoundError('Alert rule not found');
    }

    await prisma.alertRule.delete({
      where: { id: ruleId },
    });

    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'alert_rule_deleted',
      objectType: 'alert_rule',
      objectId: ruleId,
    });
  },

  /**
   * Get notification channels
   */
  getChannels: async (orgId: string, userId: string): Promise<NotificationChannel[]> => {
    // Verify user access
    const userRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!userRole) {
      throw new ForbiddenError('No access to this organization');
    }

    const channels = await prisma.notificationChannel.findMany({
      where: {
        orgId,
        OR: [
          { userId: null }, // Org-wide
          { userId }, // User-specific
        ],
      },
    });

    return channels.map((ch) => ({
      id: ch.id,
      type: ch.type as any,
      enabled: ch.enabled,
      config: ch.configJson as any,
    }));
  },

  /**
   * Update notification channel
   */
  updateChannel: async (
    orgId: string,
    userId: string,
    channelType: string,
    params: {
      enabled?: boolean;
      config?: any;
    }
  ): Promise<NotificationChannel> => {
    // Verify user access
    const userRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!userRole) {
      throw new ForbiddenError('No access to this organization');
    }

    // Find existing channel - Prisma unique constraint is on [orgId, userId, type]
    const existing = await prisma.notificationChannel.findFirst({
      where: {
        orgId,
        userId: userId,
        type: channelType,
      },
    });

    let channel;
    if (existing) {
      channel = await prisma.notificationChannel.update({
        where: { id: existing.id },
        data: {
          enabled: params.enabled !== undefined ? params.enabled : existing.enabled,
          configJson: params.config !== undefined ? params.config : existing.configJson,
        },
      });
    } else {
      channel = await prisma.notificationChannel.create({
        data: {
          orgId,
          userId: userId,
          type: channelType,
          enabled: params.enabled !== undefined ? params.enabled : true,
          configJson: params.config || {},
        },
      });
    }

    return {
      id: channel.id,
      type: channel.type as any,
      enabled: channel.enabled,
      config: channel.configJson as any,
    };
  },

  /**
   * Get notification statistics
   */
  getStats: async (orgId: string, userId: string) => {
    // Verify user access
    const userRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!userRole) {
      throw new ForbiddenError('No access to this organization');
    }

    const where = {
      orgId,
      OR: [
        { userId: null },
        { userId },
      ],
    };

    const [unread, highPriority, thisWeek, activeRules] = await Promise.all([
      prisma.notification.count({
        where: { ...where, read: false },
      }),
      prisma.notification.count({
        where: { ...where, priority: 'high', read: false },
      }),
      prisma.notification.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.alertRule.count({
        where: { orgId, enabled: true },
      }),
    ]);

    return {
      unread,
      highPriority,
      thisWeek,
      activeRules,
    };
  },
};

