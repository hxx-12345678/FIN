import prisma from '../config/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { auditService } from './audit.service';
import { emailService } from './email.service';
import { logger } from '../utils/logger';

export interface CreateAlertParams {
  name: string;
  description?: string;
  metric: string;
  operator: string;
  threshold: number;
  notifyEmail?: boolean;
  notifySlack?: boolean;
  slackWebhook?: string;
  severity?: string;
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
        severity: params.severity || 'warning',
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
        ...(updateData.severity !== undefined && { severity: updateData.severity }),
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

    // Delete corresponding notifications 
    try {
      await prisma.$executeRaw`
        DELETE FROM "notifications"
        WHERE "metadata"->>'alertId' = ${alertId}
      `;
    } catch (e) {
      logger.error('Failed to delete associated notifications: ' + e);
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
      include: {
        user: true,
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

    // ALWAYS send email if triggered AND (severity is critical OR user explicitly enabled it)
    const shouldNotifyEmail = triggered && (alert.severity === 'critical' || alert.notifyEmail);

    if (shouldNotifyEmail && role.user?.email) {
      const emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; border-left: 10px solid ${alert.severity === 'critical' ? '#dc2626' : '#d97706'}; background-color: #fef2f2;">
          <h2 style="color: ${alert.severity === 'critical' ? '#dc2626' : '#d97706'}; font-size: 24px; margin-bottom: 20px;">
            ${alert.severity === 'critical' ? '🚨 CRITICAL ALERT:' : '⚠️ ALERT:'} ${alert.name}
          </h2>
          <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <p style="margin-bottom: 15px; font-size: 16px;">The following threshold was breached for <strong>${alert.metric}</strong>:</p>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Condition</strong></td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${alert.metric} ${alert.operator} ${threshold}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Actual Value</strong></td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #dc2626; font-weight: bold;">${testValue}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0;"><strong>Severity</strong></td>
                    <td style="padding: 10px 0;"><span style="background: ${alert.severity === 'critical' ? '#fee2e2' : '#fef3c7'}; color: ${alert.severity === 'critical' ? '#991b1b' : '#92400e'}; padding: 4px 12px; border-radius: 999px; font-size: 14px; font-weight: bold;">${alert.severity.toUpperCase()}</span></td>
                </tr>
            </table>
          </div>
          <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
            This is an automated security/financial alert from your FinaPilot dashboard. 
            ${alert.severity === 'critical' ? '<strong>Notice:</strong> Critical alerts are sent regardless of notification preferences for your protection.' : ''}
          </p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard#alerts" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Details in Dashboard</a>
          </div>
        </div>
      `;
      await emailService.sendEmail({
        to: role.user.email,
        subject: `${alert.severity === 'critical' ? '🚨 CRITICAL ALERT:' : '⚠️ Alert:'} ${alert.name} for ${role.user.name || 'Your Org'}`,
        html: emailHtml,
      });

      // Also create a persistent notification in the DB so it shows up in the UI
      await prisma.notification.create({
        data: {
          orgId: alert.orgId,
          userId: role.userId,
          type: 'alert',
          title: `${alert.severity === 'critical' ? 'CRITICAL: ' : ''}${alert.name}`,
          message: `${alert.metric} is ${testValue} (${alert.operator} ${threshold})`,
          category: 'financial',
          priority: alert.severity === 'critical' ? 'high' : 'medium',
          metadata: {
            alertId: alert.id,
            metric: alert.metric,
            value: testValue,
            threshold: threshold,
            operator: alert.operator
          }
        }
      });
    }

    return {
      triggered,
      message: triggered
        ? `Alert "${alert.name}" triggered: ${testValue} ${alert.operator} ${threshold}`
        : `Alert "${alert.name}" not triggered: ${testValue} ${alert.operator} ${threshold}`,
    };
  },

  getAuditLogs: async (orgId: string, userId: string) => {
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

    return await prisma.auditLog.findMany({
      where: { 
        orgId,
        OR: [
          { objectType: 'alert_rule' },
          { action: { contains: 'alert' } },
          { action: { contains: 'notification' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        actorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  },
};


