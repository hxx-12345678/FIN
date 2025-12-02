import { auditService } from './audit.service';

export interface CreateSlackTaskParams {
  message: string;
  channel?: string;
  priority?: string;
}

export interface CreateEmailTaskParams {
  to: string | string[];
  subject: string;
  body: string;
  priority?: string;
}

export const taskService = {
  createSlackTask: async (
    orgId: string,
    userId: string,
    params: CreateSlackTaskParams
  ) => {
    // Stub implementation - in production, integrate with Slack API
    const task = {
      id: `slack-task-${Date.now()}`,
      type: 'slack',
      orgId,
      userId,
      message: params.message,
      channel: params.channel || '#general',
      priority: params.priority || 'normal',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Log audit event
    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'slack_task_created',
      objectType: 'task',
      objectId: task.id,
      metaJson: {
        message: params.message,
        channel: params.channel,
      },
    });

    return task;
  },

  createEmailTask: async (
    orgId: string,
    userId: string,
    params: CreateEmailTaskParams
  ) => {
    // Stub implementation - in production, integrate with email service (SendGrid, SES, etc.)
    const task = {
      id: `email-task-${Date.now()}`,
      type: 'email',
      orgId,
      userId,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      body: params.body,
      priority: params.priority || 'normal',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Log audit event
    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'email_task_created',
      objectType: 'task',
      objectId: task.id,
      metaJson: {
        to: params.to,
        subject: params.subject,
      },
    });

    return task;
  },
};


