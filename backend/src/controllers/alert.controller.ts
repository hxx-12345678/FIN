import { Response, NextFunction } from 'express';
import { alertService } from '../services/alert.service';
import { ValidationError, NotFoundError } from '../utils/errors';
import { AuthRequest } from '../middlewares/auth';

export const alertController = {
  /**
   * POST /api/v1/orgs/:orgId/alerts - Create alert rule
   */
  createAlert: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const {
        name,
        description,
        metric,
        operator,
        threshold,
        notifyEmail,
        notifySlack,
        slackWebhook,
      } = req.body;

      if (!name || !metric || !operator || threshold === undefined) {
        throw new ValidationError('name, metric, operator, and threshold are required');
      }

      const alert = await alertService.createAlert(orgId, req.user.id, {
        name,
        description,
        metric,
        operator,
        threshold,
        notifyEmail,
        notifySlack,
        slackWebhook,
      });

      res.status(201).json({
        ok: true,
        alert,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/alerts - List alert rules
   */
  listAlerts: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const enabled = req.query.enabled === 'true' ? true : req.query.enabled === 'false' ? false : undefined;

      const alerts = await alertService.listAlerts(orgId, req.user.id, enabled);

      res.json({
        ok: true,
        alerts,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/alerts/:alertId - Get alert rule
   */
  getAlert: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { alertId } = req.params;
      const alert = await alertService.getAlert(alertId, req.user.id);

      res.json({
        ok: true,
        alert,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/alerts/:alertId - Update alert rule
   */
  updateAlert: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { alertId } = req.params;
      const updateData = req.body;

      const alert = await alertService.updateAlert(alertId, req.user.id, updateData);

      res.json({
        ok: true,
        alert,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/alerts/:alertId - Delete alert rule
   */
  deleteAlert: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { alertId } = req.params;
      await alertService.deleteAlert(alertId, req.user.id);

      res.json({
        ok: true,
        message: 'Alert rule deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/alerts/:alertId/test - Test alert rule
   */
  testAlert: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { alertId } = req.params;
      const { testValue } = req.body;

      if (testValue === undefined) {
        throw new ValidationError('testValue is required');
      }

      const result = await alertService.testAlert(alertId, req.user.id, Number(testValue));

      res.json({
        ok: true,
        triggered: result.triggered,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },
};


