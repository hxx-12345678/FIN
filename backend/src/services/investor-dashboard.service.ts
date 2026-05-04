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
  saasMetrics: {
    nrr: number;
    grr: number;
    ruleOf40: number;
    burnMultiple: number;
    magicNumber: number;
  };
  sensitivityAnalysis: Array<{
    parameter: string;
    impact_pct: number;
    direction: 'up' | 'down' | 'neutral';
    low_scenario: number;
    high_scenario: number;
  }> | null;
  valuationSummary: Array<{
    name: string;
    low: number;
    high: number;
    color: string;
  }> | null;
  headcount: {
    total: number;
    byDepartment: Record<string, number>;
    planned: number;
    hired: number;
  } | null;
  marketImplications: string[] | null;


  aiNarrative: string | null;
  competitiveBenchmark: {
    summary: string;
    dataSources: any[];
  } | null;
  variances: any;
}

export const investorDashboardService = {
  /**
   * Get investor dashboard data for an organization
   */
  getDashboardData: async (orgId: string, modelId?: string): Promise<InvestorDashboardData> => {
    // First try to get the latest model run with actual financial data
    let latestModelRun = await prisma.modelRun.findFirst({
      where: { 
        orgId, 
        modelId: modelId || undefined,
        status: 'done',
        summaryJson: {
          path: ['arr'],
          not: 0
        }
      } as any,
      orderBy: { createdAt: 'desc' },
      include: { model: true }
    });

    // If no run with data, just grab the absolute latest
    if (!latestModelRun) {
      latestModelRun = await prisma.modelRun.findFirst({
        where: { orgId, modelId: modelId || undefined, status: 'done' },
        orderBy: { createdAt: 'desc' },
        include: { model: true }
      });
    }

    if (!latestModelRun || !latestModelRun.summaryJson) {
      // Fall back to transaction data if no model run exists
      return await getDashboardDataFromTransactions(orgId);
    }

    const summary = latestModelRun.summaryJson as any;

    // Extract financial metrics - be careful with ARR vs MRR
    const revenue = summary.mrr 
      ? Number(summary.mrr) * 12 
      : Number(summary.revenue || summary.arr || 0);
    const expenses = Number(summary.expenses || 0);
    const burnRate = Number(summary.burnRate || expenses || 0);
    const cashBalance = Number(summary.cashBalance || 0);

    // Use standardized runway calculation
    const { runwayCalculationService } = await import('./runway-calculation.service');
    const runwayData = await runwayCalculationService.calculateRunway(orgId);
    const runwayMonths = runwayData.runwayMonths;

    // Calculate ARR from monthly data if available (handling nested structures)
    let arr = revenue;
    if (summary.monthly) {
      // Handle deeply nested summary.monthly[company][entity].monthly structure
      let monthlyData = summary.monthly;
      while (monthlyData && !monthlyData["2023-01"] && !monthlyData["2024-01"] && !monthlyData["2025-01"] && !monthlyData["2026-01"]) {
        const firstKey = Object.keys(monthlyData).find(k => typeof monthlyData[k] === 'object' && monthlyData[k] !== null);
        if (!firstKey) break;
        if (monthlyData.monthly) {
           monthlyData = monthlyData.monthly;
           break;
        }
        monthlyData = monthlyData[firstKey];
      }

      if (monthlyData && typeof monthlyData === 'object') {
        const sortedMonths = Object.keys(monthlyData).filter(m => /^\d{4}-\d{2}$/.test(m)).sort();
        const latestMonth = sortedMonths.pop();
        if (latestMonth && monthlyData[latestMonth]) {
          const monthlyRevenue = Number(monthlyData[latestMonth].revenue || monthlyData[latestMonth].mrr || 0);
          arr = monthlyRevenue * 12;
        }
      }
    }

    // Get active customers from model run, but fallback to CSV import or transaction count
    // Do this BEFORE extracting monthly metrics so we can use it there
    let activeCustomers = Number(summary.activeCustomers || summary.customers || summary.customerCount || summary.customer_count || 0);

    // Check KPIs object if root is 0
    if (activeCustomers === 0 && summary.kpis) {
      activeCustomers = Number(summary.kpis.activeCustomers || summary.kpis.customers || summary.kpis.customerCount || 0);
    }

    // If still 0 or suspiciously high customers, check CSV import first
    // Model run might have calculated customers incorrectly, so prefer user-provided value
    if ((activeCustomers === 0 || activeCustomers > 1000) && arr > 0) {
      // First check data import batch mapping (most reliable - stored when CSV is mapped)
      const importBatch = await (prisma as any).dataImportBatch.findFirst({
        where: { orgId, sourceType: 'csv' },
        orderBy: { createdAt: 'desc' },
        select: { mappingJson: true },
      });

      if (importBatch && importBatch.mappingJson) {
        const mapping = importBatch.mappingJson as any;
        const batchCustomers = mapping.initialCustomers || mapping.startingCustomers;
        if (batchCustomers && Number(batchCustomers) > 0) {
          activeCustomers = Number(batchCustomers);
          console.log(`[InvestorDashboard] Using initialCustomers from import batch: ${activeCustomers}`);
        }
      }

      // Also check CSV import jobs for initialCustomers (fallback)
      if (activeCustomers === 0 || activeCustomers > 1000) {
        const csvJob = await prisma.job.findFirst({
          where: {
            orgId,
            jobType: 'csv_import',
            status: { in: ['done', 'completed'] },
          },
          orderBy: { createdAt: 'desc' },
          select: { logs: true },
        });

        if (csvJob && csvJob.logs) {
          const logs = typeof csvJob.logs === 'string' ? JSON.parse(csvJob.logs) : csvJob.logs;

          // Check logs.params directly (job repository stores params here)
          if (typeof logs === 'object' && logs.params) {
            const initialCustomers = logs.params.initialCustomers || logs.params.startingCustomers;
            if (initialCustomers && Number(initialCustomers) > 0) {
              activeCustomers = Number(initialCustomers);
              console.log(`[InvestorDashboard] Using initialCustomers from job logs.params: ${activeCustomers}`);
            }
          }

          // Also check array format (if params are in log entries)
          if ((activeCustomers === 0 || activeCustomers > 1000) && Array.isArray(logs)) {
            for (const entry of logs) {
              const initialCustomers = entry.meta?.params?.initialCustomers || entry.meta?.params?.startingCustomers || entry.params?.initialCustomers || entry.params?.startingCustomers;
              if (initialCustomers && Number(initialCustomers) > 0) {
                activeCustomers = Number(initialCustomers);
                console.log(`[InvestorDashboard] Using initialCustomers from job log entry: ${activeCustomers}`);
                break;
              }
            }
          }
        }
      }
    }
    // If still 0 customers but we have revenue, count from transactions
    // Do this BEFORE extracting monthly metrics so we can use it there
    if (activeCustomers === 0 && arr > 0) {
      const transactions = await prisma.rawTransaction.findMany({
        where: {
          orgId,
          isDuplicate: false,
          amount: { gt: 0 },
        },
        select: {
          description: true,
          rawPayload: true,
        },
        take: 1000,
      });

      const uniqueCustomers = new Set<string>();
      for (const tx of transactions) {
        let customer = tx.description?.trim() || '';
        if (customer) {
          customer = customer.replace(/\b(REF|REF#|REFERENCE|TXN|ID|#)\s*:?\s*[A-Z0-9-]+\b/gi, '').trim();
          customer = customer.replace(/\$[\d,]+\.?\d*/g, '').trim();
          customer = customer.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '').trim();
          const words = customer.split(/\s+/).filter(w => w.length > 2);
          if (words.length > 0) {
            customer = words.slice(0, 3).join(' ').substring(0, 50);
            if (customer && customer !== 'Unknown') {
              uniqueCustomers.add(customer);
            }
          }
        }
      }
      activeCustomers = uniqueCustomers.size;
      if (activeCustomers > 0) {
        console.log(`[InvestorDashboard] Calculated ${activeCustomers} unique customers from transactions (fallback)`);
      }
    }

    // Extract monthly metrics (after we have activeCustomers)
    const monthlyMetrics = extractMonthlyMetrics(summary, activeCustomers);

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

    // Get milestones and updates (data-driven from actual metrics and audit logs)
    const milestones = getMilestones(arr, runwayMonths);
    const keyUpdates = await getKeyUpdates(orgId, latestModelRun.createdAt);

    // Calculate unit economics - try summary first, then model assumptions, then calculate from data
    let ltv = Number(summary.ltv || summary.customerLTV || summary.kpis?.ltv || 0);
    let cac = Number(summary.cac || summary.customerCAC || summary.kpis?.cac || 0);
    let ltvCac = Number(summary.ltvCacRatio || summary.ltvCac || summary.kpis?.ltvCac || summary.kpis?.ltvCacRatio || 0);

    // If not in summary, try to get from model assumptions
    if ((ltv === 0 || cac === 0) && latestModelRun.modelId) {
      const model = await prisma.model.findUnique({
        where: { id: latestModelRun.modelId },
      });

      if (model && model.modelJson) {
        const modelJson = typeof model.modelJson === 'string'
          ? JSON.parse(model.modelJson)
          : model.modelJson;
        const assumptions = modelJson.assumptions || {};

        if (ltv === 0) {
          ltv = Number(assumptions.ltv || assumptions.unitEconomics?.ltv || 0);
        }
        if (cac === 0) {
          cac = Number(assumptions.cac || assumptions.unitEconomics?.cac || 0);
        }
      }
    }

    // If still 0, try to calculate from available data
    if (ltv === 0 && arr > 0 && activeCustomers > 0) {
      // LTV = (MRR * 12) / churnRate, capped at 5 years (60 months)
      const churnRate = Number(summary.churnRate || 0.05);
      const mrr = arr / 12;
      const monthlyGp = mrr * Number(summary.grossMargin || 0.8);
      if (churnRate > 0) {
        const unboundedLtv = (monthlyGp / churnRate) * 12; // Annualized LTV
        ltv = Math.min(unboundedLtv, monthlyGp * 60); 
      }
    }

    if (cac === 0 && arr > 0 && activeCustomers > 0) {
      // CAC = Marketing Spend / New Customers, or estimate from ARR
      // Estimate: CAC = (ARR * 0.1) / (activeCustomers * growthRate)
      const growthRate = arrGrowth / 100 || 0.08;
      if (growthRate > 0) {
        cac = (arr * 0.1) / (activeCustomers * growthRate); // Rough estimate
      }
    }

    const unitEconomics = {
      ltv: Math.round(ltv),
      cac: Math.round(cac),
      ltvCacRatio: ltvCac || 0,
      paybackPeriod: Number(summary.paybackPeriod || summary.kpis?.paybackPeriod || 0),
    };
    unitEconomics.ltvCacRatio = unitEconomics.ltv > 0 && unitEconomics.cac > 0
      ? unitEconomics.ltv / unitEconomics.cac
      : 0;

    unitEconomics.paybackPeriod = unitEconomics.ltv > 0 && unitEconomics.cac > 0 && arr > 0
      ? (unitEconomics.cac / (arr / (activeCustomers || 1))) * 12
      : 0;

    // Calculate SaaS Efficiency Metrics fallbacks if missing
    let nrr = Number(summary.nrr || summary.kpis?.nrr || 0);
    let ruleOf40Value = Number(summary.ruleOf40 || summary.kpis?.ruleOf40 || 0);
    let burnMultipleValue = Number(summary.burnMultiple || summary.kpis?.burnMultiple || 0);
    let magicNumberValue = Number(summary.magicNumber || summary.kpis?.magicNumber || 0);

    // 1. Rule of 40 = Revenue Growth % + EBITDA Margin %
    if (ruleOf40Value === 0 && arrGrowth > 0) {
      const ebitdaMargin = arr > 0 ? ((arr - (burnRate * 12)) / arr) * 100 : 0;
      ruleOf40Value = arrGrowth + ebitdaMargin;
    }

    // 2. Burn Multiple = Net Burn / Net New ARR
    if (burnMultipleValue === 0 && burnRate > 0) {
      const lastMonth = monthlyMetrics[monthlyMetrics.length - 1];
      const prevMonth = monthlyMetrics[monthlyMetrics.length - 2];
      if (lastMonth && prevMonth) {
        const netNewArr = (lastMonth.arr || 0) - (prevMonth.arr || 0);
        if (netNewArr > 0) {
          burnMultipleValue = (burnRate * 1) / netNewArr; // Monthly burn / Monthly net new ARR
        }
      }
    }

    // 3. Magic Number = (Current Q Rev - Prev Q Rev) * 4 / Sales & Marketing Spend
    if (magicNumberValue === 0 && monthlyMetrics.length >= 6) {
      const currQRev = monthlyMetrics.slice(-3).reduce((sum, m) => sum + m.revenue, 0);
      const prevQRev = monthlyMetrics.slice(-6, -3).reduce((sum, m) => sum + m.revenue, 0);
      const smSpend = burnRate * 0.4; // Rough estimate: 40% of opex is S&M for scaling SaaS
      if (smSpend > 0) {
        magicNumberValue = ((currQRev - prevQRev) * 4) / (smSpend * 3);
      }
    }

    return {
      executiveSummary: {
        arr: Math.round(arr),
        activeCustomers: activeCustomers,
        monthsRunway: runwayMonths > 99 ? 99 : Math.round(runwayMonths * 10) / 10,
        healthScore: Math.round(healthScore),
        arrGrowth: Math.round(arrGrowth * 10) / 10,
        customerGrowth: Math.round(customerGrowth * 10) / 10,
        runwayChange: -1, 
      },
      monthlyMetrics,
      milestones: getMilestones(arr, runwayMonths, unitEconomics.ltvCacRatio),
      keyUpdates: getKeyUpdates(orgId, latestModelRun.createdAt, (latestModelRun.model as any)?.name || 'Latest Baseline'),
      unitEconomics,
      saasMetrics: {
        nrr: nrr || 100, // Default to 100% (healthy) if missing
        grr: Number(summary.grr || summary.kpis?.grr || 95),
        ruleOf40: Math.round(ruleOf40Value * 10) / 10,
        burnMultiple: Math.round(burnMultipleValue * 100) / 100,
        magicNumber: Math.round(magicNumberValue * 100) / 100,
      },
      // Grounding data for Intelligent Dashboard
      sensitivityAnalysis: summary.sensitivityAnalysis || null,
      valuationSummary: summary.valuationSummary || null,
      marketImplications: summary.marketImplications || null,
      aiNarrative: summary.aiNarrative || null,
      competitiveBenchmark: summary.competitiveBenchmark || null,
      headcount: await getHeadcountData(orgId),
      variances: await calculateBudgetVariances(orgId, arr, burnRate),
    };
  },
};

/**
 * Calculate Budget vs Actual Variances
 */
async function calculateBudgetVariances(orgId: string, actualArr: number, actualBurn: number) {
  try {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const budgets = await prisma.budget.findMany({
      where: { 
        orgId,
        month: { lte: currentMonth }
      },
      orderBy: { month: 'desc' },
      take: 20
    });

    if (budgets.length === 0) return null;

    const latestMonth = budgets[0].month;
    const latestBudgets = budgets.filter(b => b.month === latestMonth);

    const budgetedRevenue = latestBudgets
      .filter(b => b.category.toLowerCase().includes('rev') || b.category.toLowerCase().includes('sales'))
      .reduce((sum, b) => sum + Number(b.amount), 0);
    
    const budgetedExpenses = latestBudgets
      .filter(b => !b.category.toLowerCase().includes('rev') && !b.category.toLowerCase().includes('sales'))
      .reduce((sum, b) => sum + Number(b.amount), 0);

    const revenueVariance = budgetedRevenue > 0 ? ((actualArr / 12 - budgetedRevenue) / budgetedRevenue) * 100 : 0;
    const expenseVariance = budgetedExpenses > 0 ? ((actualBurn - budgetedExpenses) / budgetedExpenses) * 100 : 0;

    return {
      revenue: {
        budget: budgetedRevenue * 12,
        actual: actualArr,
        variancePct: Math.round(revenueVariance * 10) / 10,
        status: revenueVariance >= 0 ? 'favorable' : 'unfavorable'
      },
      burn: {
        budget: budgetedExpenses,
        actual: actualBurn,
        variancePct: Math.round(expenseVariance * 10) / 10,
        status: expenseVariance <= 0 ? 'favorable' : 'unfavorable'
      }
    };
  } catch (error) {
    console.error('Error calculating variances:', error);
    return null;
  }
}

/**
 * Get headcount data from HeadcountPlan table
 */
async function getHeadcountData(orgId: string): Promise<any> {
  const plans = await prisma.headcountPlan.findMany({
    where: { orgId },
  });

  if (plans.length === 0) return null;

  const byDepartment: Record<string, number> = {};
  let total = 0;
  let planned = 0;
  let hired = 0;

  for (const plan of plans) {
    const dept = plan.department || 'General';
    const qty = plan.quantity || 1;
    
    byDepartment[dept] = (byDepartment[dept] || 0) + qty;
    total += qty;
    
    if (plan.status === 'active' || plan.status === 'hired') hired += qty;
    else planned += qty;
  }

  return {
    total,
    byDepartment,
    planned,
    hired,
  };
}


/**
 * Extract monthly metrics from model summary
 */
function extractMonthlyMetrics(summary: any, activeCustomers: number = 0): Array<{
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
    let monthlyData = summary.monthly;
    // Walk down the nested map if necessary
    while (monthlyData && !monthlyData["2023-01"] && !monthlyData["2024-01"] && !monthlyData["2025-01"] && !monthlyData["2026-01"]) {
      const firstKey = Object.keys(monthlyData).find(k => typeof monthlyData[k] === 'object' && monthlyData[k] !== null);
      if (!firstKey) break;
      if (monthlyData.monthly) {
         monthlyData = monthlyData.monthly;
         break;
      }
      monthlyData = monthlyData[firstKey];
    }

    if (monthlyData && typeof monthlyData === 'object') {
      const sortedMonths = Object.keys(monthlyData).filter(m => /^\d{4}-\d{2}$/.test(m)).sort();
      sortedMonths.forEach((monthKey) => {
        const monthData = monthlyData[monthKey];
        const revenue = Number(monthData.revenue || monthData.mrr || 0);
        const expenses = Number(monthData.expenses || monthData.opex || monthData.operatingExpenses || 0);
        const customers = Number(monthData.customers || monthData.activeCustomers || activeCustomers || 0);

        metrics.push({
          month: formatMonth(monthKey),
          revenue: Math.round(revenue),
          customers: Math.round(customers),
          burn: Math.round(expenses),
          arr: Math.round(revenue * 12),
        });
      });
    }
  }

  // If no monthly data, return empty to let frontend handle it
  if (metrics.length === 0) {
    return [];
  }

  return metrics;
}

