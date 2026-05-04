/**
 * Overview Dashboard Service
 * Provides financial overview metrics and insights
 */

import prisma from '../config/database';
import { investorDashboardService } from './investor-dashboard.service';

export interface OverviewDashboardData {
  healthScore: number;
  monthlyRevenue: number;
  monthlyBurnRate: number;
  cashRunway: number;
  activeCustomers: number;
  revenueGrowth: number;
  burnRateChange: number;
  runwayChange: number;
  // Frontend-compatible format (what overview-dashboard.tsx expects)
  revenueData: Array<{
    month: string;
    revenue: number;
    forecast: number;
  }>;
  expenseBreakdown: Array<{
    name: string;
    value: number;
    color: string;
    type: 'COGS' | 'R&D' | 'S&M' | 'G&A';
    vendors: Array<{ name: string; value: number }>;
  }>;
  burnRateData: Array<{
    month: string;
    burn: number;
    runway: number;
  }>;
  alerts: Array<{
    type: 'warning' | 'success' | 'info';
    title: string;
    message: string;
  }>;
  // Additional standardized fields
  cashRunwayMonths?: number;
  burnRate?: number;
  topVendors?: Array<{
    name: string;
    amount: number;
  }>;
  topCustomers?: Array<{
    name: string;
    amount: number;
  }>;
  costSegregation: {
    direct: number; // COGS
    indirect: number; // OpEx
    grossMargin: number;
    operatingMargin: number;
  };
}

