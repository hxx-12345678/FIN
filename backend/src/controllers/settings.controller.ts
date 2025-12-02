import { Response, NextFunction } from 'express';
import { settingsService } from '../services/settings.service';
import { ValidationError } from '../utils/errors';
import { AuthRequest } from '../middlewares/auth';

export const settingsController = {
  /**
   * GET /api/v1/orgs/:orgId/settings - Get org settings
   */
  getSettings: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const settings = await settingsService.getSettings(orgId, req.user.id);

      res.json({
        ok: true,
        settings,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/orgs/:orgId/settings - Update org settings
   */
  updateSettings: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const {
        dataRetentionDays,
        currency,
        timezone,
        region,
      } = req.body;

      const settings = await settingsService.updateSettings(orgId, req.user.id, {
        dataRetentionDays,
        currency,
        timezone,
        region,
      });

      res.json({
        ok: true,
        settings,
      });
    } catch (error) {
      next(error);
    }
  },
};


