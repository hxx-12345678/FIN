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
}

export const overviewDashboardService = {
  /**
   * Get overview dashboard data for an organization
   */
  getOverviewData: async (orgId: string): Promise<OverviewDashboardData> => {
    // Get actual transaction data from raw_transactions
    // First, try last 12 months, but if no data, use ALL available transactions
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1); // Last 12 months
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month
    
    // Fetch transactions from database (last 12 months first)
    let transactions = await prisma.rawTransaction.findMany({
      where: {
        orgId,
        date: {
          gte: startDate,
          lte: endDate,
        },
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
        },
        orderBy: {
          date: 'desc',
        },
        take: 1000, // Limit to prevent performance issues
      });
    }
    
    // Calculate revenue and expenses from transactions
    const monthlyRevenueMap = new Map<string, number>();
    const monthlyExpenseMap = new Map<string, number>();
    
    for (const tx of transactions) {
      const month = String(tx.date.getMonth() + 1).padStart(2, '0');
      const period = `${tx.date.getFullYear()}-${month}`;
      const amount = Number(tx.amount);
      
      if (amount > 0) {
        monthlyRevenueMap.set(period, (monthlyRevenueMap.get(period) || 0) + amount);
      } else {
        monthlyExpenseMap.set(period, (monthlyExpenseMap.get(period) || 0) + Math.abs(amount));
      }
    }
    
    // Try to get investor dashboard data (may return defaults if no baseline run)
    let investorData;
    try {
      investorData = await investorDashboardService.getDashboardData(orgId);
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
    
    // Try to get cash balance and customers from any model run (baseline or scenario)
    const anyModelRun = await prisma.modelRun.findFirst({
      where: {
        orgId,
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
    
    if (investorData) {
      runwayMonths = investorData.executiveSummary.monthsRunway || 0;
      healthScore = investorData.executiveSummary.healthScore || 50;
      if (activeCustomers === 0) {
        activeCustomers = investorData.executiveSummary.activeCustomers || 0;
      }
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
    
    // Calculate health score based on available metrics
    if (healthScore === 0 || healthScore === 50) {
      if (monthlyRevenue > 0 && monthlyBurnRate > 0) {
        const burnRatio = monthlyBurnRate / monthlyRevenue;
        const runwayScore = Math.min(100, Math.max(0, (runwayMonths / 24) * 100)); // 24 months = 100%
        const growthScore = Math.min(100, Math.max(0, (revenueGrowth + 50))); // -50% to +50% mapped to 0-100
        const burnScore = Math.max(0, 100 - (burnRatio * 50)); // Lower burn ratio = higher score
        
        healthScore = Math.round((runwayScore * 0.4) + (growthScore * 0.3) + (burnScore * 0.3));
      } else if (monthlyRevenue > 0) {
        // Just revenue growth
        const growthScore = Math.min(100, Math.max(0, (revenueGrowth + 50)));
        healthScore = Math.round(growthScore);
      }
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
    const expenseBreakdownMap = new Map<string, number>();
    
    for (const tx of transactions) {
      const amount = Number(tx.amount);
      if (amount < 0 && tx.category) {
        const category = tx.category;
        expenseBreakdownMap.set(category, (expenseBreakdownMap.get(category) || 0) + Math.abs(amount));
      }
    }
    
    let expenseBreakdown: Array<{ name: string; value: number; color: string }> = [];
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff88', '#0088fe', '#00c49f'];
    
    if (expenseBreakdownMap.size > 0) {
      // Use actual categories from transactions
      let colorIndex = 0;
      for (const [category, value] of expenseBreakdownMap.entries()) {
        expenseBreakdown.push({
          name: category,
          value: Math.round(value),
          color: colors[colorIndex % colors.length],
        });
        colorIndex++;
      }
      // Sort by value descending
      expenseBreakdown.sort((a, b) => b.value - a.value);
      // Limit to top 5
      expenseBreakdown = expenseBreakdown.slice(0, 5);
    } else {
      // Fallback to default breakdown
      const totalExpenses = monthlyBurnRate;
      expenseBreakdown = [
        { name: 'Payroll', value: Math.round(totalExpenses * 0.55), color: '#8884d8' },
        { name: 'Marketing', value: Math.round(totalExpenses * 0.20), color: '#82ca9d' },
        { name: 'Operations', value: Math.round(totalExpenses * 0.15), color: '#ffc658' },
        { name: 'R&D', value: Math.round(totalExpenses * 0.08), color: '#ff7300' },
        { name: 'Other', value: Math.round(totalExpenses * 0.02), color: '#00ff88' },
      ];
    }
    
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
    
    if (!hasData) {
      // Only show welcome message if no data
      alerts.push({
        type: 'info',
        title: 'Welcome to Financial Overview',
        message: 'Connect your accounting system or import transactions to get real-time financial insights and AI-powered recommendations.',
      });
    } else {
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
    
    // Keep expenseBreakdown in original format for frontend compatibility: { name, value, color }
    // Ensure we always return at least default breakdown so charts aren't empty
    let finalExpenseBreakdown = expenseBreakdown.length > 0 ? expenseBreakdown : [];
    
    // If no expenses, provide default breakdown based on monthly burn rate
    if (finalExpenseBreakdown.length === 0 && monthlyBurnRate > 0) {
      const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff88', '#0088fe', '#00c49f'];
      finalExpenseBreakdown = [
        { name: 'Payroll', value: Math.round(monthlyBurnRate * 0.55), color: colors[0] },
        { name: 'Marketing', value: Math.round(monthlyBurnRate * 0.20), color: colors[1] },
        { name: 'Operations', value: Math.round(monthlyBurnRate * 0.15), color: colors[2] },
        { name: 'R&D', value: Math.round(monthlyBurnRate * 0.08), color: colors[3] },
        { name: 'Other', value: Math.round(monthlyBurnRate * 0.02), color: colors[4] },
      ].filter(item => item.value > 0); // Remove zero values
    }
    
    // If still empty, use default
    if (finalExpenseBreakdown.length === 0) {
      finalExpenseBreakdown = [
        { name: 'Payroll', value: 180000, color: '#8884d8' },
        { name: 'Marketing', value: 45000, color: '#82ca9d' },
        { name: 'Operations', value: 32000, color: '#ffc658' },
        { name: 'R&D', value: 28000, color: '#ff7300' },
        { name: 'Other', value: 15000, color: '#00ff88' },
      ];
    }
    
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
      // Frontend-compatible format (what overview-dashboard.tsx expects)
      revenueData: finalRevenueData, // { month, revenue, forecast } - Always array, never null
      expenseBreakdown: finalExpenseBreakdown, // { name, value, color } - Always array, never null
      burnRateData: burnRateData.length > 0 ? burnRateData : getDefaultBurnRateData(), // Always array, never null
      alerts: alerts.length > 0 ? alerts : getDefaultAlerts(), // Always array, never null
      // Standardized response shape (for other components)
      cashRunwayMonths: Math.round(runwayMonths * 10) / 10, // Alias for cashRunway
      burnRate: Math.round(monthlyBurnRate), // Alias for monthlyBurnRate
      topVendors: topVendors.length > 0 ? topVendors : [], // Always array, never null
      topCustomers: topCustomers.length > 0 ? topCustomers : [], // Always array, never null
    };
  },
};

function getDefaultRevenueData() {
  return [
    { month: 'Jan', revenue: 45000, forecast: 42000 },
    { month: 'Feb', revenue: 52000, forecast: 48000 },
    { month: 'Mar', revenue: 48000, forecast: 51000 },
    { month: 'Apr', revenue: 61000, forecast: 55000 },
    { month: 'May', revenue: 55000, forecast: 58000 },
    { month: 'Jun', revenue: 67000, forecast: 62000 },
  ];
}

function getDefaultBurnRateData() {
  return [
    { month: 'Jan', burn: 35000, runway: 18 },
    { month: 'Feb', burn: 38000, runway: 17 },
    { month: 'Mar', burn: 42000, runway: 16 },
    { month: 'Apr', burn: 39000, runway: 15 },
    { month: 'May', burn: 41000, runway: 14 },
    { month: 'Jun', burn: 44000, runway: 13 },
  ];
}

function getDefaultAlerts() {
  return [
    {
      type: 'info' as const,
      title: 'Welcome',
      message: 'Connect your accounting system to get real-time financial insights.',
    },
  ];
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
    const vendorFields = ['vendor', 'merchant', 'payee', 'name', 'company', 'business'];
    for (const field of vendorFields) {
      if (rawPayload[field] && typeof rawPayload[field] === 'string') {
        return rawPayload[field].substring(0, 50);
      }
    }
  }
  
  return description ? description.substring(0, 50) : null;
}