export const overviewDashboardService = {
  /**
   * Get overview dashboard data for an organization
   */
  getOverviewData: async (orgId: string, modelId?: string): Promise<OverviewDashboardData> => {
    // Get actual transaction data from raw_transactions
    // First, try last 12 months, but if no data, use ALL available transactions
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1); // Last 12 months
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month

    // Fetch transactions from database (last 12 months first)
    let transactions = await prisma.rawTransaction.findMany({
      where: {
        orgId,
        isDuplicate: false,
        date: {
          gte: startDate,
          lte: endDate,
        },
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
    });

    // If no recent transactions, get ALL transactions (for orgs with old data)
    if (transactions.length === 0) {
      console.log(`[Overview] No transactions in last 12 months, fetching ALL transactions`);
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

    // Calculate revenue and expenses from transactions
    const monthlyRevenueMap = new Map<string, number>();
    const monthlyExpenseMap = new Map<string, number>();

    // Helper to determine if a category is revenue or expense
    const revenueKeywords = ['revenue', 'sales', 'income', 'earning', 'subscription', 'fee'];
    const expenseKeywords = ['cogs', 'payroll', 'marketing', 'ads', 'rent', 'expense', 'hardware', 'software', 'cost', 'utilities', 'insurance', 'tax', 'interest', 'commission', 'bonus', 'salary', 'vendor', 'payment'];

    for (const tx of transactions) {
      const month = String(tx.date.getMonth() + 1).padStart(2, '0');
      const period = `${tx.date.getFullYear()}-${month}`;
      const amount = Number(tx.amount);
      const category = (tx.category || '').toLowerCase();

      // Determine if revenue or expense based on category keywords + sign
      let isRevenue = amount > 0;
      
      // If we have explicit keywords, they take priority for ambiguous positive values
      if (revenueKeywords.some(k => category.includes(k))) {
        isRevenue = true;
      } else if (expenseKeywords.some(k => category.includes(k))) {
        isRevenue = false;
      }

      if (isRevenue) {
        monthlyRevenueMap.set(period, (monthlyRevenueMap.get(period) || 0) + Math.abs(amount));
      } else {
        monthlyExpenseMap.set(period, (monthlyExpenseMap.get(period) || 0) + Math.abs(amount));
      }
    }

    // Try to get investor dashboard data (may return defaults if no baseline run)
    let investorData;
    try {
      investorData = await investorDashboardService.getDashboardData(orgId, modelId);
    } catch (error) {
      console.log(`[Overview] Error getting investor data, using fallback: ${error}`);
      investorData = null;
    }

    // Determine the date range for charts (last 6 months ending at latest data or current date)
    let chartPeriods: string[] = [];

    const allPeriods = Array.from(new Set([
      ...monthlyRevenueMap.keys(),
      ...monthlyExpenseMap.keys()
    ])).sort();

    if (allPeriods.length > 0) {
      // Use the latest period with data as the end of our 6-month window
      const lastPeriod = allPeriods[allPeriods.length - 1];
      const [year, month] = lastPeriod.split('-').map(Number);
      const lastDate = new Date(year, month - 1, 1);

      chartPeriods = Array.from({ length: 6 }, (_, i) => {
        const date = new Date(lastDate.getFullYear(), lastDate.getMonth() - i, 1);
        const m = String(date.getMonth() + 1).padStart(2, '0');
        return `${date.getFullYear()}-${m}`;
      }).reverse();
    } else {
      // Default to last 6 months from now
      chartPeriods = Array.from({ length: 6 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = String(date.getMonth() + 1).padStart(2, '0');
        return `${date.getFullYear()}-${m}`;
      }).reverse();
    }

    // Use actual transaction data if available, otherwise use model data
    let monthlyRevenue = 0;
    let monthlyBurnRate = 0;
    let revenueGrowth = 0;

    console.log(`[Overview] Found ${transactions.length} transactions for org ${orgId}`);

    if (transactions.length > 0) {
      console.log(`[Overview] Processing transactions, date range: ${transactions[0].date} to ${transactions[transactions.length - 1].date}`);

      console.log(`[Overview] Periods with data: ${allPeriods.join(', ')}`);

      if (allPeriods.length > 0) {
        // Use the most recent period with data
        const latestPeriod = allPeriods[allPeriods.length - 1];
        const latestMonthRevenue = monthlyRevenueMap.get(latestPeriod) || 0;
        const latestMonthBurnRate = monthlyExpenseMap.get(latestPeriod) || 0;

        // Calculate average revenue from all available months (or last 3 if more than 3)
        const periodsForAvg = allPeriods.slice(-3);
        const totalRevenue = periodsForAvg.reduce((sum, period) => {
          return sum + (monthlyRevenueMap.get(period) || 0);
        }, 0);
        const avgMonthlyRevenue = periodsForAvg.length > 0 ? totalRevenue / periodsForAvg.length : 0;

        monthlyRevenue = avgMonthlyRevenue;
        monthlyBurnRate = latestMonthBurnRate;

        // Calculate growth: compare latest period with previous period
        if (allPeriods.length >= 2) {
          const prevPeriod = allPeriods[allPeriods.length - 2];
          const prevRevenue = monthlyRevenueMap.get(prevPeriod) || 0;
          revenueGrowth = prevRevenue > 0 ? ((latestMonthRevenue - prevRevenue) / prevRevenue) * 100 : 0;
        }

        console.log(`[Overview] Calculated: monthlyRevenue=$${monthlyRevenue}, monthlyBurnRate=$${monthlyBurnRate}, revenueGrowth=${revenueGrowth}%`);
        console.log(`[Overview] Latest period: ${latestPeriod}, Revenue: $${latestMonthRevenue}, Burn: $${latestMonthBurnRate}`);
      } else {
        console.log(`[Overview] No periods with data found`);
      }
    } else {
      console.log(`[Overview] No transactions found, using model data fallback`);
      // Fallback to model data if available
      if (investorData) {
        const arr = investorData.executiveSummary.arr;
        monthlyRevenue = arr / 12;
        monthlyBurnRate = investorData.monthlyMetrics.length > 0
          ? investorData.monthlyMetrics[investorData.monthlyMetrics.length - 1].burn
          : 0;
        revenueGrowth = investorData.executiveSummary.arrGrowth;
      } else {
        // No model data either, use defaults
        monthlyRevenue = 0;
        monthlyBurnRate = 0;
        revenueGrowth = 0;
      }
    }

    // Calculate runway, health score, and active customers
    let runwayMonths = 0;
    let healthScore = 50; // Default middle score
    let activeCustomers = 0;

    // Try to get cash balance and customers from specific model run if provided, 
    // otherwise any model run (baseline or scenario)
    const anyModelRun = await prisma.modelRun.findFirst({
      where: {
        orgId,
        ...(modelId ? { modelId } : {}),
        status: 'done',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let cashBalance = 0;
    if (anyModelRun && anyModelRun.summaryJson) {
      const summary = anyModelRun.summaryJson as any;
      cashBalance = Number(summary.cashBalance || 0);
      // Get active customers from model run - if 0 or missing, don't use fallback (let it stay 0)
      // Only use model run data if it's a real value (> 0)
      const modelCustomers = Number(summary.activeCustomers || summary.customerCount || summary.customers || 0);
      if (modelCustomers > 0) {
        activeCustomers = modelCustomers;
      }
    }

    // Priority 2: Check for user-provided customer count from data import batches
    if (activeCustomers === 0) {
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
          console.log(`[Overview] Using initialCustomers from import batch: ${activeCustomers}`);
        }
      }
    }

    if (investorData) {
      runwayMonths = investorData.executiveSummary.monthsRunway || 0;
      healthScore = investorData.executiveSummary.healthScore || 50;
      if (activeCustomers === 0) {
        activeCustomers = investorData.executiveSummary.activeCustomers || 0;
      }
    }

    // If still 0, count unique customers from revenue transactions
    if (activeCustomers === 0 && transactions.length > 0) {
      const uniqueCustomers = new Set<string>();
      for (const tx of transactions) {
        const amount = Number(tx.amount);
        if (amount > 0) { // Revenue transactions
          const customer = extractVendorFromDescription(tx.description, tx.rawPayload as any);
          if (customer && customer !== 'Unknown') {
            uniqueCustomers.add(customer);
          }
        }
      }
      activeCustomers = uniqueCustomers.size;
      console.log(`[Overview] Calculated ${activeCustomers} unique customers from ${transactions.length} transactions`);
    }

    // Use standardized runway calculation service
    const { runwayCalculationService } = await import('./runway-calculation.service');
    const runwayData = await runwayCalculationService.calculateRunway(orgId);
    runwayMonths = runwayData.runwayMonths;
    cashBalance = runwayData.cashBalance;
    // Update monthlyBurnRate if we got a better value from runway service
    if (runwayData.monthlyBurnRate > 0 && monthlyBurnRate === 0) {
      monthlyBurnRate = runwayData.monthlyBurnRate;
    }
    console.log(`[Overview] Using standardized runway: ${runwayMonths.toFixed(2)} months (source: ${runwayData.source})`);

    // Ensure runway is never negative and cap at reasonable maximum
    // IMPORTANT: If burn rate > 0, runway should be calculated, not capped at 999
    // Only cap at 999 if there's truly no burn rate (infinite runway)
    if (runwayMonths < 0) {
      runwayMonths = 0;
    } else if (runwayMonths > 999 && monthlyBurnRate === 0) {
      // Only cap at 999 if there's no burn rate (infinite runway scenario)
      runwayMonths = 999;
    } else if (runwayMonths > 999 && monthlyBurnRate > 0) {
      // If burn rate exists but runway is > 999, something is wrong - recalculate
      if (cashBalance > 0) {
        runwayMonths = cashBalance / monthlyBurnRate;
        console.log(`[Overview] Recalculated runway from >999 to ${runwayMonths.toFixed(2)} months (burn rate exists)`);
      } else {
        runwayMonths = 0;
      }
    }

    // Calculate health score based on available metrics - use same formula as investor dashboard
    if (healthScore === 0 || healthScore === 50) {
      // Import the same calculateHealthScore function used by investor dashboard
      const { investorDashboardService } = await import('./investor-dashboard.service');
      // Calculate ARR for health score
      const arr = monthlyRevenue * 12;
      // Use the same health score calculation as investor dashboard
      const calculateHealthScore = (params: {
        arr: number;
        burnRate: number;
        runwayMonths: number;
        arrGrowth: number;
      }): number => {
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
      };

      // For accounts with NO arr growth (first month), provide a base score if they have runway
      const effectiveArrGrowth = arr > 0 && revenueGrowth === 0 ? 5 : revenueGrowth;

      healthScore = calculateHealthScore({
        arr,
        burnRate: monthlyBurnRate,
        runwayMonths,
        arrGrowth: effectiveArrGrowth,
      });
    }

    // Generate revenue vs forecast data from actual transactions
    let revenueData: Array<{ month: string; revenue: number; forecast: number }> = [];

    if (transactions.length > 0) {
      // Use actual transaction data
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      revenueData = chartPeriods.map((period, index) => {
        const [year, month] = period.split('-');
        const monthIndex = parseInt(month) - 1;
        const monthName = monthNames[monthIndex];
        const actualRevenue = monthlyRevenueMap.get(period) || 0;
        // Forecast based on growth trend
        const growthFactor = 1 + (revenueGrowth / 100);
        const forecast = actualRevenue > 0
          ? actualRevenue * growthFactor
          : monthlyRevenue * Math.pow(growthFactor, index + 1);

        return {
          month: monthName,
          revenue: Math.round(actualRevenue),
          forecast: Math.round(forecast),
        };
      });
    } else if (investorData && investorData.monthlyMetrics.length > 0) {
      const metrics = investorData.monthlyMetrics.slice(-6);
      revenueData = metrics.map((metric, index) => {
        const baseRevenue = metric.revenue;
        const growthFactor = 1 + (revenueGrowth / 100);
        const forecast = baseRevenue * Math.pow(growthFactor, index + 1);
        return {
          month: metric.month,
          revenue: baseRevenue,
          forecast: Math.round(forecast),
        };
      });
    } else {
      // Generate default data if no metrics
      const baseRevenue = monthlyRevenue;
      revenueData = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, index) => ({
        month,
        revenue: Math.round(baseRevenue * (1 + index * 0.05)),
        forecast: Math.round(baseRevenue * (1 + (index + 1) * 0.08)),
      }));
    }

    // Generate burn rate data
    let burnRateData: Array<{ month: string; burn: number; runway: number }> = [];
    if (investorData && investorData.monthlyMetrics.length > 0) {
      const metrics = investorData.monthlyMetrics.slice(-6);
      burnRateData = metrics.map((metric, index) => {
        const remainingMonths = Math.max(0, runwayMonths - index);
        return {
          month: metric.month,
          burn: metric.burn,
          runway: Math.round(remainingMonths * 10) / 10,
        };
      });
    } else if (transactions.length > 0) {
      // Use actual transaction data for burn rate
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      burnRateData = chartPeriods.map((period, index) => {
        const [year, month] = period.split('-');
        const monthIndex = parseInt(month) - 1;
        const monthName = monthNames[monthIndex];
        const actualBurn = monthlyExpenseMap.get(period) || 0;
        const remainingMonths = Math.max(0, runwayMonths - index);
        return {
          month: monthName,
          burn: Math.round(actualBurn),
          runway: Math.round(remainingMonths * 10) / 10,
        };
      });
    } else {
      // Generate default data if no metrics
      burnRateData = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, index) => ({
        month,
        burn: Math.round(monthlyBurnRate * (1 + index * 0.02)),
        runway: Math.max(0, runwayMonths - index),
      }));
    }

    // Generate expense breakdown from actual transactions
    const expenseBreakdownMap = new Map<string, { total: number, vendors: Map<string, number> }>();

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      const category = tx.category || 'Uncategorized';
      const description = tx.description || 'Unknown';
      const categoryLower = category.toLowerCase();

      // Determine if revenue or expense
      let isTxRevenue = amount > 0;
      if (revenueKeywords.some(k => categoryLower.includes(k))) {
        isTxRevenue = true;
      } else if (expenseKeywords.some(k => categoryLower.includes(k))) {
        isTxRevenue = false;
      }

      if (!isTxRevenue) {
        const absAmount = Math.abs(amount);
        if (!expenseBreakdownMap.has(category)) {
          expenseBreakdownMap.set(category, { total: 0, vendors: new Map() });
        }
        const catData = expenseBreakdownMap.get(category)!;
        catData.total += absAmount;
        
        // Extract vendor from description
        const vendor = extractVendorFromDescription(description, tx.rawPayload as any);
        catData.vendors.set(vendor, (catData.vendors.get(vendor) || 0) + absAmount);
      }
    }

    // Helper for cost classification
    const classify = (name: string): 'COGS' | 'R&D' | 'S&M' | 'G&A' => {
      const lower = name.toLowerCase();
      const COGS_KEYWORDS = ['hosting', 'cloud', 'aws', 'azure', 'gcp', 'infrastructure', 'devops', 'sre', 'support', 'customer success', 'onboarding', 'implementation', 'cogs', 'server', 'bandwidth', 'cdn', 'api', 'third-party', 'payment processing', 'stripe', 'twilio'];
      const OPEX_RD_KEYWORDS = ['r&d', 'engineering', 'product', 'development', 'research'];
      const OPEX_SM_KEYWORDS = ['marketing', 'sales', 'ads', 'advertising', 'commission', 'lead gen', 'seo', 'content'];
      
      if (COGS_KEYWORDS.some(k => lower.includes(k))) return 'COGS';
      if (OPEX_RD_KEYWORDS.some(k => lower.includes(k))) return 'R&D';
      if (OPEX_SM_KEYWORDS.some(k => lower.includes(k))) return 'S&M';
      return 'G&A';
    };

    let expenseBreakdown: OverviewDashboardData['expenseBreakdown'] = [];
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff88', '#0088fe', '#00c49f'];

    let directCosts = 0;
    let indirectCosts = 0;

    if (expenseBreakdownMap.size > 0) {
      let colorIndex = 0;
      for (const [category, data] of expenseBreakdownMap.entries()) {
        const type = classify(category);
        if (type === 'COGS') directCosts += data.total;
        else indirectCosts += data.total;

        const vendors = Array.from(data.vendors.entries())
          .map(([name, value]) => ({ name, value: Math.round(value) }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        expenseBreakdown.push({
          name: category,
          value: Math.round(data.total),
          color: colors[colorIndex % colors.length],
          type,
          vendors
        });
        colorIndex++;
      }
      expenseBreakdown.sort((a, b) => b.value - a.value);
      expenseBreakdown = expenseBreakdown.slice(0, 8); // Keep more categories for drill-down
    } else {
      // Default fallback
      const totalExpenses = monthlyBurnRate;
      expenseBreakdown = [
        { name: 'Payroll', value: Math.round(totalExpenses * 0.55), color: '#8884d8', type: 'G&A', vendors: [] },
        { name: 'Marketing', value: Math.round(totalExpenses * 0.20), color: '#82ca9d', type: 'S&M', vendors: [] },
        { name: 'Cloud Hosting', value: Math.round(totalExpenses * 0.15), color: '#ffc658', type: 'COGS', vendors: [{ name: 'AWS', value: Math.round(totalExpenses * 0.15) }] },
        { name: 'R&D', value: Math.round(totalExpenses * 0.08), color: '#ff7300', type: 'R&D', vendors: [] },
        { name: 'Other', value: Math.round(totalExpenses * 0.02), color: '#00ff88', type: 'G&A', vendors: [] },
      ];
      directCosts = totalExpenses * 0.15;
      indirectCosts = totalExpenses * 0.85;
    }

    const grossMargin = monthlyRevenue > 0 ? ((monthlyRevenue - directCosts) / monthlyRevenue) * 100 : 0;
    const operatingMargin = monthlyRevenue > 0 ? ((monthlyRevenue - directCosts - indirectCosts) / monthlyRevenue) * 100 : 0;

    // Calculate changes BEFORE generating alerts (needed for burnRateChange alerts)
    let burnRateChange = 0;
    if (investorData && investorData.monthlyMetrics.length >= 2) {
      burnRateChange = ((monthlyBurnRate - investorData.monthlyMetrics[investorData.monthlyMetrics.length - 2].burn) /
        investorData.monthlyMetrics[investorData.monthlyMetrics.length - 2].burn) * 100;
    } else if (allPeriods.length >= 2) {
      // Calculate from transaction data
      const latestPeriod = allPeriods[allPeriods.length - 1];
      const prevPeriod = allPeriods[allPeriods.length - 2];
      const latestBurn = monthlyExpenseMap.get(latestPeriod) || 0;
      const prevBurn = monthlyExpenseMap.get(prevPeriod) || 0;
      if (prevBurn > 0) {
        burnRateChange = ((latestBurn - prevBurn) / prevBurn) * 100;
      }
    }

    const runwayChange = investorData ? investorData.executiveSummary.runwayChange : 0;

    // Generate comprehensive AI-powered alerts based on actual data
    const alerts: Array<{ type: 'warning' | 'success' | 'info'; title: string; message: string }> = [];
    // Only show alerts if we have meaningful data
    const hasData = transactions.length > 0 || monthlyRevenue > 0 || monthlyBurnRate > 0;

    // Check for previous successful model runs
    const modelRunCount = await prisma.modelRun.count({
      where: { orgId, status: 'done' }
    });

    if (!hasData) {
      // Only show welcome message if no data
      alerts.push({
        type: 'info',
        title: 'Welcome to Financial Overview',
        message: 'Connect your accounting system or import transactions to get real-time financial insights and AI-powered recommendations.',
      });
    } else {
      // Data detected, check if a model has been run
      if (modelRunCount === 0) {
        alerts.push({
          type: 'info',
          title: '💼 Financial Data Detected',
          message: 'We\'ve analyzed your imported transactions. To unlock deep AI forecasting, unit economics (LTV/CAC), and custom growth scenarios, run your first financial model now.',
        });
      }
      // Cash Runway Alerts (Critical Priority)
      if (runwayMonths > 0 && runwayMonths < 3) {
        alerts.push({
          type: 'warning',
          title: '🚨 Critical Cash Runway',
          message: `Your cash runway is only ${runwayMonths.toFixed(1)} months. Immediate action required: reduce expenses, accelerate revenue, or secure funding within 30 days.`,
        });
      } else if (runwayMonths >= 3 && runwayMonths < 6) {
        alerts.push({
          type: 'warning',
          title: '⚠️ Low Cash Runway',
          message: `Cash runway is ${runwayMonths.toFixed(1)} months. Industry standard is 9-12 months. Consider: (1) Reducing burn rate by ${((monthlyBurnRate * 0.2) / 1000).toFixed(0)}k/month, (2) Raising capital, or (3) Accelerating revenue growth.`,
        });
      } else if (runwayMonths >= 6 && runwayMonths < 12) {
        alerts.push({
          type: 'info',
          title: '📅 Runway Planning',
          message: `Cash runway is ${runwayMonths.toFixed(1)} months. Start planning your next funding round now. Typical fundraising takes 3-6 months. Target runway: 12+ months for optimal flexibility.`,
        });
      } else if (runwayMonths >= 12 && runwayMonths < 18) {
        alerts.push({
          type: 'success',
          title: '✅ Healthy Runway',
          message: `Cash runway is ${runwayMonths.toFixed(1)} months - within healthy range. Continue monitoring monthly and plan fundraising 6 months before runway drops below 12 months.`,
        });
      } else if (runwayMonths >= 18) {
        alerts.push({
          type: 'success',
          title: '🎉 Excellent Runway',
          message: `Cash runway is ${runwayMonths.toFixed(1)} months - excellent position. Focus on growth and efficiency. Consider strategic investments or expansion.`,
        });
      }

      // Revenue Growth Alerts
      if (revenueGrowth > 30) {
        alerts.push({
          type: 'success',
          title: '🚀 Exceptional Revenue Growth',
          message: `Revenue is growing at ${revenueGrowth.toFixed(1)}% - exceptional performance! Consider: (1) Scaling marketing to accelerate growth, (2) Investing in product development, (3) Expanding team capacity.`,
        });
      } else if (revenueGrowth > 20) {
        alerts.push({
          type: 'success',
          title: '📈 Strong Revenue Growth',
          message: `Revenue growth of ${revenueGrowth.toFixed(1)}% is strong. Maintain momentum by: (1) Optimizing sales processes, (2) Expanding successful channels, (3) Investing in customer success.`,
        });
      } else if (revenueGrowth > 10) {
        alerts.push({
          type: 'info',
          title: '📊 Positive Revenue Trend',
          message: `Revenue is growing at ${revenueGrowth.toFixed(1)}%. Good progress. To accelerate: (1) Increase marketing spend, (2) Improve conversion rates, (3) Expand to new markets.`,
        });
      } else if (revenueGrowth < 0 && revenueGrowth > -10) {
        alerts.push({
          type: 'warning',
          title: '⚠️ Revenue Decline',
          message: `Revenue declined ${Math.abs(revenueGrowth).toFixed(1)}%. Review: (1) Sales pipeline and conversion rates, (2) Customer churn and retention, (3) Market conditions. Take corrective action immediately.`,
        });
      } else if (revenueGrowth <= -10) {
        alerts.push({
          type: 'warning',
          title: '🚨 Significant Revenue Decline',
          message: `Revenue declined ${Math.abs(revenueGrowth).toFixed(1)}% - critical issue. Immediate actions: (1) Analyze root causes (churn, pricing, competition), (2) Implement retention programs, (3) Review go-to-market strategy.`,
        });
      }

      // Burn Rate vs Revenue Alerts
      if (monthlyRevenue > 0) {
        const burnRatio = monthlyBurnRate / monthlyRevenue;
        if (burnRatio > 2.0) {
          alerts.push({
            type: 'warning',
            title: '🔥 High Burn Ratio',
            message: `Burn rate is ${(burnRatio * 100).toFixed(0)}% of revenue - unsustainable. Target: <150%. Actions: (1) Reduce expenses by $${((monthlyBurnRate - monthlyRevenue * 1.5) / 1000).toFixed(0)}k/month, (2) Accelerate revenue, (3) Extend runway.`,
          });
        } else if (burnRatio > 1.5) {
          alerts.push({
            type: 'warning',
            title: '⚠️ Elevated Burn Ratio',
            message: `Burn rate is ${(burnRatio * 100).toFixed(0)}% of revenue - above ideal. Target: <150%. Consider: (1) Cost optimization, (2) Revenue acceleration, (3) Path to profitability planning.`,
          });
        } else if (burnRatio < 1.0 && monthlyRevenue > 0) {
          alerts.push({
            type: 'success',
            title: '✅ Positive Cash Flow',
            message: `Burn rate is ${(burnRatio * 100).toFixed(0)}% of revenue - generating positive cash flow! Excellent position. Consider reinvesting in growth or building cash reserves.`,
          });
        }
      }

      // Burn Rate Change Alerts
      if (Math.abs(burnRateChange) > 15) {
        if (burnRateChange > 0) {
          alerts.push({
            type: 'warning',
            title: '📊 Burn Rate Increasing',
            message: `Burn rate increased ${burnRateChange.toFixed(1)}% from last period. Review: (1) New hires and headcount, (2) Marketing spend, (3) Operational costs. Ensure increases align with growth plans.`,
          });
        } else {
          alerts.push({
            type: 'success',
            title: '💰 Burn Rate Decreasing',
            message: `Burn rate decreased ${Math.abs(burnRateChange).toFixed(1)}% - great efficiency improvement! Continue optimizing costs while maintaining growth momentum.`,
          });
        }
      }

      // Health Score Insights
      if (healthScore >= 80) {
        alerts.push({
          type: 'success',
          title: '🌟 Excellent Financial Health',
          message: `Financial health score: ${healthScore}/100. Your company is in excellent financial condition. Focus on scaling and strategic growth initiatives.`,
        });
      } else if (healthScore >= 60) {
        alerts.push({
          type: 'info',
          title: '📈 Good Financial Health',
          message: `Financial health score: ${healthScore}/100. Good position with room for improvement. Focus on: (1) Extending runway, (2) Optimizing burn ratio, (3) Accelerating growth.`,
        });
      } else if (healthScore < 40) {
        alerts.push({
          type: 'warning',
          title: '⚠️ Financial Health Needs Attention',
          message: `Financial health score: ${healthScore}/100. Immediate focus areas: (1) Extend cash runway, (2) Reduce burn rate, (3) Accelerate revenue growth, (4) Consider strategic pivots.`,
        });
      }

      // Customer Growth Insights
      if (activeCustomers > 0 && monthlyRevenue > 0) {
        const revenuePerCustomer = monthlyRevenue / activeCustomers;
        if (revenuePerCustomer < 100) {
          alerts.push({
            type: 'info',
            title: '👥 Customer Value Optimization',
            message: `Average revenue per customer: $${revenuePerCustomer.toFixed(0)}. Consider: (1) Upselling/cross-selling, (2) Pricing optimization, (3) Customer success programs to increase LTV.`,
          });
        }
      }
    }

    // Keep revenueData in original format for frontend compatibility: { month, revenue, forecast }
    // Ensure we always return at least default data so charts aren't empty
    let finalRevenueData = revenueData.length > 0 ? revenueData : getDefaultRevenueData();

    // Filter out months with zero revenue if we have actual data, but keep at least 3 months
    // This ensures charts show meaningful data
    if (finalRevenueData.length > 0) {
      const nonZeroData = finalRevenueData.filter(item => item.revenue > 0 || item.forecast > 0);
      if (nonZeroData.length >= 3) {
        finalRevenueData = nonZeroData;
      }
      // If we have less than 3 months of data, pad with forecast-only months
      if (finalRevenueData.length < 3 && transactions.length === 0) {
        // Use default data if no transactions
        finalRevenueData = getDefaultRevenueData();
      }
    }

    // Ensure we always return at least default breakdown so charts aren't empty
    const finalExpenseBreakdown = expenseBreakdown;


    // Get top vendors from transactions
    const vendorMap = new Map<string, number>();
    for (const tx of transactions) {
      const amount = Number(tx.amount);
      if (amount < 0) { // Only expenses have vendors
        const vendor = extractVendorFromDescription(tx.description, tx.rawPayload as any) || 'Unknown';
        vendorMap.set(vendor, (vendorMap.get(vendor) || 0) + Math.abs(amount));
      }
    }
    const topVendors: Array<{ name: string; amount: number }> = Array.from(vendorMap.entries())
      .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Get top customers from transactions (positive amounts)
    const customerMap = new Map<string, number>();
    for (const tx of transactions) {
      const amount = Number(tx.amount);
      if (amount > 0) { // Revenue transactions
        const customer = extractVendorFromDescription(tx.description, tx.rawPayload as any) || 'Unknown';
        customerMap.set(customer, (customerMap.get(customer) || 0) + amount);
      }
    }
    const topCustomers: Array<{ name: string; amount: number }> = Array.from(customerMap.entries())
      .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return {
      healthScore: Math.round(healthScore),
      monthlyRevenue: Math.round(monthlyRevenue),
      monthlyBurnRate: Math.round(monthlyBurnRate),
      cashRunway: Math.round(runwayMonths * 10) / 10,
      activeCustomers: activeCustomers,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      burnRateChange: Math.round(burnRateChange * 10) / 10,
      runwayChange: runwayChange,
      revenueData: finalRevenueData,
      expenseBreakdown: finalExpenseBreakdown,
      burnRateData: burnRateData.length > 0 ? burnRateData : getDefaultBurnRateData(),
      alerts: alerts.length > 0 ? alerts : getDefaultAlerts(),
      topVendors: finalExpenseBreakdown.flatMap(e => e.vendors).map(v => ({ name: v.name, amount: v.value })).sort((a, b) => b.amount - a.amount).slice(0, 10),
      topCustomers: topCustomers.length > 0 ? topCustomers : [],
      costSegregation: {
        direct: Math.round(directCosts),
        indirect: Math.round(indirectCosts),
        grossMargin: Math.round(grossMargin * 10) / 10,
        operatingMargin: Math.round(operatingMargin * 10) / 10,
      }
    };
  },
};