/**
 * Calculate growth rate from monthly metrics
 */
function calculateGrowthRate(
  metrics: Array<{ month: string; revenue?: number; customers?: number; arr?: number;[key: string]: any }>,
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
function getMilestones(arr: number, runwayMonths: number, ltvCac: number = 0): Array<{
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

  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.floor((new Date().getMonth() + 3) / 3);

  // Product-Market Fit milestone
  const pmfScore = Math.max((arr / 500000) * 100, (ltvCac / 5) * 100);
  milestones.push({
    title: 'Product-Market Fit',
    description: arr > 250000 || ltvCac > 3 ? 'Demonstrated strong market demand and retention efficiency' : 'Achieve consistent 15%+ MoM growth and >3x LTV:CAC',
    status: arr > 500000 || ltvCac > 4 ? 'completed' : arr > 100000 || ltvCac > 2 ? 'in-progress' : 'upcoming',
    date: arr > 500000 || ltvCac > 4 ? 'Completed' : `Q${currentQuarter} ${currentYear}`,
    progress: Math.min(100, Math.round(pmfScore))
  });

  // $1M ARR milestone
  const arrProgress = Math.min(100, Math.round((arr / 1000000) * 100));
  milestones.push({
    title: '$1M ARR',
    description: 'Reach $1M annual recurring revenue milestone',
    status: arr >= 1000000 ? 'completed' : arrProgress > 30 ? 'in-progress' : 'upcoming',
    date: arr >= 1000000 ? 'Completed' : `Q${((currentQuarter + 2) % 4) || 4} ${currentYear + (currentQuarter >= 2 ? 1 : 0)}`,
    progress: arrProgress,
  });

  // Break-even & Profitability
  milestones.push({
    title: 'Operational Break-even',
    description: 'Optimize burn to achieve monthly cash flow neutrality',
    status: runwayMonths > 36 ? 'completed' : runwayMonths > 18 ? 'in-progress' : 'upcoming',
    date: `FY${currentYear + 1}`,
    progress: Math.min(100, Math.round((runwayMonths / 24) * 100))
  });

  // Expansion & Series A
  milestones.push({
    title: 'Series A Readiness',
    description: 'Standardize reporting and governance for institutional capital',
    status: arr > 750000 ? 'in-progress' : 'upcoming',
    date: `FY${currentYear + 1}`,
    progress: Math.min(100, Math.round((arr / 1500000) * 100))
  });

  return milestones;
}

/**
 * Get key updates (could be fetched from database or generated)
 */
function getKeyUpdates(orgId: string, lastUpdate: Date, modelName: string = 'Latest'): Array<{
  date: string;
  title: string;
  content: string;
  type: 'positive' | 'neutral' | 'negative';
}> {
  // In a real implementation, this would fetch from a database
  // For now, return actual important system events if available
  return [
    {
      date: lastUpdate.toISOString().split('T')[0],
      title: 'Baseline Model Active',
      content: `Investor view synchronized with "${modelName}" model run results.`,
      type: 'neutral' as const,
    }
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
 * Get dashboard data from transactions when no model run exists
 */
async function getDashboardDataFromTransactions(orgId: string): Promise<InvestorDashboardData> {
  // Get transactions from last 12 months
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  let transactions = await prisma.rawTransaction.findMany({
    where: {
      orgId,
      isDuplicate: false,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      date: true,
      amount: true,
      category: true,
      description: true,
      rawPayload: true,
    },
    orderBy: {
      date: 'desc',
    },
  });

  // If no recent transactions, get all transactions
  if (transactions.length === 0) {
    transactions = await prisma.rawTransaction.findMany({
      where: {
        orgId,
        isDuplicate: false,
      } as any,
      select: {
        date: true,
        amount: true,
        category: true,
        description: true,
        rawPayload: true,
      },
      orderBy: {
        date: 'desc',
      },
      take: 1000,
    });
  }

  // Helper to determine if a category is revenue or expense (consistent with overview)
  const revenueKeywords = ['revenue', 'sales', 'income', 'earning', 'subscription', 'fee'];
  const expenseKeywords = ['cogs', 'payroll', 'marketing', 'ads', 'rent', 'expense', 'hardware', 'software', 'cost', 'utilities', 'insurance', 'tax', 'interest', 'commission', 'bonus', 'salary', 'vendor', 'payment'];
  
  const monthlyRevenueMap = new Map<string, number>();
  const monthlyExpenseMap = new Map<string, number>();
  const monthlyCustomersMap = new Map<string, Set<string>>();

  for (const tx of transactions) {
    const month = String(tx.date.getMonth() + 1).padStart(2, '0');
    const period = `${tx.date.getFullYear()}-${month}`;
    const amount = Number(tx.amount);
    const category = (tx.category || '').toLowerCase();
    const description = (tx.description || '').toLowerCase();

    // Determine if revenue or expense based on category/description keywords + sign
    let isRevenue = amount > 0;
    
    // Explicit keywords take priority
    if (revenueKeywords.some(k => category.includes(k) || description.includes(k))) {
      isRevenue = true;
    } else if (expenseKeywords.some(k => category.includes(k) || description.includes(k))) {
      isRevenue = false;
    }

    if (isRevenue) {
      monthlyRevenueMap.set(period, (monthlyRevenueMap.get(period) || 0) + Math.abs(amount));
      // Extract customer for this month
      const customer = extractVendorFromDescription(tx.description, (tx as any).rawPayload);
      if (customer && customer !== 'Unknown') {
        if (!monthlyCustomersMap.has(period)) monthlyCustomersMap.set(period, new Set());
        monthlyCustomersMap.get(period)!.add(customer);
      }
    } else {
      monthlyExpenseMap.set(period, (monthlyExpenseMap.get(period) || 0) + Math.abs(amount));
    }
  }

  // Get all periods and sort
  const allPeriods = Array.from(new Set([
    ...monthlyRevenueMap.keys(),
    ...monthlyExpenseMap.keys()
  ])).sort();

  // Calculate ARR from latest month revenue
  let arr = 0;
  let monthlyRevenue = 0;
  let monthlyBurnRate = 0;
  let arrGrowth = 0;
  let customerGrowth = 0;

  if (allPeriods.length > 0) {
    // Use last month as latest
    const latestPeriod = allPeriods[allPeriods.length - 1];
    monthlyRevenue = monthlyRevenueMap.get(latestPeriod) || 0;
    const latestExpenses = monthlyExpenseMap.get(latestPeriod) || 0;
    
    // Monthly burn is Net Burn (Expenses - Revenue), but bounded at 0
    monthlyBurnRate = Math.max(0, latestExpenses - monthlyRevenue);
    arr = monthlyRevenue * 12;

    // Calculate growth from previous period
    if (allPeriods.length >= 2) {
      const prevPeriod = allPeriods[allPeriods.length - 2];
      
      const prevRevenue = monthlyRevenueMap.get(prevPeriod) || 0;
      arrGrowth = prevRevenue > 0 ? ((monthlyRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      
      const prevCustomers = monthlyCustomersMap.get(prevPeriod)?.size || 0;
      const currCustomers = monthlyCustomersMap.get(latestPeriod)?.size || 0;
      customerGrowth = prevCustomers > 0 ? ((currCustomers - prevCustomers) / prevCustomers) * 100 : 0;
    }
  }

  // Use standardized runway calculation
  const { runwayCalculationService } = await import('./runway-calculation.service');
  const runwayData = await runwayCalculationService.calculateRunway(orgId);
  const runwayMonths = runwayData.runwayMonths;

  // Calculate health score
  const healthScore = calculateHealthScore({
    arr,
    burnRate: monthlyBurnRate,
    runwayMonths,
    arrGrowth,
  });

  // Count unique customers from revenue transactions FIRST (before using in monthly metrics)
  let activeCustomers = 0;

  // Priority 1: Check for user-provided customer count from data import batches
  const importBatch = await (prisma as any).dataImportBatch.findFirst({
    where: { orgId, sourceType: 'csv' },
    orderBy: { createdAt: 'desc' },
    select: { mappingJson: true },
  });

  if (importBatch && importBatch.mappingJson) {
    const mapping = importBatch.mappingJson as any;
    const batchCustomers = mapping.initialCustomers || mapping.startingCustomers;
    if (batchCustomers && Number(batchCustomers) > 0) {
      activeCustomers = Number(batchCustomers);
      console.log(`[InvestorDashboard] Using initialCustomers from import batch (fallback): ${activeCustomers}`);
    }
  }

  // Priority 2: Count unique customers from transactions
  if (activeCustomers === 0) {
    const uniqueCustomers = new Set<string>();
    for (const tx of transactions) {
      const amount = Number(tx.amount);
      if (amount > 0) { // Revenue transactions
        // Extract customer name - use smarter logic consistent with overview
        let customer: string | null = null;

        // Try rawPayload first (connectors stash metadata here)
        const rawPayload = (tx as any).rawPayload;
        if (rawPayload && typeof rawPayload === 'object') {
          const vendorFields = ['vendor', 'merchant', 'payee', 'name', 'company', 'business', 'customer'];
          for (const field of vendorFields) {
            if (rawPayload[field] && typeof rawPayload[field] === 'string') {
              customer = rawPayload[field].substring(0, 50);
              break;
            }
          }
        }

        if (!customer && tx.description) {
          customer = tx.description.trim();
          // Remove common prefixes/suffixes
          customer = customer.replace(/\b(REF|REF#|REFERENCE|TXN|ID|#)\s*:?\s*[A-Z0-9-]+\b/gi, '').trim();
          customer = customer.replace(/\$[\d,]+\.?\d*/g, '').trim();
          customer = customer.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '').trim();

          const words = customer.split(/\s+/).filter(w => w.length > 2);
          if (words.length > 0) {
            customer = words.slice(0, 3).join(' ').substring(0, 50);
          }
        }

        if (customer && customer !== 'Unknown') {
          uniqueCustomers.add(customer);
        }
      }
    }
    activeCustomers = uniqueCustomers.size;
    if (activeCustomers > 0) {
      console.log(`[InvestorDashboard] Calculated ${activeCustomers} unique customers from ${transactions.length} transactions`);
    }
  }

  // Generate monthly metrics from transactions (after activeCustomers is calculated)
  const monthlyMetrics: Array<{
    month: string;
    revenue: number;
    customers: number;
    burn: number;
    arr: number;
  }> = [];

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const last6Periods = allPeriods.slice(-6);

  for (const period of last6Periods) {
    const [year, month] = period.split('-').map(Number);
    const monthIndex = month - 1;
    const monthName = monthNames[monthIndex];
    const revenue = monthlyRevenueMap.get(period) || 0;
    const burn = monthlyExpenseMap.get(period) || 0;
    const periodCustomers = monthlyCustomersMap.get(period)?.size || 0;

    monthlyMetrics.push({
      month: monthName,
      revenue: Math.round(revenue),
      customers: periodCustomers > 0 ? periodCustomers : activeCustomers, 
      burn: Math.round(burn),
      arr: Math.round(revenue * 12),
    });
  }

  // Get milestones and updates
  const milestones = getMilestones(arr, runwayMonths);

  // Add onboarding milestone if no model run exists but we have data
  const modelRunCount = await prisma.modelRun.count({
    where: { orgId, status: 'done' }
  });

  if (modelRunCount === 0 && (arr > 0 || transactions.length > 0)) {
    milestones.unshift({
      title: 'Initialize AI Financial Model',
      description: 'Run your first financial model to unlock AI storytelling, growth forecasts, and investor-ready reporting.',
      status: 'in-progress',
      date: new Date().toISOString(),
      progress: 50
    });
  }

  const keyUpdates = await getKeyUpdates(orgId, new Date());

  // Calculate basic unit economics if we have revenue and customers
  let ltv = 0;
  let cac = 0;

  if (arr > 0 && activeCustomers > 0) {
    // Basic LTV heuristic when no model exists: Assume 5% monthly churn -> 20 month lifespan
    const mrr = arr / 12;
    const arpa = mrr / activeCustomers;
    ltv = arpa * 20; // Default 20 months lifespan (5% churn)

    // Basic CAC heuristic: Assume 10% of revenue goes to marketing
    const growthRate = (arrGrowth > 0 ? arrGrowth : 5) / 100;
    cac = (arr * 0.10) / (activeCustomers * growthRate);
  }

  const ltvCacRatio = ltv > 0 && cac > 0 ? ltv / cac : 0;
  // Payback period in months: CAC / ARPA = CAC / (MRR / Customers)
  const paybackPeriod = ltv > 0 && cac > 0 && activeCustomers > 0 ? (cac / ((arr / 12) / activeCustomers)) : 0;

  return {
    executiveSummary: {
      arr: Math.round(arr),
      activeCustomers: activeCustomers,
      monthsRunway: Math.round(runwayMonths * 10) / 10,
      healthScore: Math.round(healthScore),
      arrGrowth: Math.round(arrGrowth * 10) / 10,
      customerGrowth: Math.round(customerGrowth * 10) / 10,
      runwayChange: 0,
    },
    monthlyMetrics,
    milestones,
    keyUpdates,
    unitEconomics: {
      ltv: Math.round(ltv),
      cac: Math.round(cac),
      ltvCacRatio: Math.round(ltvCacRatio * 10) / 10,
      paybackPeriod: Math.round(paybackPeriod * 10) / 10,
    },
    saasMetrics: {
      nrr: 100, // Baseline NRR
      grr: 100, // Baseline GRR
      ruleOf40: 0,
      burnMultiple: 0,
      magicNumber: 0,
    },
    sensitivityAnalysis: null,
    valuationSummary: null,
    marketImplications: null,
    aiNarrative: null,
    competitiveBenchmark: null,
    headcount: null,
    variances: null,
  };

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
    saasMetrics: {
      nrr: 0,
      grr: 0,
      ruleOf40: 0,
      burnMultiple: 0,
      magicNumber: 0,
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
    sensitivityAnalysis: null,
    valuationSummary: null,
    marketImplications: null,
    aiNarrative: null,
    competitiveBenchmark: null,
    headcount: null,
    variances: null,
  };
}


/**
 * Extract vendor/customer name from transaction description or rawPayload
 */
function extractVendorFromDescription(description: string | null, rawPayload: any): string | null {
  if (!description && !rawPayload) return null;

  // Try to extract from description (common patterns)
  if (description) {
    // Remove common prefixes/suffixes
    let vendor = description.trim();

    // Remove transaction IDs, reference numbers
    vendor = vendor.replace(/\b(REF|REF#|REFERENCE|TXN|ID|#)\s*:?\s*[A-Z0-9-]+\b/gi, '').trim();

    // Remove amounts
    vendor = vendor.replace(/\$[\d,]+\.?\d*/g, '').trim();

    // Remove dates
    vendor = vendor.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '').trim();

    // Take first meaningful words (usually vendor name is at the start)
    const words = vendor.split(/\s+/).filter(w => w.length > 2);
    if (words.length > 0) {
      // Take first 2-3 words as vendor name
      return words.slice(0, 3).join(' ').substring(0, 50);
    }
  }

  // Try to extract from rawPayload
  if (rawPayload && typeof rawPayload === 'object') {
    const vendorFields = ['vendor', 'merchant', 'payee', 'name', 'company', 'business', 'customer'];
    for (const field of vendorFields) {
      if (rawPayload[field] && typeof rawPayload[field] === 'string') {
        return rawPayload[field].substring(0, 50);
      }
    }
  }

  return description ? description.substring(0, 50) : null;
}


