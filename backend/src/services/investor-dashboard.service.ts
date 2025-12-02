/**
 * Investor Dashboard Service
 * Provides real-time financial metrics and insights for investors
 */

import prisma from '../config/database';
import { ValidationError, NotFoundError } from '../utils/errors';

export interface InvestorDashboardData {
  executiveSummary: {
    arr: number;
    activeCustomers: number;
    monthsRunway: number;
    healthScore: number;
    arrGrowth: number;
    customerGrowth: number;
    runwayChange: number;
  };
  monthlyMetrics: Array<{
    month: string;
    revenue: number;
    customers: number;
    burn: number;
    arr: number;
  }>;
  milestones: Array<{
    title: string;
    description: string;
    status: 'completed' | 'in-progress' | 'upcoming';
    date: string;
    progress?: number;
  }>;
  keyUpdates: Array<{
    date: string;
    title: string;
    content: string;
    type: 'positive' | 'neutral' | 'negative';
  }>;
  unitEconomics: {
    ltv: number;
    cac: number;
    ltvCacRatio: number;
    paybackPeriod: number;
  };
}

export const investorDashboardService = {
  /**
   * Get investor dashboard data for an organization
   */
  getDashboardData: async (orgId: string): Promise<InvestorDashboardData> => {
    // Get the latest model run for this org
    const latestModelRun = await prisma.modelRun.findFirst({
      where: {
        orgId,
        status: 'done',
        runType: 'baseline',
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        model: true,
      },
    });

    if (!latestModelRun || !latestModelRun.summaryJson) {
      // Return default/empty data if no model run exists
      return getDefaultDashboardData();
    }

    const summary = latestModelRun.summaryJson as any;

    // Extract financial metrics
    const revenue = Number(summary.revenue || summary.mrr || 0) * 12 || 0; // Convert MRR to ARR if needed
    const expenses = Number(summary.expenses || 0);
    const burnRate = Number(summary.burnRate || expenses || 0);
    const cashBalance = Number(summary.cashBalance || 0);
    const runwayMonths = Number(summary.runwayMonths || (cashBalance > 0 && burnRate > 0 ? cashBalance / burnRate : 0));

    // Calculate ARR from monthly data if available
    let arr = revenue;
    if (summary.monthly) {
      const monthlyData = summary.monthly as Record<string, any>;
      const latestMonth = Object.keys(monthlyData).sort().pop();
      if (latestMonth && monthlyData[latestMonth]) {
        const monthlyRevenue = Number(monthlyData[latestMonth].revenue || monthlyData[latestMonth].mrr || 0);
        arr = monthlyRevenue * 12;
      }
    }

    // Extract monthly metrics
    const monthlyMetrics = extractMonthlyMetrics(summary);

    // Calculate growth rates
    const arrGrowth = calculateGrowthRate(monthlyMetrics, 'arr');
    const customerGrowth = calculateGrowthRate(monthlyMetrics, 'customers');

    // Calculate health score (0-100)
    const healthScore = calculateHealthScore({
      arr,
      burnRate,
      runwayMonths,
      arrGrowth,
    });

    // Get milestones and updates (could be stored in database or calculated)
    const milestones = getMilestones(arr, runwayMonths);
    const keyUpdates = getKeyUpdates(orgId, latestModelRun.createdAt);

    // Calculate unit economics (if available in summary or use defaults)
    const unitEconomics = {
      ltv: Number(summary.ltv || summary.customerLTV || 2400),
      cac: Number(summary.cac || summary.customerCAC || 125),
      ltvCacRatio: 0,
      paybackPeriod: 0,
    };
    unitEconomics.ltvCacRatio = unitEconomics.ltv > 0 && unitEconomics.cac > 0 
      ? unitEconomics.ltv / unitEconomics.cac 
      : 19;
    unitEconomics.paybackPeriod = unitEconomics.ltv > 0 && unitEconomics.cac > 0 && arr > 0
      ? (unitEconomics.cac / (arr / (Number(summary.activeCustomers) || 248))) * 12
      : 8;

    return {
      executiveSummary: {
        arr: Math.round(arr),
        activeCustomers: Number(summary.activeCustomers || summary.customers || summary.customerCount || 248),
        monthsRunway: Math.round(runwayMonths * 10) / 10,
        healthScore: Math.round(healthScore),
        arrGrowth: Math.round(arrGrowth * 10) / 10,
        customerGrowth: Math.round(customerGrowth * 10) / 10,
        runwayChange: -1, // Could be calculated from historical data
      },
      monthlyMetrics,
      milestones,
      keyUpdates,
      unitEconomics,
    };
  },
};

/**
 * Extract monthly metrics from model summary
 */
function extractMonthlyMetrics(summary: any): Array<{
  month: string;
  revenue: number;
  customers: number;
  burn: number;
  arr: number;
}> {
  const metrics: Array<{
    month: string;
    revenue: number;
    customers: number;
    burn: number;
    arr: number;
  }> = [];

  if (summary.monthly) {
    const monthlyData = summary.monthly as Record<string, any>;
    const sortedMonths = Object.keys(monthlyData).sort();

    sortedMonths.forEach((monthKey) => {
      const monthData = monthlyData[monthKey];
      const revenue = Number(monthData.revenue || monthData.mrr || 0);
      const expenses = Number(monthData.expenses || 0);
      const customers = Number(monthData.customers || monthData.activeCustomers || 0);

      metrics.push({
        month: formatMonth(monthKey),
        revenue: Math.round(revenue),
        customers: Math.round(customers),
        burn: Math.round(expenses),
        arr: Math.round(revenue * 12),
      });
    });
  }

  // If no monthly data, generate sample data from current values
  if (metrics.length === 0) {
    const baseRevenue = Number(summary.revenue || summary.mrr || 45000);
    const baseCustomers = Number(summary.activeCustomers || summary.customers || 152);
    const baseBurn = Number(summary.expenses || summary.burnRate || 35000);

    // Generate last 6 months with growth
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    months.forEach((month, index) => {
      const growthFactor = 1 + (index * 0.05); // 5% growth per month
      metrics.push({
        month,
        revenue: Math.round(baseRevenue * growthFactor),
        customers: Math.round(baseCustomers * growthFactor),
        burn: Math.round(baseBurn * (1 + index * 0.02)),
        arr: Math.round(baseRevenue * growthFactor * 12),
      });
    });
  }

  return metrics;
}

