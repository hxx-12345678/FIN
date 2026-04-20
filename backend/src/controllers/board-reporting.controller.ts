/**
 * Board Reporting Controller
 * Handles board report generation with budget-specific templates
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { ValidationError } from '../utils/errors';
import { investorExportService } from '../services/investor-export.service';
import { budgetActualService } from '../services/budget-actual.service';
import { investorDashboardService } from '../services/investor-dashboard.service';
import prisma from '../config/database';

interface ScheduleInput {
  scheduleType: 'single' | 'recurring';
  frequency: string;
  startDate?: string;
  startTime?: string;
  timezone?: string;
}

const FREQUENCY_CONFIG: Record<string, { days?: number; months?: number }> = {
  daily: { days: 1 },
  weekly: { days: 7 },
  biweekly: { days: 14 },
  monthly: { months: 1 },
  quarterly: { months: 3 },
};

function addDays(base: Date, days: number): Date {
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(base: Date, months: number): Date {
  const result = new Date(base);
  result.setMonth(result.getMonth() + months);
  return result;
}

function buildDateFromInputs(dateInput?: string, timeInput?: string, timezone?: string): Date {
  const datePart = dateInput || new Date().toISOString().split('T')[0];
  const timePart = (timeInput || '09:00').padEnd(5, '0');

  try {
    if (timezone) {
      const localString = new Date(`${datePart}T${timePart}:00`).toLocaleString('en-US', { timeZone: timezone });
      return new Date(localString);
    }
  } catch (error) {
    // Ignore timezone parsing issues
  }

  return new Date(`${datePart}T${timePart}:00Z`);
}

function calculateNextRunAt(params: ScheduleInput): Date {
  const { scheduleType, frequency, startDate, startTime, timezone } = params;
  const now = new Date();
  let nextRun = buildDateFromInputs(startDate, startTime, timezone);

  if (scheduleType === 'single') {
    if (nextRun <= now) {
      return addDays(now, 0);
    }
    return nextRun;
  }

  const config = FREQUENCY_CONFIG[frequency] || FREQUENCY_CONFIG.monthly;
  let guard = 0;
  while (nextRun <= now && guard < 24) {
    if (config.months) {
      nextRun = addMonths(nextRun, config.months);
    } else if (config.days) {
      nextRun = addDays(nextRun, config.days);
    } else {
      nextRun = addDays(nextRun, 30);
    }
    guard += 1;
  }

  return nextRun;
}

export const boardReportingController = {
  /**
   * POST /api/v1/orgs/:orgId/board-reports
   * Generate board report with budget data
   */
  generateBoardReport: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const {
        template,
        format = 'pptx',
        modelId,
        modelRunId,
        includeBudget = true,
        includeMonteCarlo = false,
        includeRecommendations = true,
        selectedMetrics = [],
        reportTitle,
        reportingPeriod,
        aiContent,
        distribution,
      } = req.body;

      if (!['pptx', 'pdf', 'memo'].includes(format)) {
        throw new ValidationError('Invalid format. Must be pptx, pdf, or memo');
      }

      let budgetActualData = null;
      if (includeBudget && modelId) {
        try {
          budgetActualData = await budgetActualService.getBudgetActual(
            orgId,
            req.user.id,
            modelId,
            'current',
            'monthly'
          );
        } catch (error) {
          console.warn('Could not fetch budget actual data:', error);
        }
      }

      const exportResult = await investorExportService.createInvestorExport(req.user.id, {
        orgId,
        modelRunId,
        format,
        includeMonteCarlo: includeMonteCarlo ?? false,
        includeRecommendations: includeRecommendations ?? true,
        template: template || 'board-deck',
        metadata: {
          reportType: 'board-report',
          template,
          includeBudget,
          selectedMetrics,
          reportTitle,
          reportingPeriod,
          aiContent,
          distribution,
          budgetActualData: budgetActualData
            ? {
                summary: budgetActualData.summary,
                periods: budgetActualData.periods?.slice(0, 6),
                categories: budgetActualData.categories?.slice(0, 10),
              }
            : null,
        },
      });

      res.status(201).json({
        ok: true,
        export: exportResult,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/board-reports/templates
   * Get available board report templates
   */
  getTemplates: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const templates = [
        {
          id: 'board-deck',
          name: 'Monthly Board Deck',
          description: 'Comprehensive board presentation with key metrics and insights',
          type: 'presentation',
          slides: 8,
          status: 'ready',
        },
        {
          id: 'investor-update',
          name: 'Investor Update',
          description: 'Monthly investor communication with progress updates',
          type: 'email',
          slides: 6,
          status: 'ready',
        },
        {
          id: 'executive-summary',
          name: 'Executive Summary',
          description: 'High-level overview for leadership team',
          type: 'document',
          slides: 4,
          status: 'ready',
        },
        {
          id: 'financial-review',
          name: 'Financial Review',
          description: 'Detailed financial analysis and variance reporting',
          type: 'document',
          slides: 7,
          status: 'ready',
        },
        {
          id: 'budget-variance',
          name: 'Budget Variance Report',
          description: 'Detailed budget vs actual analysis with variance explanations',
          type: 'document',
          slides: 7,
          status: 'ready',
        },
      ];

      res.json({
        ok: true,
        templates,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/board-reports/metrics
   * Get available metrics for board reports
   */
  getMetrics: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { modelId } = req.query;

      // Use the unified investor dashboard service which handles fallback to transactions
      const dashboardData = await investorDashboardService.getDashboardData(orgId, modelId as string);
      const summary = dashboardData.executiveSummary;
      const saas = dashboardData.saasMetrics;

      const metrics = [
        {
          name: 'Monthly Recurring Revenue',
          value: `$${Math.round((summary.arr || 0) / 12).toLocaleString('en-US')}`,
          change: `+${summary.arrGrowth || 0}%`,
          trend: (summary.arrGrowth || 0) > 0 ? 'up' : 'down',
          category: 'revenue',
        },
        {
          name: 'Annual Recurring Revenue',
          value: `$${Math.round(summary.arr || 0).toLocaleString('en-US')}`,
          change: `+${summary.arrGrowth || 0}%`,
          trend: (summary.arrGrowth || 0) > 0 ? 'up' : 'down',
          category: 'revenue',
        },
        {
          name: 'Active Customers',
          value: (summary.activeCustomers || 0).toLocaleString('en-US'),
          change: `+${summary.customerGrowth || 0}%`,
          trend: (summary.customerGrowth || 0) > 0 ? 'up' : 'down',
          category: 'customers',
        },
        {
          name: 'Monthly Churn Rate',
          value: `${saas.grr ? (100 - saas.grr).toFixed(1) : 2.3}%`,
          change: `-0.6%`,
          trend: 'down',
          category: 'customers',
        },
        {
          name: 'Customer Acquisition Cost',
          value: `$${dashboardData.unitEconomics?.cac || 125}`,
          change: `Estimation based`,
          trend: 'up',
          category: 'unit-economics',
        },
        {
          name: 'Customer Lifetime Value',
          value: `$${dashboardData.unitEconomics?.ltv || 2400}`,
          change: `Estimation based`,
          trend: 'up',
          category: 'unit-economics',
        },
        {
          name: 'Gross Margin',
          value: `80%`, // Placeholder or fetched from real data
          change: `+2.1%`,
          trend: 'up',
          category: 'profitability',
        },
        {
          name: 'Cash Runway',
          value: summary.monthsRunway > 90 ? '99+ months' : `${Math.round(summary.monthsRunway || 0)} months`,
          change: `${summary.runwayChange || 0} month`,
          trend: (summary.runwayChange || 0) > 0 ? 'up' : 'down',
          category: 'cash',
        },
        {
          name: 'Burn Rate',
          value: `$${dashboardData.monthlyMetrics?.[dashboardData.monthlyMetrics.length - 1]?.burn?.toLocaleString('en-US') || 0}`,
          change: `0%`,
          trend: 'down',
          category: 'cash',
        },
        {
          name: 'Rule of 40',
          value: `${(saas.ruleOf40 || 0).toFixed(1)}%`,
          change: `Efficiency`,
          trend: (saas.ruleOf40 || 0) >= 40 ? 'up' : 'down',
          category: 'profitability',
        },
      ];

      res.json({
        ok: true,
        metrics,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/board-reports/schedules
   * Retrieve scheduled board reports
   */
  listSchedules: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;

      const schedules = await prisma.boardReportSchedule.findMany({
        where: { orgId },
        orderBy: [{ status: 'asc' }, { nextRunAt: 'asc' }],
      });

      res.json({
        ok: true,
        schedules,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orgs/:orgId/board-reports/schedules
   * Create a new board report schedule
   */
  createSchedule: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const {
        name,
        template,
        format = 'pptx',
        frequency = 'monthly',
        scheduleType = 'single',
        startDate,
        startTime,
        timezone = 'UTC',
        distributionMethod,
        recipients,
        ccRecipients,
        reportTitle,
        reportingPeriod,
        selectedMetrics = [],
        includeSections = [],
        includeBudget = true,
        includeMonteCarlo = false,
        includeRecommendations = true,
      } = req.body;

      if (!name) {
        throw new ValidationError('Schedule name is required');
      }

      if (!template) {
        throw new ValidationError('Template is required');
      }

      const nextRunAt = calculateNextRunAt({
        scheduleType,
        frequency,
        startDate,
        startTime,
        timezone,
      });

      const schedule = await prisma.boardReportSchedule.create({
        data: {
          orgId,
          name,
          template,
          format,
          frequency,
          scheduleType,
          timezone,
          distributionMethod,
          recipients,
          ccRecipients,
          status: 'active',
          nextRunAt,
          metadata: {
            reportTitle,
            reportingPeriod,
            selectedMetrics,
            includeSections,
            includeBudget,
            includeMonteCarlo,
            includeRecommendations,
          },
          createdById: req.user.id,
        },
      });

      res.status(201).json({
        ok: true,
        schedule,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/orgs/:orgId/board-reports/schedules/:scheduleId
   * Cancel an existing board report schedule
   */
  deleteSchedule: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, scheduleId } = req.params;

      const existing = await prisma.boardReportSchedule.findFirst({
        where: {
          id: scheduleId,
          orgId,
        },
      });

      if (!existing) {
        throw new ValidationError('Schedule not found');
      }

      const schedule = await prisma.boardReportSchedule.update({
        where: { id: existing.id },
        data: {
          status: 'cancelled',
          updatedAt: new Date(),
        },
      });

      res.json({
        ok: true,
        schedule,
      });
    } catch (error) {
      next(error);
    }
  },
};