function getDefaultRevenueData() {
  return [];
}

function getDefaultBurnRateData() {
  return [];
}

function getDefaultAlerts() {
  return [
    {
      type: 'info' as const,
      title: 'Welcome',
      message: 'Connect your accounting system or import transactions to get real-time financial insights.',
    },
  ];
}

/**
 * Extract vendor/customer name from transaction description or rawPayload
 */
function extractVendorFromDescription(description: string | null, rawPayload: any): string {
  let result = 'Unknown';

  // 1. Try to extract from rawPayload (highest accuracy)
  if (rawPayload && typeof rawPayload === 'object') {
    const vendorFields = ['vendor', 'merchant', 'payee', 'name', 'company', 'business'];
    for (const field of vendorFields) {
      if (rawPayload[field] && typeof rawPayload[field] === 'string') {
        result = rawPayload[field].substring(0, 50);
        break;
      }
    }
  }

  // 2. Fallback to description cleaning if result is still unknown
  if (result === 'Unknown' && description) {
    let vendor = description.trim();

    // Remove transaction IDs, reference numbers
    vendor = vendor.replace(/\b(REF|REF#|REFERENCE|TXN|ID|#)\s*:?\s*[A-Z0-9-]+\b/gi, '').trim();

    // Remove amounts
    vendor = vendor.replace(/\$[\d,]+\.?\d*/g, '').trim();

    // Remove dates
    vendor = vendor.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '').trim();

    // Take first meaningful words
    const words = vendor.split(/\s+/).filter(w => w.length > 2);
    if (words.length > 0) {
      result = words.slice(0, 3).join(' ').substring(0, 50);
    } else {
      result = description.substring(0, 50);
    }
  }

  // 3. Normalization Layer (Professional Branding)
  const lower = result.toLowerCase();
  const normalizationMap: Record<string, string> = {
    'aws': 'Amazon Web Services',
    'amazon': 'Amazon Web Services',
    'google cloud': 'Google Cloud',
    'gcp': 'Google Cloud',
    'google*': 'Google',
    'slack': 'Slack',
    'zoom': 'Zoom',
    'github': 'GitHub',
    'stripe': 'Stripe',
    'twilio': 'Twilio',
    'salesforce': 'Salesforce',
    'hubspot': 'HubSpot',
    'microsoft': 'Microsoft',
    'azure': 'Microsoft Azure',
    'digitalocean': 'DigitalOcean',
    'cloudflare': 'Cloudflare',
    'atlassian': 'Atlassian',
    'jira': 'Atlassian (Jira)',
    'confluence': 'Atlassian (Confluence)',
    'notion': 'Notion',
    'figma': 'Figma',
    'canva': 'Canva',
    'adobe': 'Adobe',
    'mailchimp': 'Mailchimp',
    'sendgrid': 'SendGrid (Twilio)',
    'quickbooks': 'Intuit QuickBooks',
    'xero': 'Xero',
    'freshbooks': 'FreshBooks',
    'gusto': 'Gusto',
    'rippling': 'Rippling',
    'deel': 'Deel',
    'remote': 'Remote.com',
    'bill.com': 'Bill.com',
    'brex': 'Brex',
    'ramp': 'Ramp',
    'american express': 'American Express',
    'chase': 'JPMorgan Chase',
    'silicon valley bank': 'SVB',
    'svb': 'SVB',
  };

  for (const [key, cleanName] of Object.entries(normalizationMap)) {
    if (lower.includes(key)) return cleanName;
  }

  return result;
}



