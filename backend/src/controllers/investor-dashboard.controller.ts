/**
 * Investor Dashboard Controller
 * API endpoints for investor dashboard data
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { investorDashboardService } from '../services/investor-dashboard.service';
import { ValidationError } from '../utils/errors';
import prisma from '../config/database';

export const investorDashboardController = {
  /**
   * GET /api/v1/orgs/:orgId/investor-dashboard
   * Get investor dashboard data for an organization
   */
  getDashboard: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;

      // Note: requireOrgAccess middleware already verifies access, but keeping this as defense in depth
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

      const dashboardData = await investorDashboardService.getDashboardData(orgId);

      res.json({
        ok: true,
        data: dashboardData,
      });
    } catch (error) {
      next(error);
    }
  },
};


