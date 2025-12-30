/**
 * AI ANOMALY DETECTION SERVICE
 * Detects unusual patterns in financial data
 * Similar to Abacum's AI Anomaly Detection feature
 */

import { llmClient, LLMRequest } from './llm/llm-client.service';
import prisma from '../config/database';
import { logger } from '../utils/logger';

export interface AnomalyDetectionRequest {
  orgId: string;
  modelId?: string;
  checkTypes?: ('spending' | 'revenue' | 'data_quality' | 'budget_variance')[];
  threshold?: number; // Sensitivity (0-1)
}

export interface Anomaly {
  id: string;
  type: 'spending_spike' | 'spending_drop' | 'revenue_spike' | 'revenue_drop' | 'data_quality' | 'budget_variance' | 'unusual_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  category?: string;
  amount?: number;
  expectedAmount?: number;
  variance?: number;
  variancePercent?: number;
  detectedAt: Date;
  period?: string;
  recommendations?: string[];
  confidence: number;
}

export interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  detectedAt: Date;
}

export const aiAnomalyDetectionService = {
  /**
   * Detect anomalies in financial data
   */
  detectAnomalies: async (
    request: AnomalyDetectionRequest,
    userId: string
  ): Promise<AnomalyDetectionResult> => {
    try {
      const checkTypes = request.checkTypes || ['spending', 'revenue', 'data_quality', 'budget_variance'];
      const threshold = request.threshold || 0.7;

      const anomalies: Anomaly[] = [];

      // 1. Check spending anomalies
      if (checkTypes.includes('spending')) {
        const spendingAnomalies = await detectSpendingAnomalies(request.orgId, threshold);
        anomalies.push(...spendingAnomalies);
      }

      // 2. Check revenue anomalies
      if (checkTypes.includes('revenue')) {
        const revenueAnomalies = await detectRevenueAnomalies(request.orgId, threshold);
        anomalies.push(...revenueAnomalies);
      }

      // 3. Check data quality issues
      if (checkTypes.includes('data_quality')) {
        const dataQualityAnomalies = await detectDataQualityAnomalies(request.orgId);
        anomalies.push(...dataQualityAnomalies);
      }

      // 4. Check budget variances
      if (checkTypes.includes('budget_variance')) {
        const budgetAnomalies = await detectBudgetVarianceAnomalies(request.orgId, threshold);
        anomalies.push(...budgetAnomalies);
      }

      // 5. Use AI to detect unusual patterns
      const aiAnomalies = await detectAIAnomalies(request.orgId, anomalies, threshold);
      anomalies.push(...aiAnomalies);

      // Sort by severity
      anomalies.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });

      // Generate summary
      const summary = {
        total: anomalies.length,
        critical: anomalies.filter(a => a.severity === 'critical').length,
        high: anomalies.filter(a => a.severity === 'high').length,
        medium: anomalies.filter(a => a.severity === 'medium').length,
        low: anomalies.filter(a => a.severity === 'low').length,
      };

      // Store anomalies (optional - for alerting)
      await storeAnomalies(request.orgId, anomalies, userId);

      return {
        anomalies,
        summary,
        detectedAt: new Date(),
      };
    } catch (error: any) {
      logger.error('Error detecting anomalies', error);
      throw new Error(`Failed to detect anomalies: ${error.message}`);
    }
  },

  /**
   * Get recent anomalies for an org
   */
  getRecentAnomalies: async (
    orgId: string,
    limit: number = 10
  ): Promise<Anomaly[]> => {
    // For now, return empty array
    // In future, can query from database
    return [];
  },
};

/**
 * Detect spending anomalies
 */
