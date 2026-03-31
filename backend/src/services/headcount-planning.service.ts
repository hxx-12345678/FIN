/**
 * HEADCOUNT PLANNING SERVICE (v2)
 * Upgraded to use dedicated HeadcountPlan table instead of metaJson blob.
 * Supports: CRUD, forecasting, compensation modeling, hiring pipeline stages.
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';

export interface CreateHeadcountPlanRequest {
  orgId: string;
  name: string;
  department?: string;
  role: string;
  level?: string;
  startDate: string;
  endDate?: string;
  quantity: number;
  salary?: number;
  benefitsMultiplier?: number;
  rampMonths?: number;
  notes?: string;
}

export interface UpdateHeadcountPlanRequest {
  name?: string;
  department?: string;
  role?: string;
  level?: string;
  startDate?: string;
  endDate?: string;
  quantity?: number;
  salary?: number;
  benefitsMultiplier?: number;
  rampMonths?: number;
  status?: string;
  hiringStage?: string;
  notes?: string;
}

export interface HeadcountForecast {
  month: string;
  headcount: number;
  cost: number;
  fullyRampedCount: number;
  byDepartment: Record<string, { headcount: number; cost: number; rampingCount: number }>;
}

export const headcountPlanningService = {
  /**
   * Create a headcount plan using dedicated table
   */
  createPlan: async (
    request: CreateHeadcountPlanRequest,
    userId: string
  ) => {
    // Validate org access
    const userRole = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId: request.orgId } },
    });
    if (!userRole || !['admin', 'finance'].includes(userRole.role)) {
      throw new ForbiddenError('Only admins and finance users can create headcount plans');
    }

    // Validate inputs
    if (request.quantity <= 0) throw new ValidationError('Quantity must be greater than 0');
    if (request.quantity > 1000) throw new ValidationError('Quantity cannot exceed 1000');

    const startDate = new Date(request.startDate);
    if (isNaN(startDate.getTime())) throw new ValidationError('Invalid start date');

    let endDate: Date | undefined;
    if (request.endDate) {
      endDate = new Date(request.endDate);
      if (isNaN(endDate.getTime())) throw new ValidationError('Invalid end date');
      if (endDate < startDate) throw new ValidationError('End date must be after start date');
    }

    if (request.salary && request.salary < 0) throw new ValidationError('Salary cannot be negative');

    // Calculate total annual cost
    const benefitsMultiplier = request.benefitsMultiplier ?? 1.3;
    const totalAnnualCost = request.salary && request.quantity
      ? request.salary * request.quantity * benefitsMultiplier
      : undefined;

    const plan = await prisma.headcountPlan.create({
      data: {
        orgId: request.orgId,
        name: request.name,
        department: request.department || 'General',
        role: request.role,
        level: request.level,
        quantity: request.quantity,
        salary: request.salary,
        benefitsMultiplier,
        totalAnnualCost,
        startDate,
        endDate: endDate || null,
        rampMonths: request.rampMonths ?? 3,
        status: 'planned',
        hiringStage: 'open',
        notes: request.notes,
        createdById: userId,
      },
    });

    logger.info(`Headcount plan created: ${plan.name}`, {
      orgId: request.orgId,
      userId,
      planId: plan.id,
    });

    return plan;
  },

  /**
   * Update a headcount plan
   */
  updatePlan: async (
    orgId: string,
    planId: string,
    userId: string,
    data: UpdateHeadcountPlanRequest
  ) => {
    const userRole = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!userRole || !['admin', 'finance'].includes(userRole.role)) {
      throw new ForbiddenError('Only admins and finance users can update headcount plans');
    }

    const existing = await prisma.headcountPlan.findFirst({
      where: { id: planId, orgId },
    });
    if (!existing) throw new NotFoundError('Headcount plan not found');

    // Recalculate total cost if salary or quantity changed
    const salary = data.salary !== undefined ? data.salary : (existing.salary ? Number(existing.salary) : null);
    const quantity = data.quantity !== undefined ? data.quantity : existing.quantity;
    const benefitsMultiplier = data.benefitsMultiplier !== undefined
      ? data.benefitsMultiplier
      : (existing.benefitsMultiplier ? Number(existing.benefitsMultiplier) : 1.3);

    const totalAnnualCost = salary && quantity
      ? salary * quantity * benefitsMultiplier
      : existing.totalAnnualCost;

    const updateData: any = { totalAnnualCost };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.level !== undefined) updateData.level = data.level;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.salary !== undefined) updateData.salary = data.salary;
    if (data.benefitsMultiplier !== undefined) updateData.benefitsMultiplier = data.benefitsMultiplier;
    if (data.rampMonths !== undefined) updateData.rampMonths = data.rampMonths;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.hiringStage !== undefined) updateData.hiringStage = data.hiringStage;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;

    return prisma.headcountPlan.update({
      where: { id: planId },
      data: updateData,
    });
  },

  /**
   * Delete a headcount plan
   */
  deletePlan: async (orgId: string, planId: string, userId: string) => {
    const userRole = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!userRole || !['admin', 'finance'].includes(userRole.role)) {
      throw new ForbiddenError('Only admins and finance users can delete headcount plans');
    }

    const existing = await prisma.headcountPlan.findFirst({
      where: { id: planId, orgId },
    });
    if (!existing) throw new NotFoundError('Headcount plan not found');

    await prisma.headcountPlan.delete({ where: { id: planId } });
    return { deleted: true };
  },

  /**
   * Get headcount forecast with ramp-time modeling
   */
  getForecast: async (
    orgId: string,
    userId: string,
    months: number = 12
  ): Promise<HeadcountForecast[]> => {
    const userRole = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!userRole) throw new ForbiddenError('User does not have access to this organization');

    const plans = await prisma.headcountPlan.findMany({
      where: { orgId, status: { not: 'cancelled' } },
    });

    const forecast: HeadcountForecast[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

      let headcount = 0;
      let cost = 0;
      let fullyRampedCount = 0;
      const byDepartment: Record<string, { headcount: number; cost: number; rampingCount: number }> = {};

      plans.forEach((plan) => {
        const planStart = new Date(plan.startDate);
        const planEnd = plan.endDate ? new Date(plan.endDate) : null;

        // Check if plan is active in this month
        if (monthDate >= planStart && (!planEnd || monthDate <= planEnd)) {
          headcount += plan.quantity;

          // Ramp time modeling: during ramp period, cost is prorated
          const monthsSinceStart = (monthDate.getFullYear() - planStart.getFullYear()) * 12
            + (monthDate.getMonth() - planStart.getMonth());
          const rampMonths = plan.rampMonths || 3;
          const rampFactor = Math.min(1, (monthsSinceStart + 1) / rampMonths);
          const isFullyRamped = rampFactor >= 1;

          if (isFullyRamped) fullyRampedCount += plan.quantity;

          const salary = plan.salary ? Number(plan.salary) : 0;
          const benefitsMult = plan.benefitsMultiplier ? Number(plan.benefitsMultiplier) : 1.3;
          const monthlyCost = (salary * plan.quantity * benefitsMult * rampFactor) / 12;
          cost += monthlyCost;

          const dept = plan.department || 'General';
          if (!byDepartment[dept]) {
            byDepartment[dept] = { headcount: 0, cost: 0, rampingCount: 0 };
          }
          byDepartment[dept].headcount += plan.quantity;
          byDepartment[dept].cost += monthlyCost;
          if (!isFullyRamped) byDepartment[dept].rampingCount += plan.quantity;
        }
      });

      forecast.push({ month: monthKey, headcount, cost: Math.round(cost * 100) / 100, fullyRampedCount, byDepartment });
    }

    return forecast;
  },

  /**
   * Get all headcount plans from dedicated table
   */
  getPlans: async (orgId: string, userId: string) => {
    const userRole = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!userRole) throw new ForbiddenError('User does not have access to this organization');

    return prisma.headcountPlan.findMany({
      where: { orgId },
      orderBy: [{ status: 'asc' }, { startDate: 'asc' }],
    });
  },

  /**
   * Get department summary for org chart visualization
   */
  getDepartmentSummary: async (orgId: string, userId: string) => {
    const userRole = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!userRole) throw new ForbiddenError('User does not have access to this organization');

    const plans = await prisma.headcountPlan.findMany({
      where: { orgId, status: { not: 'cancelled' } },
    });

    const departments: Record<string, {
      totalHeadcount: number;
      totalAnnualCost: number;
      roles: { role: string; level: string | null; count: number; avgSalary: number }[];
      plansByStatus: Record<string, number>;
      plansByStage: Record<string, number>;
    }> = {};

    plans.forEach((plan) => {
      const dept = plan.department || 'General';
      if (!departments[dept]) {
        departments[dept] = {
          totalHeadcount: 0,
          totalAnnualCost: 0,
          roles: [],
          plansByStatus: {},
          plansByStage: {},
        };
      }

      departments[dept].totalHeadcount += plan.quantity;
      departments[dept].totalAnnualCost += plan.totalAnnualCost ? Number(plan.totalAnnualCost) : 0;

      // Track roles
      const existingRole = departments[dept].roles.find(
        (r) => r.role === plan.role && r.level === plan.level
      );
      if (existingRole) {
        existingRole.count += plan.quantity;
      } else {
        departments[dept].roles.push({
          role: plan.role,
          level: plan.level,
          count: plan.quantity,
          avgSalary: plan.salary ? Number(plan.salary) : 0,
        });
      }

      // Track status and stage counts
      departments[dept].plansByStatus[plan.status] = (departments[dept].plansByStatus[plan.status] || 0) + plan.quantity;
      if (plan.hiringStage) {
        departments[dept].plansByStage[plan.hiringStage] = (departments[dept].plansByStage[plan.hiringStage] || 0) + plan.quantity;
      }
    });

    return departments;
  },
};
