/**
 * AI SUMMARIES SERVICE
 * Auto-generates executive summaries of financial reports
 * Similar to Abacum's AI Summaries feature
 */

import { llmClient, LLMRequest } from './llm/llm-client.service';
import prisma from '../config/database';
import { logger } from '../utils/logger';

export interface SummaryRequest {
  reportType: 'pl' | 'cashflow' | 'balance_sheet' | 'budget_actual' | 'overview';
  orgId: string;
  modelId?: string;
  period?: string;
  includeMetrics?: boolean;
}

export interface FinancialSummary {
  executiveSummary: string;
  keyHighlights: string[];
  risks: string[];
  opportunities: string[];
  recommendations: string[];
  metrics?: {
    revenue?: number;
    expenses?: number;
    netIncome?: number;
    cashBalance?: number;
    burnRate?: number;
    runwayMonths?: number;
  };
  generatedAt: Date;
  confidence: number;
}

export const aiSummariesService = {
  /**
   * Generate AI summary for a financial report
   */
  generateSummary: async (
    request: SummaryRequest,
    userId: string
  ): Promise<FinancialSummary> => {
    try {
      // Fetch financial data based on report type
      const financialData = await fetchFinancialData(request);

      // Build prompt for LLM
      const prompt = buildSummaryPrompt(request.reportType, financialData);

      // Call LLM to generate summary
      const llmRequest: LLMRequest = {
        prompt,
        systemPrompt: `You are a CFO assistant expert at creating executive summaries of financial reports. 
        Provide clear, actionable insights in a professional tone. Focus on:
        1. Key financial highlights
        2. Risks and concerns
        3. Opportunities
        4. Actionable recommendations
        
        Format your response as JSON with: executiveSummary, keyHighlights (array), risks (array), opportunities (array), recommendations (array).`,
        temperature: 0.3,
        maxTokens: 2000,
      };

      const llmConfig = {
        provider: (process.env.LLM_PROVIDER as any) || 'fallback',
        apiKey: process.env.LLM_API_KEY,
        model: process.env.LLM_MODEL,
      };

      let summary: FinancialSummary;
      
      try {
        const response = await llmClient.call(llmRequest, llmConfig);
        const parsed = JSON.parse(response.content);
        
        summary = {
          executiveSummary: parsed.executiveSummary || 'No summary available',
          keyHighlights: parsed.keyHighlights || [],
          risks: parsed.risks || [],
          opportunities: parsed.opportunities || [],
          recommendations: parsed.recommendations || [],
          metrics: financialData.metrics,
          generatedAt: new Date(),
          confidence: 0.9,
        };
      } catch (error) {
        // Fallback to deterministic summary if LLM fails
        logger.warn('LLM summary generation failed, using fallback', error);
        summary = generateFallbackSummary(request.reportType, financialData);
      }

      // Store summary in database (optional - for caching)
      await storeSummary(request.orgId, request.reportType, summary, userId);

      return summary;
    } catch (error: any) {
      logger.error('Error generating AI summary', error);
      throw new Error(`Failed to generate summary: ${error.message}`);
    }
  },

  /**
   * Get cached summary if available
   */
  getCachedSummary: async (
    orgId: string,
    reportType: string,
    period?: string
  ): Promise<FinancialSummary | null> => {
    // For now, always generate fresh summaries
    // In future, can cache in database
    return null;
  },
};

/**
 * Fetch financial data based on report type
 */
async function fetchFinancialData(request: SummaryRequest): Promise<any> {
  const { orgId, modelId, reportType } = request;

  // Get latest model run
  const latestModelRun = await prisma.modelRun.findFirst({
    where: {
      orgId,
      ...(modelId ? { modelId } : {}),
      status: 'done',
    },
    orderBy: { createdAt: 'desc' },
    include: { model: true },
  });

  if (!latestModelRun?.summaryJson) {
    return {
      metrics: {},
      monthlyData: [],
      hasData: false,
    };
  }

  const summary = latestModelRun.summaryJson as any;

  // Extract metrics based on report type
  const metrics: any = {};

  if (reportType === 'pl' || reportType === 'overview') {
    metrics.revenue = Number(summary.revenue || summary.mrr || 0);
    metrics.expenses = Number(summary.expenses || 0);
    metrics.netIncome = Number(summary.netIncome || (metrics.revenue - metrics.expenses));
    metrics.grossMargin = Number(summary.grossMargin || 0);
  }

  if (reportType === 'cashflow' || reportType === 'overview') {
    metrics.cashBalance = Number(summary.cashBalance || 0);
    metrics.burnRate = Number(summary.burnRate || 0);
    metrics.runwayMonths = Number(summary.runwayMonths || 0);
    metrics.cashFlow = Number(summary.cashFlow || 0);
  }

  if (reportType === 'balance_sheet') {
    metrics.assets = Number(summary.assets || 0);
    metrics.liabilities = Number(summary.liabilities || 0);
    metrics.equity = Number(summary.equity || 0);
  }

  // Extract monthly data for trend analysis
  const monthlyData: any[] = [];
  if (summary.monthly) {
    Object.keys(summary.monthly).sort().forEach((monthKey) => {
      const monthData = summary.monthly[monthKey];
      monthlyData.push({
        month: monthKey,
        revenue: Number(monthData.revenue || monthData.mrr || 0),
        expenses: Number(monthData.expenses || 0),
        netIncome: Number(monthData.netIncome || 0),
      });
    });
  }

  return {
    metrics,
    monthlyData,
    hasData: true,
    modelRun: latestModelRun,
  };
}