async function detectSpendingAnomalies(orgId: string, threshold: number): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];

  // Get transactions from last 3 months
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const transactions = await prisma.rawTransaction.findMany({
    where: {
      orgId,
      isDuplicate: false,
      date: { gte: threeMonthsAgo },
      amount: { lt: 0 }, // Expenses (negative amounts)
    },
    orderBy: { date: 'desc' },
  });

  if (transactions.length === 0) {
    return anomalies;
  }

  // Group by category and month
  const categoryMonthly: Record<string, Record<string, number>> = {};

  transactions.forEach((tx) => {
    const category = tx.category || 'Uncategorized';
    const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;

    if (!categoryMonthly[category]) {
      categoryMonthly[category] = {};
    }
    if (!categoryMonthly[category][monthKey]) {
      categoryMonthly[category][monthKey] = 0;
    }
        categoryMonthly[category][monthKey] += Math.abs(Number(tx.amount));
  });

  // Detect spikes and drops
  Object.keys(categoryMonthly).forEach((category) => {
    const monthlyData = categoryMonthly[category];
    const months = Object.keys(monthlyData).sort();
    
    if (months.length < 2) return;

    // Calculate average (excluding last month)
    const historicalMonths = months.slice(0, -1);
    const avg = historicalMonths.reduce((sum, month) => sum + monthlyData[month], 0) / historicalMonths.length;
    const lastMonth = months[months.length - 1];
    const lastMonthAmount = monthlyData[lastMonth];

    // Detect spike (>50% increase)
    if (avg > 0 && lastMonthAmount > avg * 1.5) {
      const variancePercent = ((lastMonthAmount - avg) / avg) * 100;
      
      anomalies.push({
        id: `spending_spike_${category}_${lastMonth}`,
        type: 'spending_spike',
        severity: variancePercent > 100 ? 'critical' : variancePercent > 50 ? 'high' : 'medium',
        title: `Spending spike in ${category}`,
        description: `${category} spending increased by ${variancePercent.toFixed(1)}% in ${lastMonth} ($${lastMonthAmount.toLocaleString()} vs avg $${avg.toLocaleString()})`,
        category,
        amount: lastMonthAmount,
        expectedAmount: avg,
        variance: lastMonthAmount - avg,
        variancePercent,
        detectedAt: new Date(),
        period: lastMonth,
        recommendations: [
          'Review recent transactions in this category',
          'Verify if this is expected or needs investigation',
          'Consider setting up alerts for future spikes',
        ],
        confidence: 0.85,
      });
    }

    // Detect drop (>50% decrease)
    if (avg > 0 && lastMonthAmount < avg * 0.5) {
      const variancePercent = ((avg - lastMonthAmount) / avg) * 100;
      
      anomalies.push({
        id: `spending_drop_${category}_${lastMonth}`,
        type: 'spending_drop',
        severity: 'low',
        title: `Spending drop in ${category}`,
        description: `${category} spending decreased by ${variancePercent.toFixed(1)}% in ${lastMonth} ($${lastMonthAmount.toLocaleString()} vs avg $${avg.toLocaleString()})`,
        category,
        amount: lastMonthAmount,
        expectedAmount: avg,
        variance: lastMonthAmount - avg,
        variancePercent: -variancePercent,
        detectedAt: new Date(),
        period: lastMonth,
        recommendations: [
          'Verify if this is intentional cost reduction',
          'Check if any subscriptions or services were cancelled',
        ],
        confidence: 0.75,
      });
    }
  });

  return anomalies;
}

/**
 * Detect revenue anomalies
 */
