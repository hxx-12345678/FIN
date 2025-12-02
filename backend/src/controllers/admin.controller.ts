import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { ForbiddenError, ValidationError } from '../utils/errors';

export const adminController = {
  getMetrics: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      // Check global admin role (assuming user has a global role field or we check specific org)
      // For this MVP, we'll assume admin role in ANY org allows access, OR enforce strict super-admin logic
      // Better: Check if user is admin in the "System" org or has a global flag
      // For now, I will enforce that the user must have 'admin' role in at least one org to see this, 
      // but ideally this should be restricted to system admins.
      
      // Let's check if they are an admin in *any* organization for now (or specific system org)
      const adminRole = await prisma.userOrgRole.findFirst({
        where: {
          userId: req.user.id,
          role: 'admin',
        },
      });

      if (!adminRole) {
        throw new ForbiddenError('Admin access required');
      }

      // 1. Counts
      const [totalOrgs, totalUsers, totalModels, totalJobs] = await Promise.all([
        prisma.org.count(),
        prisma.user.count(),
        prisma.model.count(),
        prisma.job.count(),
      ]);

      // 2. Job Statuses
      const jobStats = await prisma.job.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
      });

      // 3. Monte Carlo Usage (Top 10 Orgs)
      // Assuming billing_usage table tracks this, or we count monte_carlo_jobs
      const monteCarloUsage = await prisma.monteCarloJob.groupBy({
        by: ['orgId'],
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 10,
      });

      // Enrich with org names
      const mcUsageWithNames = await Promise.all(
        monteCarloUsage.map(async (item) => {
          const org = await prisma.org.findUnique({
            where: { id: item.orgId },
            select: { name: true },
          });
          return {
            orgName: org?.name || 'Unknown',
            orgId: item.orgId,
            count: item._count.id,
          };
        })
      );

      // 4. Failed Runs Last 24h
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const failedRuns = await prisma.modelRun.count({
        where: {
          status: 'failed',
          createdAt: {
            gte: yesterday,
          },
        },
      });

      // 5. Alerts Count
      const alertsCount = await prisma.alertRule.count({
        where: { enabled: true },
      });

      res.json({
        ok: true,
        metrics: {
          totals: {
            orgs: totalOrgs,
            users: totalUsers,
            models: totalModels,
            jobs: totalJobs,
          },
          jobsByStatus: jobStats.reduce((acc, curr) => {
            acc[curr.status] = curr._count.id;
            return acc;
          }, {} as Record<string, number>),
          monteCarloUsage: mcUsageWithNames,
          operational: {
            failedRunsLast24h: failedRuns,
            activeAlerts: alertsCount,
          },
          generatedAt: new Date(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
