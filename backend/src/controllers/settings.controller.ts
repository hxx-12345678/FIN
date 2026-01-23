/**
 * Settings Controller
 * API endpoints for comprehensive settings management
 */

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
        data: settings,
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
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/users/profile - Get user profile
   */
  getProfile: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const profile = await settingsService.getProfile(req.user.id);

      res.json({
        ok: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/users/profile - Update user profile
   */
  updateProfile: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const {
        name,
        email,
        phone,
        jobTitle,
        bio,
        timezone,
      } = req.body;

      const profile = await settingsService.updateProfile(req.user.id, {
        name,
        email,
        phone,
        jobTitle,
        bio,
        timezone,
      });

      res.json({
        ok: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/organization - Get organization details
   */
  getOrganization: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const org = await settingsService.getOrganization(orgId, req.user.id);

      res.json({
        ok: true,
        data: org,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/orgs/:orgId/organization - Update organization details
   */
  updateOrganization: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const {
        name,
        industry,
        companySize,
        website,
        address,
        taxId,
        currency,
      } = req.body;

      const org = await settingsService.updateOrganization(orgId, req.user.id, {
        name,
        industry,
        companySize,
        website,
        address,
        taxId,
        currency,
      });

      res.json({
        ok: true,
        data: org,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/users/appearance - Get appearance preferences
   */
  getAppearance: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const appearance = await settingsService.getAppearance(req.user.id);

      res.json({
        ok: true,
        data: appearance,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/users/appearance - Update appearance preferences
   */
  updateAppearance: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const {
        theme,
        themeColor,
        fontSize,
        dateFormat,
        animations,
      } = req.body;

      const appearance = await settingsService.updateAppearance(req.user.id, {
        theme,
        themeColor,
        fontSize,
        dateFormat,
        animations,
      });

      res.json({
        ok: true,
        data: appearance,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/notifications/preferences - Get notification preferences
   */
  getNotificationPreferences: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const preferences = await settingsService.getNotificationPreferences(orgId, req.user.id);

      res.json({
        ok: true,
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/orgs/:orgId/notifications/preferences - Update notification preferences
   */
  updateNotificationPreferences: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const {
        emailNotifications,
        pushNotifications,
        weeklyDigest,
        alertNotifications,
        marketingEmails,
      } = req.body;

      const preferences = await settingsService.updateNotificationPreferences(orgId, req.user.id, {
        emailNotifications,
        pushNotifications,
        weeklyDigest,
        alertNotifications,
        marketingEmails,
      });

      res.json({
        ok: true,
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/localization - Get localization settings
   */
  getLocalization: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const localization = await settingsService.getLocalization(orgId, req.user.id);

      res.json({
        ok: true,
        data: localization,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/orgs/:orgId/localization - Update localization settings
   */
  updateLocalization: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const {
        baseCurrency,
        displayCurrency,
        language,
        timezone,
        dateFormat,
        numberFormat,
        autoFxUpdate,
        gstEnabled,
        tdsEnabled,
        einvoicingEnabled,
        fxRates,
        complianceData,
      } = req.body;

      const localization = await settingsService.updateLocalization(orgId, req.user.id, {
        baseCurrency,
        displayCurrency,
        language,
        timezone,
        dateFormat,
        numberFormat,
        autoFxUpdate,
        gstEnabled,
        tdsEnabled,
        einvoicingEnabled,
        fxRates,
        complianceData,
      });

      res.json({
        ok: true,
        data: localization,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/users/password/change - Change password
   */
  changePassword: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new ValidationError('Current password and new password are required');
      }

      await settingsService.changePassword(req.user.id, {
        currentPassword,
        newPassword,
      });

      res.json({
        ok: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/api-key - Get API key
   */
  getApiKey: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const apiKey = await settingsService.getApiKey(orgId, req.user.id);

      res.json({
        ok: true,
        data: apiKey,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orgs/:orgId/api-key/regenerate - Regenerate API key
   */
  regenerateApiKey: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const apiKey = await settingsService.regenerateApiKey(orgId, req.user.id);

      res.json({
        ok: true,
        data: apiKey,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/sync-audit - Get sync audit log
   */
  getSyncAuditLog: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { limit, offset } = req.query;

      const result = await settingsService.getSyncAuditLog(orgId, req.user.id, {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        ok: true,
        data: result.syncs,
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/export-data - Export all organization data
   */
  exportData: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const exportData = await settingsService.exportData(orgId, req.user.id);

      res.json({
        ok: true,
        data: exportData,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/users/profile - Delete user account (GDPR Right to Erasure)
   */
  deleteProfile: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      await settingsService.deleteProfile(req.user.id);

      res.json({
        ok: true,
        message: 'User account and all associated data deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orgs/:orgId/localization/fx-rates/update - Update FX rates
   */
  updateFxRates: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { baseCurrency } = req.body;

      const fxRateService = (await import('../services/fx-rate.service')).fxRateService;
      const result = await fxRateService.updateFxRates(orgId, req.user.id, baseCurrency);

      res.json({
        ok: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};