async function detectRevenueAnomalies(orgId: string, threshold: number): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];

  // Get latest model run
  const latestModelRun = await prisma.modelRun.findFirst({
    where: {
      orgId,
      status: 'done',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!latestModelRun?.summaryJson) {
    return anomalies;
  }

  const summary = latestModelRun.summaryJson as any;
  
  if (!summary.monthly) {
    return anomalies;
  }

  const monthlyData = summary.monthly as Record<string, any>;
  const months = Object.keys(monthlyData).sort();

  if (months.length < 3) {
    return anomalies;
  }

  // Calculate average revenue (excluding last month)
  const historicalMonths = months.slice(0, -1);
  const avgRevenue = historicalMonths.reduce((sum, month) => {
    const revenue = Number(monthlyData[month].revenue || monthlyData[month].mrr || 0);
    return sum + revenue;
  }, 0) / historicalMonths.length;

  const lastMonth = months[months.length - 1];
  const lastMonthRevenue = Number(monthlyData[lastMonth].revenue || monthlyData[lastMonth].mrr || 0);

  // Detect revenue drop (>30% decrease)
  if (avgRevenue > 0 && lastMonthRevenue < avgRevenue * 0.7) {
    const variancePercent = ((avgRevenue - lastMonthRevenue) / avgRevenue) * 100;
    
    anomalies.push({
      id: `revenue_drop_${lastMonth}`,
      type: 'revenue_drop',
      severity: variancePercent > 50 ? 'critical' : variancePercent > 30 ? 'high' : 'medium',
      title: 'Revenue drop detected',
      description: `Revenue decreased by ${variancePercent.toFixed(1)}% in ${lastMonth} ($${lastMonthRevenue.toLocaleString()} vs avg $${avgRevenue.toLocaleString()})`,
      amount: lastMonthRevenue,
      expectedAmount: avgRevenue,
      variance: lastMonthRevenue - avgRevenue,
      variancePercent: -variancePercent,
      detectedAt: new Date(),
      period: lastMonth,
      recommendations: [
        'Investigate cause of revenue drop',
        'Review customer churn and new customer acquisition',
        'Check for any payment processing issues',
        'Analyze sales pipeline and conversion rates',
      ],
      confidence: 0.9,
    });
  }

  // Detect revenue spike (>50% increase)
  if (avgRevenue > 0 && lastMonthRevenue > avgRevenue * 1.5) {
    const variancePercent = ((lastMonthRevenue - avgRevenue) / avgRevenue) * 100;
    
    anomalies.push({
      id: `revenue_spike_${lastMonth}`,
      type: 'revenue_spike',
      severity: 'low', // Usually positive, but worth investigating
      title: 'Unusual revenue spike',
      description: `Revenue increased by ${variancePercent.toFixed(1)}% in ${lastMonth} ($${lastMonthRevenue.toLocaleString()} vs avg $${avgRevenue.toLocaleString()})`,
      amount: lastMonthRevenue,
      expectedAmount: avgRevenue,
      variance: lastMonthRevenue - avgRevenue,
      variancePercent,
      detectedAt: new Date(),
      period: lastMonth,
      recommendations: [
        'Verify if this is expected growth or one-time event',
        'Check for any large customer deals or contracts',
        'Ensure data accuracy',
      ],
      confidence: 0.85,
    });
  }

  return anomalies;
}

/**
 * Detect data quality anomalies
 */
async function detectDataQualityAnomalies(orgId: string): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];

  // Check for missing categories
  const uncategorizedCount = await prisma.rawTransaction.count({
    where: {
      orgId,
      category: null,
    },
  });

  const totalCount = await prisma.rawTransaction.count({
    where: { orgId },
  });

  if (totalCount > 0 && uncategorizedCount / totalCount > 0.1) {
    anomalies.push({
      id: `data_quality_uncategorized_${orgId}`,
      type: 'data_quality',
      severity: uncategorizedCount / totalCount > 0.3 ? 'high' : 'medium',
      title: 'High number of uncategorized transactions',
      description: `${uncategorizedCount} out of ${totalCount} transactions (${((uncategorizedCount / totalCount) * 100).toFixed(1)}%) are uncategorized`,
      detectedAt: new Date(),
      recommendations: [
        'Review and categorize uncategorized transactions',
        'Set up automatic categorization rules',
        'Improve data import process to include categories',
      ],
      confidence: 1.0,
    });
  }

  // Check for duplicate transactions
  const duplicates = await prisma.$queryRaw<Array<{ count: bigint; description: string; amount: number; date: Date }>>`
    SELECT 
      description,
      amount,
      date,
      COUNT(*) as count
    FROM raw_transactions
    WHERE "orgId" = ${orgId}::uuid
    GROUP BY description, amount, date
    HAVING COUNT(*) > 1
    LIMIT 10
  `;

  if (duplicates.length > 0) {
    anomalies.push({
      id: `data_quality_duplicates_${orgId}`,
      type: 'data_quality',
      severity: duplicates.length > 5 ? 'medium' : 'low',
      title: 'Potential duplicate transactions detected',
      description: `Found ${duplicates.length} sets of potentially duplicate transactions`,
      detectedAt: new Date(),
      recommendations: [
        'Review duplicate transactions',
        'Merge or remove duplicates if confirmed',
        'Improve duplicate detection in import process',
      ],
      confidence: 0.8,
    });
  }

  return anomalies;
}

