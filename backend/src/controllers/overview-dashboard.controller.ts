/**
 * Overview Dashboard Controller
 * API endpoints for overview dashboard data
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { overviewDashboardService } from '../services/overview-dashboard.service';
import { ValidationError } from '../utils/errors';
import { validateUUID } from '../utils/validation';
import prisma from '../config/database';

export const overviewDashboardController = {
  /**
   * GET /api/v1/orgs/:orgId/overview
   * Get overview dashboard data for an organization
   */
  getOverview: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;

      // Validate UUID format
      try {
        validateUUID(orgId, 'Organization ID');
      } catch (error) {
        throw new ValidationError('Invalid organization ID format');
      }

      // Verify user has access to this org
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId: req.user.id,
            orgId,
          },
        },
      });

      if (!role) {
        throw new ValidationError('No access to this organization');
      }

      const overviewData = await overviewDashboardService.getOverviewData(orgId);

      res.json({
        ok: true,
        data: overviewData,
      });
    } catch (error) {
      next(error);
    }
  },
};


