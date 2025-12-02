import { Response, NextFunction } from 'express';
import { taskService } from '../services/task.service';
import { ValidationError } from '../utils/errors';
import { AuthRequest } from '../middlewares/auth';

export const taskController = {
  /**
   * POST /api/v1/tasks/slack - Create Slack task (stub)
   */
  createSlackTask: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, message, channel, priority } = req.body;

      if (!message) {
        throw new ValidationError('message is required');
      }

      const task = await taskService.createSlackTask(orgId, req.user.id, {
        message,
        channel,
        priority,
      });

      res.status(201).json({
        ok: true,
        task,
        message: 'Slack task creation is a stub - will be implemented with Slack API integration',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/tasks/email - Create email task (stub)
   */
  createEmailTask: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, to, subject, body, priority } = req.body;

      if (!to || !subject || !body) {
        throw new ValidationError('to, subject, and body are required');
      }

      const task = await taskService.createEmailTask(orgId, req.user.id, {
        to,
        subject,
        body,
        priority,
      });

      res.status(201).json({
        ok: true,
        task,
        message: 'Email task creation is a stub - will be implemented with email service integration',
      });
    } catch (error) {
      next(error);
    }
  },
};


