import { Request, Response, NextFunction } from 'express';
import { scheduledAutoModelService } from '../services/scheduled-auto-model.service';
import { AuthRequest } from '../middlewares/auth';

export const scheduledAutoModelController = {
  /**
   * Manually trigger scheduled auto-model job (for cron or manual execution)
   * This endpoint should be called every 6 hours
   */
  triggerScheduled: async (req: Request, res: Response, next: NextFunction) => {
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

      const result = await scheduledAutoModelService.createScheduledAutoModelJob();

      if (result.success) {
        res.json({
          ok: true,
          jobId: result.jobId,
          message: 'Scheduled auto-model job created',
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