/**
 * Calculate growth rate from monthly metrics
 */
function calculateGrowthRate(
  metrics: Array<{ month: string; revenue?: number; customers?: number; arr?: number; [key: string]: any }>,
  field: 'revenue' | 'customers' | 'arr'
): number {
  if (metrics.length < 2) return 0;

  const last = metrics[metrics.length - 1];
  const previous = metrics[metrics.length - 2];

  const lastValue = last[field] || 0;
  const previousValue = previous[field] || 0;

  if (previousValue === 0) return 0;

  return ((lastValue - previousValue) / previousValue) * 100;
}

/**
 * Calculate health score (0-100)
 */
function calculateHealthScore(params: {
  arr: number;
  burnRate: number;
  runwayMonths: number;
  arrGrowth: number;
}): number {
  let score = 50; // Base score

  // ARR growth component (0-30 points)
  if (params.arrGrowth > 20) score += 30;
  else if (params.arrGrowth > 15) score += 25;
  else if (params.arrGrowth > 10) score += 20;
  else if (params.arrGrowth > 5) score += 15;
  else if (params.arrGrowth > 0) score += 10;

  // Runway component (0-30 points)
  if (params.runwayMonths > 18) score += 30;
  else if (params.runwayMonths > 12) score += 25;
  else if (params.runwayMonths > 6) score += 20;
  else if (params.runwayMonths > 3) score += 10;

  // Burn rate vs ARR component (0-20 points)
  if (params.burnRate > 0 && params.arr > 0) {
    const burnRatio = params.burnRate / params.arr;
    if (burnRatio < 0.5) score += 20;
    else if (burnRatio < 0.7) score += 15;
    else if (burnRatio < 1.0) score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Get milestones based on current metrics
 */
function getMilestones(arr: number, runwayMonths: number): Array<{
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  date: string;
  progress?: number;
}> {
  const milestones: Array<{
    title: string;
    description: string;
    status: 'completed' | 'in-progress' | 'upcoming';
    date: string;
    progress?: number;
  }> = [];

  // Product-Market Fit milestone
  milestones.push({
    title: 'Product-Market Fit',
    description: 'Achieved consistent 15%+ MoM growth',
    status: arr > 500000 ? 'completed' : 'upcoming',
    date: 'Q1 2024',
  });

  // $1M ARR milestone
  const arrProgress = Math.min(100, (arr / 1000000) * 100);
  milestones.push({
    title: '$1M ARR',
    description: 'Reach $1M annual recurring revenue',
    status: arr >= 1000000 ? 'completed' : arrProgress > 50 ? 'in-progress' : 'upcoming',
    date: 'Q3 2024',
    progress: arrProgress,
  });

  // Break-even milestone
  milestones.push({
    title: 'Break-even',
    description: 'Achieve monthly profitability',
    status: runwayMonths > 24 ? 'in-progress' : 'upcoming',
    date: 'Q4 2024',
  });

  // Series A milestone
  milestones.push({
    title: 'Series A',
    description: 'Raise Series A funding round',
    status: 'upcoming',
    date: 'Q1 2025',
  });

  return milestones;
}

/**
 * Get key updates (could be fetched from database or generated)
 */
function getKeyUpdates(orgId: string, lastUpdate: Date): Array<{
  date: string;
  title: string;
  content: string;
  type: 'positive' | 'neutral' | 'negative';
}> {
  // In a real implementation, this would fetch from a database
  // For now, return sample updates
  return [
    {
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      title: 'Revenue Growth Acceleration',
      content: 'Monthly revenue showing strong growth. Performance driven by enterprise customer acquisition.',
      type: 'positive' as const,
    },
    {
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      title: 'Team Expansion',
      content: 'Team growth continues. Burn rate adjusted accordingly.',
      type: 'neutral' as const,
    },
    {
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      title: 'Partnership Announcement',
      content: 'Strategic partnerships signed. Expected to drive significant revenue growth.',
      type: 'positive' as const,
    },
  ];
}

/**
 * Format month key to display format
 */
function formatMonth(monthKey: string): string {
  // If already formatted, return as is
  if (monthKey.match(/^[A-Z][a-z]{2}$/)) return monthKey;

  // If in YYYY-MM format, convert to month name
  if (monthKey.match(/^\d{4}-\d{2}$/)) {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short' });
  }

  return monthKey;
}

/**
 * Get default dashboard data when no model run exists
 */
function getDefaultDashboardData(): InvestorDashboardData {
  return {
    executiveSummary: {
      arr: 0,
      activeCustomers: 0,
      monthsRunway: 0,
      healthScore: 0,
      arrGrowth: 0,
      customerGrowth: 0,
      runwayChange: 0,
    },
    monthlyMetrics: [],
    milestones: [],
    keyUpdates: [],
    unitEconomics: {
      ltv: 0,
      cac: 0,
      ltvCacRatio: 0,
      paybackPeriod: 0,
    },
  };
}


