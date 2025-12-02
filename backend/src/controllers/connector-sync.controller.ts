/**
 * Connector Sync Controller
 * Handles scheduled sync and health reporting
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { connectorSyncService } from '../services/connector-sync.service';
import { scheduledConnectorSyncService } from '../services/scheduled-connector-sync.service';

export const connectorSyncController = {
  /**
   * GET /api/v1/connectors/:id/health
   * Get connector sync health
   */
  getConnectorHealth: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        });
      }

      const { id } = req.params;
      const health = await connectorSyncService.getConnectorHealth(req.user.id, id);

      res.json({
        ok: true,
        health,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/v1/connectors/:id/sync-settings
   * Update connector sync settings
   */
  updateSyncSettings: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        });
      }

      const { id } = req.params;
      const { syncFrequencyHours, autoSyncEnabled } = req.body;

      await connectorSyncService.updateSyncSettings(req.user.id, id, {
        syncFrequencyHours,
        autoSyncEnabled,
      });

      res.json({
        ok: true,
        message: 'Sync settings updated',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/connectors/scheduled/sync
   * Manually trigger scheduled connector sync (for cron)
   */
  triggerScheduledSync: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Optional: Add API key authentication for cron jobs
      const apiKey = req.headers['x-api-key'] || req.query.apiKey;
      const expectedApiKey = process.env.SCHEDULED_JOB_API_KEY;

      if (expectedApiKey && apiKey !== expectedApiKey) {
        return res.status(401).json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid API key',
          },
        });
      }

      const result = await scheduledConnectorSyncService.createScheduledSyncJob();

      if (result.success) {
        res.json({
          ok: true,
          jobId: result.jobId,
          message: 'Scheduled connector sync job created',
        });
      } else {
        res.status(500).json({
          ok: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: result.error || 'Failed to create scheduled job',
          },
        });
      }
    } catch (error) {
      next(error);
    }
  },
};


