import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { ValidationError, ForbiddenError } from '../utils/errors';
import { auditService } from '../services/audit.service';

export const debugController = {
  createDemo: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      // Rate limit: Only allow one demo org per user
      const existingDemo = await prisma.org.findFirst({
        where: {
          name: {
            contains: 'Demo',
          },
          roles: {
            some: {
              userId: req.user.id,
              role: 'admin',
            },
          },
        },
      });

      if (existingDemo) {
        return res.json({
          ok: true,
          org: existingDemo,
          message: 'Demo company already exists for this user',
        });
      }

      // Create demo org with sample data in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create demo org
        const demoOrg = await tx.org.create({
          data: {
            name: `Demo Company ${Date.now()}`,
            planTier: 'free',
            currency: 'USD',
            timezone: 'UTC',
          },
        });

        // Create demo user role
        await tx.userOrgRole.create({
          data: {
            userId: req.user!.id,
            orgId: demoOrg.id,
            role: 'admin',
          },
        });

        // Create sample model
        const demoModel = await tx.model.create({
          data: {
            orgId: demoOrg.id,
            name: 'Demo SaaS Model',
            modelJson: {
              type: 'saas',
              timeHorizon: 12,
              assumptions: {
                revenueGrowth: 0.08,
                churnRate: 0.05,
                baselineRevenue: 100000,
                baselineExpenses: 80000,
              },
            },
            createdById: req.user!.id,
          },
        });

        // Create baseline model run
        const baselineRun = await tx.modelRun.create({
          data: {
            modelId: demoModel.id,
            orgId: demoOrg.id,
            runType: 'baseline',
            status: 'done',
            summaryJson: {
              totalRevenue: 1200000,
              totalExpenses: 960000,
              netIncome: 240000,
              cashBalance: 500000,
              runwayMonths: 6.25,
              burnRate: 80000,
            },
          },
        });

        // Create sample transactions
        const sampleTransactions = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 15);
          sampleTransactions.push({
            orgId: demoOrg.id,
            date,
            amount: i % 2 === 0 ? 10000 : -8000,
            currency: 'USD',
            category: i % 2 === 0 ? 'Revenue' : 'Operating Expenses',
            description: i % 2 === 0 ? 'Monthly recurring revenue' : 'Monthly operating costs',
          });
        }

        await tx.rawTransaction.createMany({
          data: sampleTransactions,
        });

        // Create org settings
        await tx.orgSettings.create({
          data: {
            orgId: demoOrg.id,
            dataRetentionDays: 365,
            currency: 'USD',
            timezone: 'UTC',
            region: 'global',
            updatedById: req.user!.id,
          },
        });

        return { demoOrg, demoModel, baselineRun };
      });

      // Log audit event
      await auditService.log({
        actorUserId: req.user.id,
        orgId: result.demoOrg.id,
        action: 'demo_company_created',
        objectType: 'org',
        objectId: result.demoOrg.id,
      });

      res.status(201).json({
        ok: true,
        org: {
          id: result.demoOrg.id,
          name: result.demoOrg.name,
          planTier: result.demoOrg.planTier,
        },
        model: {
          id: result.demoModel.id,
          name: result.demoModel.name,
        },
        baselineRun: {
          id: result.baselineRun.id,
          summaryJson: result.baselineRun.summaryJson,
        },
        message: 'Demo company created successfully with sample data',
      });
    } catch (error) {
      next(error);
    }
  },
};

