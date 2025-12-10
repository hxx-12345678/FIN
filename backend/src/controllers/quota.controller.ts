import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { quotaService } from '../services/quota.service';
import { ValidationError } from '../utils/errors';

export const quotaController = {
  /**
   * GET /api/v1/orgs/:orgId/quota
   * Get quota usage for organization
   */
  getQuotaUsage: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;

      if (!orgId) {
        throw new ValidationError('orgId is required');
      }

      const quota = await quotaService.getQuotaUsage(orgId);

      res.json({
        ok: true,
        quota,
      });
    } catch (error) {
      next(error);
    }
  },
};

