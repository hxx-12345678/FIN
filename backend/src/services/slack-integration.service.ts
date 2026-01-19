/**
 * SLACK INTEGRATION SERVICE
 * Sends reports and notifications to Slack
 * Similar to Abacum's Slack integration feature
 */

import { logger } from '../utils/logger';
import { ValidationError, NotFoundError } from '../utils/errors';
import prisma from '../config/database';

export interface SlackConfig {
  webhookUrl?: string;
  botToken?: string;
  defaultChannel?: string;
}

export interface SlackMessage {
  text: string;
  channel?: string;
  blocks?: any[];
  attachments?: any[];
}

export interface SendReportRequest {
  exportId: string;
  orgId: string;
  channels: string[];
  message?: string;
  includeFile?: boolean;
}

export const slackIntegrationService = {
  /**
   * Configure Slack for an organization
   */
  configureSlack: async (
    orgId: string,
    userId: string,
    config: SlackConfig
  ): Promise<void> => {
    try {
      // Validate org access
      const userRole = await prisma.userOrgRole.findUnique({
        where: { userId_orgId: { userId, orgId } },
      });

      if (!userRole || !['admin', 'finance'].includes(userRole.role)) {
        throw new ValidationError('Only admins and finance users can configure Slack');
      }

      // Validate webhook URL or bot token
      if (!config.webhookUrl && !config.botToken) {
        throw new ValidationError('Either webhook URL or bot token is required');
      }

      if (config.webhookUrl && !isValidWebhookUrl(config.webhookUrl)) {
        throw new ValidationError('Invalid Slack webhook URL');
      }

      // Store config in org settings (using metaJson for now)
      // In production, create a dedicated slack_configs table
      const existing = await prisma.orgSettings.findUnique({ where: { orgId } });
      const existingMeta = (existing?.metaJson as any) || {};
      
      await prisma.orgSettings.upsert({
        where: { orgId },
        update: {
          metaJson: {
            ...existingMeta,
            slack: config,
          } as any,
        },
        create: {
          orgId,
          metaJson: { slack: config } as any,
        },
      } as any);

      logger.info(`Slack configured for org ${orgId}`, { userId });
    } catch (error: any) {
      logger.error('Error configuring Slack', error);
      throw error;
    }
  },

  /**
   * Get Slack configuration
   */
  getSlackConfig: async (orgId: string, userId: string): Promise<SlackConfig | null> => {
    try {
      const settings = await prisma.orgSettings.findUnique({
        where: { orgId },
      });

      if (!settings?.metaJson) {
        return null;
      }

      const meta = settings.metaJson as any;
      return meta.slack || null;
    } catch (error: any) {
      logger.error('Error getting Slack config', error);
      return null;
    }
  },

  /**
   * Send report to Slack
   */
  sendReport: async (
    request: SendReportRequest,
    userId: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    try {
      // Get export
      const exportRecord = await prisma.export.findUnique({
        where: { id: request.exportId },
      });

      if (!exportRecord) {
        throw new NotFoundError('Export not found');
      }

      if (exportRecord.orgId !== request.orgId) {
        throw new ValidationError('Export does not belong to this organization');
      }

      // Get Slack config
      const config = await slackIntegrationService.getSlackConfig(request.orgId, userId);
      if (!config || (!config.webhookUrl && !config.botToken)) {
        throw new ValidationError('Slack is not configured for this organization');
      }

      // Validate channels
      if (!request.channels || request.channels.length === 0) {
        throw new ValidationError('At least one channel is required');
      }

      // Validate channel format
      for (const channel of request.channels) {
        if (!isValidSlackChannel(channel)) {
          throw new ValidationError(`Invalid Slack channel format: ${channel}`);
        }
      }

      // Build message
      const message: SlackMessage = {
        text: request.message || `Financial Report: ${exportRecord.type.toUpperCase()}`,
        channel: request.channels[0], // Primary channel
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `📊 Financial Report: ${exportRecord.type.toUpperCase()}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: request.message || `A new financial report has been generated.`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Type:*\n${exportRecord.type}`,
              },
              {
                type: 'mrkdwn',
                text: `*Status:*\n${exportRecord.status}`,
              },
              {
                type: 'mrkdwn',
                text: `*Created:*\n${new Date(exportRecord.createdAt).toLocaleDateString()}`,
              },
            ],
          },
        ],
      };

      // Send to each channel
      const results = [];
      for (const channel of request.channels) {
        try {
          const result = await sendSlackMessage(config, { ...message, channel });
          results.push({ channel, success: true, messageId: result.ts });
        } catch (error: any) {
          logger.error(`Failed to send to channel ${channel}`, error);
          results.push({ channel, success: false, error: error.message });
        }
      }

      const allSuccess = results.every(r => r.success);
      const firstError = results.find(r => !r.success)?.error;

      logger.info(`Report sent to Slack`, {
        exportId: request.exportId,
        orgId: request.orgId,
        channels: request.channels,
        results,
      });

      return {
        success: allSuccess,
        messageId: results[0]?.messageId,
        error: allSuccess ? undefined : firstError,
      };
    } catch (error: any) {
      logger.error('Error sending report to Slack', error);
      throw error;
    }
  },

  /**
   * Send anomaly notification to Slack
   */
  sendAnomalyNotification: async (
    orgId: string,
    userId: string,
    anomaly: any,
    channel?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const config = await slackIntegrationService.getSlackConfig(orgId, userId);
      if (!config || (!config.webhookUrl && !config.botToken)) {
        throw new ValidationError('Slack is not configured');
      }

      const severityEmoji = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
      };

      const message: SlackMessage = {
        text: `Anomaly Detected: ${anomaly.title}`,
        channel: channel || config.defaultChannel,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${severityEmoji[anomaly.severity as keyof typeof severityEmoji] || '⚠️'} Anomaly Detected`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${anomaly.title}*\n\n${anomaly.description}`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Severity:*\n${anomaly.severity}`,
              },
              {
                type: 'mrkdwn',
                text: `*Type:*\n${anomaly.type}`,
              },
              ...(anomaly.amount ? [{
                type: 'mrkdwn',
                text: `*Amount:*\n$${anomaly.amount.toLocaleString()}`,
              }] : []),
              ...(anomaly.variancePercent ? [{
                type: 'mrkdwn',
                text: `*Variance:*\n${anomaly.variancePercent.toFixed(1)}%`,
              }] : []),
            ],
          },
          ...(anomaly.recommendations && anomaly.recommendations.length > 0 ? [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Recommendations:*\n${anomaly.recommendations.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}`,
            },
          }] : []),
        ],
      };

      const result = await sendSlackMessage(config, message);

      logger.info(`Anomaly notification sent to Slack`, {
        orgId,
        anomalyId: anomaly.id,
        channel: message.channel,
      });

      return { success: true };
    } catch (error: any) {
      logger.error('Error sending anomaly notification to Slack', error);
      return { success: false, error: error.message };
    }
  },
};