/**
 * Detect budget variance anomalies
 */
async function detectBudgetVarianceAnomalies(orgId: string, threshold: number): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];

  // This would integrate with budget-actual service
  // For now, return empty array
  // In future, can check budget vs actual variances

  return anomalies;
}

/**
 * Use AI to detect unusual patterns
 */
async function detectAIAnomalies(
  orgId: string,
  existingAnomalies: Anomaly[],
  threshold: number
): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];

  // Get financial data
  const latestModelRun = await prisma.modelRun.findFirst({
    where: {
      orgId,
      status: 'done',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!latestModelRun?.summaryJson) {
    return anomalies;
  }

  const summary = latestModelRun.summaryJson as any;

  // Build prompt for AI anomaly detection
  const prompt = `Analyze this financial data and identify any unusual patterns or anomalies:

Revenue: ${summary.revenue || summary.mrr || 0}
Expenses: ${summary.expenses || 0}
Cash Balance: ${summary.cashBalance || 0}
Burn Rate: ${summary.burnRate || 0}
Runway: ${summary.runwayMonths || 0} months

Monthly trends: ${JSON.stringify(summary.monthly || {})}

Identify any unusual patterns, inconsistencies, or anomalies that might need attention.
Return JSON with: { anomalies: [{ type, severity, title, description, recommendations }] }`;

  try {
    const llmRequest: LLMRequest = {
      prompt,
      systemPrompt: 'You are a financial analyst expert at detecting anomalies in financial data.',
      temperature: 0.2,
      maxTokens: 1500,
    };

    const llmConfig = {
      provider: (process.env.LLM_PROVIDER as any) || 'fallback',
      apiKey: process.env.LLM_API_KEY,
      model: process.env.LLM_MODEL,
    };

    const response = await llmClient.call(llmRequest, llmConfig);
    const parsed = JSON.parse(response.content);

    if (parsed.anomalies && Array.isArray(parsed.anomalies)) {
      parsed.anomalies.forEach((anomaly: any, index: number) => {
        anomalies.push({
          id: `ai_anomaly_${orgId}_${Date.now()}_${index}`,
          type: anomaly.type || 'unusual_pattern',
          severity: anomaly.severity || 'medium',
          title: anomaly.title || 'Unusual pattern detected',
          description: anomaly.description || '',
          recommendations: anomaly.recommendations || [],
          detectedAt: new Date(),
          confidence: 0.7,
        });
      });
    }
  } catch (error) {
    // If AI fails, skip AI anomalies
    logger.warn('AI anomaly detection failed', error);
  }

  return anomalies;
}

/**
 * Store anomalies (for alerting/future use)
 */
async function storeAnomalies(
  orgId: string,
  anomalies: Anomaly[],
  userId: string
): Promise<void> {
  // For now, just log
  // In future, can store in an anomalies table and trigger alerts
  logger.info(`Detected ${anomalies.length} anomalies for org ${orgId}`, {
    orgId,
    userId,
    critical: anomalies.filter(a => a.severity === 'critical').length,
    high: anomalies.filter(a => a.severity === 'high').length,
  });
}