/**
 * Build prompt for LLM based on report type
 */
function buildSummaryPrompt(reportType: string, financialData: any): string {
  const { metrics, monthlyData, hasData } = financialData;

  if (!hasData) {
    return 'Generate an executive summary for a financial report with no data available. Explain that data needs to be imported or a model needs to be run.';
  }

  let prompt = `Generate an executive summary for a ${reportType} financial report.\n\n`;

  // Add metrics context
  if (metrics.revenue !== undefined) {
    prompt += `Revenue: $${metrics.revenue.toLocaleString()}\n`;
  }
  if (metrics.expenses !== undefined) {
    prompt += `Expenses: $${metrics.expenses.toLocaleString()}\n`;
  }
  if (metrics.netIncome !== undefined) {
    prompt += `Net Income: $${metrics.netIncome.toLocaleString()}\n`;
  }
  if (metrics.cashBalance !== undefined) {
    prompt += `Cash Balance: $${metrics.cashBalance.toLocaleString()}\n`;
  }
  if (metrics.burnRate !== undefined) {
    prompt += `Burn Rate: $${metrics.burnRate.toLocaleString()}/month\n`;
  }
  if (metrics.runwayMonths !== undefined) {
    prompt += `Runway: ${metrics.runwayMonths.toFixed(1)} months\n`;
  }

  // Add trend analysis if monthly data available
  if (monthlyData.length > 0) {
    prompt += `\nMonthly Trends (last ${monthlyData.length} months):\n`;
    monthlyData.slice(-6).forEach((month) => {
      prompt += `${month.month}: Revenue $${month.revenue.toLocaleString()}, Expenses $${month.expenses.toLocaleString()}, Net $${month.netIncome.toLocaleString()}\n`;
    });
  }

  prompt += `\nProvide a comprehensive executive summary with key highlights, risks, opportunities, and recommendations.`;

  return prompt;
}

/**
 * Generate fallback summary if LLM fails
 */
function generateFallbackSummary(reportType: string, financialData: any): FinancialSummary {
  const { metrics, hasData } = financialData;

  if (!hasData) {
    return {
      executiveSummary: 'No financial data available. Please import data or run a financial model to generate a summary.',
      keyHighlights: [],
      risks: ['No data available for analysis'],
      opportunities: ['Import financial data to enable analysis'],
      recommendations: ['Import transaction data or run a financial model'],
      generatedAt: new Date(),
      confidence: 0.5,
    };
  }

  const highlights: string[] = [];
  const risks: string[] = [];
  const opportunities: string[] = [];
  const recommendations: string[] = [];

  // Generate highlights
  if (metrics.revenue) {
    highlights.push(`Revenue: $${metrics.revenue.toLocaleString()}`);
  }
  if (metrics.netIncome && metrics.netIncome > 0) {
    highlights.push(`Profitable with net income of $${metrics.netIncome.toLocaleString()}`);
  }
  if (metrics.runwayMonths) {
    highlights.push(`Cash runway: ${metrics.runwayMonths.toFixed(1)} months`);
  }

  // Generate risks
  if (metrics.runwayMonths && metrics.runwayMonths < 6) {
    risks.push(`Low cash runway (${metrics.runwayMonths.toFixed(1)} months) - consider fundraising or cost reduction`);
  }
  if (metrics.burnRate && metrics.burnRate > metrics.revenue * 0.5) {
    risks.push(`High burn rate relative to revenue - monitor expenses closely`);
  }
  if (metrics.netIncome && metrics.netIncome < 0) {
    risks.push(`Negative net income - focus on revenue growth or cost optimization`);
  }

  // Generate opportunities
  if (metrics.revenue && metrics.revenue > 0) {
    opportunities.push('Revenue growth potential');
  }
  if (metrics.grossMargin && metrics.grossMargin > 0.7) {
    opportunities.push('Strong gross margins indicate scalability');
  }

  // Generate recommendations
  if (metrics.runwayMonths && metrics.runwayMonths < 12) {
    recommendations.push('Consider fundraising to extend runway');
  }
  if (metrics.burnRate) {
    recommendations.push('Review and optimize operating expenses');
  }
  recommendations.push('Continue monitoring key financial metrics');

  return {
    executiveSummary: `Financial summary for ${reportType} report. ${highlights.join('. ')}.`,
    keyHighlights: highlights,
    risks,
    opportunities,
    recommendations,
    metrics,
    generatedAt: new Date(),
    confidence: 0.7,
  };
}

/**
 * Store summary in database (for caching/future use)
 */
async function storeSummary(
  orgId: string,
  reportType: string,
  summary: FinancialSummary,
  userId: string
): Promise<void> {
  // For now, just log
  // In future, can store in a summaries table
  logger.info(`Generated summary for ${reportType} report`, {
    orgId,
    reportType,
    userId,
    confidence: summary.confidence,
  });
}