/**
 * Send message to Slack
 */
async function sendSlackMessage(
  config: SlackConfig,
  message: SlackMessage
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  try {
    if (config.webhookUrl) {
      // Use webhook
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message.text,
          channel: message.channel,
          blocks: message.blocks,
          attachments: message.attachments,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Slack API error: ${errorText}`);
      }

      return { ok: true, ts: Date.now().toString() };
    } else if (config.botToken) {
      // Use bot token (chat.postMessage API)
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.botToken}`,
        },
        body: JSON.stringify({
          channel: message.channel,
          text: message.text,
          blocks: message.blocks,
          attachments: message.attachments,
        }),
      });

      const data = await response.json() as { ok: boolean; ts?: string; error?: string };

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error || 'Unknown error'}`);
      }

      return { ok: true, ts: data.ts };
    } else {
      throw new ValidationError('No Slack configuration available');
    }
  } catch (error: any) {
    // Handle rate limiting
    if (error.message?.includes('rate_limit')) {
      throw new ValidationError('Slack rate limit exceeded. Please try again later.');
    }

    // Handle invalid channel
    if (error.message?.includes('channel_not_found')) {
      throw new ValidationError(`Slack channel not found: ${message.channel}`);
    }

    // Handle bot not in channel
    if (error.message?.includes('not_in_channel')) {
      throw new ValidationError(`Bot is not in channel: ${message.channel}`);
    }

    throw error;
  }
}

/**
 * Validate webhook URL
 */
function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' &&
           (parsed.hostname === 'hooks.slack.com' || parsed.hostname.includes('slack.com'));
  } catch {
    return false;
  }
}

/**
 * Validate Slack channel format
 */
function isValidSlackChannel(channel: string): boolean {
  // Channel format: #channel-name or channel-id (C1234567890)
  return /^[#]?[a-z0-9_-]+$/.test(channel) || /^C[A-Z0-9]+$/.test(channel);
}

