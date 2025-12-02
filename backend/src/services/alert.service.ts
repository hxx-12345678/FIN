import prisma from '../config/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { auditService } from './audit.service';

export interface CreateAlertParams {
  name: string;
  description?: string;
  metric: string;
  operator: string;
  threshold: number;
  notifyEmail?: boolean;
  notifySlack?: boolean;
  slackWebhook?: string;
}

const VALID_METRICS = [
  'runway_months',
  'cash_balance',
  'burn_rate',
  'revenue_growth',
  'expense_growth',
  'net_income',
];

const VALID_OPERATORS = ['<', '>', '<=', '>=', '==', '!='];

export const alertService = {
  createAlert: async (
    orgId: string,
    userId: string,
    params: CreateAlertParams
  ) => {
    // Validate metric
    if (!VALID_METRICS.includes(params.metric)) {
      throw new ValidationError(
        `Invalid metric. Must be one of: ${VALID_METRICS.join(', ')}`
      );
    }

    // Validate operator
    if (!VALID_OPERATORS.includes(params.operator)) {
      throw new ValidationError(
        `Invalid operator. Must be one of: ${VALID_OPERATORS.join(', ')}`
      );
    }

    // Verify user access
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!role || !['admin', 'finance'].includes(role.role)) {
      throw new ForbiddenError('Only admins and finance users can create alerts');
    }

    // Create alert rule
    const alert = await prisma.alertRule.create({
      data: {
        orgId,
        name: params.name,
        description: params.description,
        metric: params.metric,
        operator: params.operator,
        threshold: params.threshold,
        notifyEmail: params.notifyEmail || false,
        notifySlack: params.notifySlack || false,
        slackWebhook: params.slackWebhook,
        createdById: userId,
      },
    });

    // Log audit event
    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'alert_created',
      objectType: 'alert_rule',
      objectId: alert.id,
      metaJson: {
        metric: params.metric,
        operator: params.operator,
        threshold: params.threshold,
      },
    });

    return alert;
  },

  listAlerts: async (orgId: string, userId: string, enabled?: boolean) => {
    // Verify user access
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    const where: any = { orgId };
    if (enabled !== undefined) {
      where.enabled = enabled;
    }

    const alerts = await prisma.alertRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return alerts;
  },

  getAlert: async (alertId: string, userId: string) => {
    const alert = await prisma.alertRule.findUnique({
      where: { id: alertId },
      include: {
        org: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!alert) {
      throw new NotFoundError('Alert rule not found');
    }

    // Verify user access
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId: alert.orgId,
        },
      },
    });

    if (!role) {
      throw new ForbiddenError('No access to this alert rule');
    }

    return alert;
  },

  updateAlert: async (
    alertId: string,
    userId: string,
    updateData: Partial<CreateAlertParams & { enabled: boolean }>
  ) => {
    const alert = await prisma.alertRule.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundError('Alert rule not found');
    }

    // Verify user access
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId: alert.orgId,
        },
      },
    });

    if (!role || !['admin', 'finance'].includes(role.role)) {
      throw new ForbiddenError('Only admins and finance users can update alerts');
    }

    // Validate if metric/operator provided
    if (updateData.metric && !VALID_METRICS.includes(updateData.metric)) {
      throw new ValidationError(
        `Invalid metric. Must be one of: ${VALID_METRICS.join(', ')}`
      );
    }

    if (updateData.operator && !VALID_OPERATORS.includes(updateData.operator)) {
      throw new ValidationError(
        `Invalid operator. Must be one of: ${VALID_OPERATORS.join(', ')}`
      );
    }

    // Update alert
    const updated = await prisma.alertRule.update({
      where: { id: alertId },
      data: {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.metric && { metric: updateData.metric }),
        ...(updateData.operator && { operator: updateData.operator }),
        ...(updateData.threshold !== undefined && { threshold: updateData.threshold }),
        ...(updateData.enabled !== undefined && { enabled: updateData.enabled }),
        ...(updateData.notifyEmail !== undefined && { notifyEmail: updateData.notifyEmail }),
        ...(updateData.notifySlack !== undefined && { notifySlack: updateData.notifySlack }),
        ...(updateData.slackWebhook !== undefined && { slackWebhook: updateData.slackWebhook }),
      },
    });

    // Log audit event
    await auditService.log({
      actorUserId: userId,
      orgId: alert.orgId,
      action: 'alert_updated',
      objectType: 'alert_rule',
      objectId: alertId,
      metaJson: updateData,
    });

    return updated;
  },

  deleteAlert: async (alertId: string, userId: string) => {
    const alert = await prisma.alertRule.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundError('Alert rule not found');
    }

    // Verify user access (admin only)
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId: alert.orgId,
        },
      },
    });

    if (!role || role.role !== 'admin') {
      throw new ForbiddenError('Only admins can delete alerts');
    }

    await prisma.alertRule.delete({
      where: { id: alertId },
    });

    // Log audit event
    await auditService.log({
      actorUserId: userId,
      orgId: alert.orgId,
      action: 'alert_deleted',
      objectType: 'alert_rule',
      objectId: alertId,
    });
  },

  testAlert: async (alertId: string, userId: string, testValue: number) => {
    const alert = await prisma.alertRule.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundError('Alert rule not found');
    }

    // Verify user access
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId: alert.orgId,
        },
      },
    });

    if (!role) {
      throw new ForbiddenError('No access to this alert rule');
    }

    // Evaluate condition
    let triggered = false;
    const threshold = Number(alert.threshold);

    switch (alert.operator) {
      case '<':
        triggered = testValue < threshold;
        break;
      case '>':
        triggered = testValue > threshold;
        break;
      case '<=':
        triggered = testValue <= threshold;
        break;
      case '>=':
        triggered = testValue >= threshold;
        break;
      case '==':
        triggered = testValue === threshold;
        break;
      case '!=':
        triggered = testValue !== threshold;
        break;
    }

    return {
      triggered,
      message: triggered
        ? `Alert "${alert.name}" would be triggered: ${testValue} ${alert.operator} ${threshold}`
        : `Alert "${alert.name}" would not be triggered: ${testValue} ${alert.operator} ${threshold}`,
    };
  },
};


