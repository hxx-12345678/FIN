/**
 * HEADCOUNT PLANNING SERVICE
 * Dedicated workflow for planning headcount, hiring, and team growth
 * Similar to Abacum's headcount planning feature
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';

export interface HeadcountPlan {
  id?: string;
  orgId: string;
  name: string;
  department?: string;
  role: string;
  startDate: Date;
  endDate?: Date;
  quantity: number;
  salary?: number;
  totalCost?: number;
  status: 'planned' | 'approved' | 'hiring' | 'filled' | 'cancelled';
  notes?: string;
}

export interface CreateHeadcountPlanRequest {
  orgId: string;
  name: string;
  department?: string;
  role: string;
  startDate: string;
  endDate?: string;
  quantity: number;
  salary?: number;
  notes?: string;
}

export interface HeadcountForecast {
  month: string;
  headcount: number;
  cost: number;
  byDepartment: Record<string, { headcount: number; cost: number }>;
}

export const headcountPlanningService = {
  /**
   * Create a headcount plan
   */
  createPlan: async (
    request: CreateHeadcountPlanRequest,
    userId: string
  ): Promise<HeadcountPlan> => {
    try {
      // Validate org access
      const userRole = await prisma.userOrgRole.findUnique({
        where: { userId_orgId: { userId, orgId: request.orgId } },
      });

      if (!userRole || !['admin', 'finance'].includes(userRole.role)) {
        throw new ForbiddenError('Only admins and finance users can create headcount plans');
      }

      // Validate inputs
      if (request.quantity <= 0) {
        throw new ValidationError('Quantity must be greater than 0');
      }

      if (request.quantity > 1000) {
        throw new ValidationError('Quantity cannot exceed 1000');
      }

      const startDate = new Date(request.startDate);
      if (isNaN(startDate.getTime())) {
        throw new ValidationError('Invalid start date');
      }

      if (startDate < new Date()) {
        throw new ValidationError('Start date cannot be in the past');
      }

      let endDate: Date | undefined;
      if (request.endDate) {
        endDate = new Date(request.endDate);
        if (isNaN(endDate.getTime())) {
          throw new ValidationError('Invalid end date');
        }
        if (endDate < startDate) {
          throw new ValidationError('End date must be after start date');
        }
      }

      if (request.salary && request.salary < 0) {
        throw new ValidationError('Salary cannot be negative');
      }

      // Calculate total cost
      const totalCost = request.salary && request.quantity
        ? request.salary * request.quantity * 12 // Annual cost
        : undefined;

      // Store in database (using a generic table or JSON for now)
      // In production, create a dedicated headcount_plans table
      const plan: HeadcountPlan = {
        orgId: request.orgId,
        name: request.name,
        department: request.department,
        role: request.role,
        startDate,
        endDate,
        quantity: request.quantity,
        salary: request.salary,
        totalCost,
        status: 'planned',
        notes: request.notes,
      };

      // For now, store in org settings metaJson
      // In production, use dedicated table
      const settings = await prisma.orgSettings.findUnique({
        where: { orgId: request.orgId },
      });

      const existingPlans = (settings?.metaJson as any)?.headcountPlans || [];
      existingPlans.push({
        ...plan,
        id: `plan_${Date.now()}`,
        createdAt: new Date(),
        createdBy: userId,
      });

      await prisma.orgSettings.upsert({
        where: { orgId: request.orgId },
        update: {
          metaJson: {
            ...((settings?.metaJson as any) || {}),
            headcountPlans: existingPlans,
          } as any,
        },
        create: {
          orgId: request.orgId,
          metaJson: { headcountPlans: existingPlans } as any,
        },
      });

      logger.info(`Headcount plan created`, {
        orgId: request.orgId,
        userId,
        planName: request.name,
        quantity: request.quantity,
      });

      return {
        ...plan,
        id: `plan_${Date.now()}`,
      };
    } catch (error: any) {
      logger.error('Error creating headcount plan', error);
      throw error;
    }
  },

  /**
   * Get headcount forecast
   */
  getForecast: async (
    orgId: string,
    userId: string,
    months: number = 12
  ): Promise<HeadcountForecast[]> => {
    try {
      // Validate org access
      const userRole = await prisma.userOrgRole.findUnique({
        where: { userId_orgId: { userId, orgId } },
      });

      if (!userRole) {
        throw new ForbiddenError('User does not have access to this organization');
      }

      // Get headcount plans
      const settings = await prisma.orgSettings.findUnique({
        where: { orgId },
      });

      const plans = ((settings?.metaJson as any)?.headcountPlans || []) as Array<HeadcountPlan & { startDate: string; endDate?: string }>;

      // Generate forecast
      const forecast: HeadcountForecast[] = [];
      const now = new Date();

      for (let i = 0; i < months; i++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

        let headcount = 0;
        let cost = 0;
        const byDepartment: Record<string, { headcount: number; cost: number }> = {};

        plans.forEach(plan => {
          const planStart = new Date(plan.startDate);
          const planEnd = plan.endDate ? new Date(plan.endDate) : null;

          // Check if plan is active in this month
          if (
            plan.status !== 'cancelled' &&
            monthDate >= planStart &&
            (!planEnd || monthDate <= planEnd)
          ) {
            headcount += plan.quantity;
            const monthlyCost = plan.salary ? (plan.salary * plan.quantity) / 12 : 0;
            cost += monthlyCost;

            const dept = plan.department || 'Other';
            if (!byDepartment[dept]) {
              byDepartment[dept] = { headcount: 0, cost: 0 };
            }
            byDepartment[dept].headcount += plan.quantity;
            byDepartment[dept].cost += monthlyCost;
          }
        });

        forecast.push({
          month: monthKey,
          headcount,
          cost,
          byDepartment,
        });
      }

      return forecast;
    } catch (error: any) {
      logger.error('Error getting headcount forecast', error);
      throw error;
    }
  },

  /**
   * Get all headcount plans
   */
  getPlans: async (
    orgId: string,
    userId: string
  ): Promise<HeadcountPlan[]> => {
    try {
      const userRole = await prisma.userOrgRole.findUnique({
        where: { userId_orgId: { userId, orgId } },
      });

      if (!userRole) {
        throw new ForbiddenError('User does not have access to this organization');
      }

      const settings = await prisma.orgSettings.findUnique({
        where: { orgId },
      });

      const plans = ((settings?.metaJson as any)?.headcountPlans || []) as HeadcountPlan[];

      return plans;
    } catch (error: any) {
      logger.error('Error getting headcount plans', error);
      throw error;
    }
  },
};

