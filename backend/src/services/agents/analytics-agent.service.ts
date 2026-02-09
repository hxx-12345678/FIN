/**
 * Analytics Agent
 * 
 * Specialized agent for drill-down analysis, variance explanation, and EBITDA analysis.
 * Uses NLP to synthesize data and explain financial variances in plain English.
 */

import prisma from '../../config/database';
import { AgentResponse, AgentThought, DataSource, AgentRecommendation } from './agent-types';
import { v4 as uuidv4 } from 'uuid';
import { reasoningService } from '../reasoning.service';

class AnalyticsAgentService {
  /**
   * Execute analytics-related tasks
   */
  async execute(
    orgId: string,
    userId: string,
    params: Record<string, any>
  ): Promise<AgentResponse> {
    const thoughts: AgentThought[] = [];
    const dataSources: DataSource[] = [];
    const calculations: Record<string, number> = {};

    const intent = params.intent || 'variance_analysis';
    const query = params.query || '';

    thoughts.push({
      step: 1,
      thought: `Starting analytics deep-dive for: ${intent}`,
      action: 'data_retrieval',
    });

    // Get financial data for analysis
    const financialData = await this.getFinancialData(orgId, dataSources);

    thoughts.push({
      step: 2,
      thought: 'Financial data retrieved',
      observation: `Revenue: $${financialData.revenue.toLocaleString()}, Expenses: $${financialData.expenses.toLocaleString()}`,
    });

    // Perform analysis based on intent
    let analysisResult;

    if (intent === 'variance_analysis' || query.toLowerCase().includes('miss') || query.toLowerCase().includes('why')) {
      analysisResult = await this.performVarianceAnalysis(orgId, financialData, thoughts, dataSources, calculations);
    } else if (intent === 'driver_analysis' || query.toLowerCase().includes('drive') || query.toLowerCase().includes('cause')) {
      analysisResult = await this.performDriverAnalysis(financialData, query, thoughts, dataSources, calculations);
    } else {
      analysisResult = await this.performGeneralAnalysis(financialData, thoughts, calculations);
    }

    thoughts.push({
      step: 4,
      thought: 'Analysis complete',
      observation: `Identified ${analysisResult.factors.length} contributing factors`,
    });

    const recommendations = this.generateRecommendations(analysisResult);
    const answer = this.buildAnswer(intent, analysisResult, financialData);

    return {
      agentType: 'analytics',
      taskId: uuidv4(),
      status: 'completed',
      answer,
      confidence: financialData.hasRealData ? 0.85 : 0.65,
      thoughts,
      dataSources,
      calculations,
      recommendations,
      visualizations: [
        {
          type: 'table',
          title: 'Variance Breakdown',
          data: analysisResult.factors,
        },
      ],
    };
  }

  /**
   * Get financial data
   */
  private async getFinancialData(orgId: string, dataSources: DataSource[]): Promise<any> {
    let revenue = 0;
    let expenses = 0;
    let cogs = 0;
    let ebitda = 0;
    let forecastRevenue = 0;
    let forecastExpenses = 0;
    let hasRealData = false;

    let latestRun: any = null;

    try {
      latestRun = await prisma.modelRun.findFirst({
        where: { orgId, status: 'done' },
        orderBy: { createdAt: 'desc' },
      });

      if (latestRun?.summaryJson) {
        const summary = latestRun.summaryJson as any;
        revenue = summary.revenue || summary.mrr || 0;
        expenses = summary.expenses || summary.opex || 0;
        cogs = summary.cogs || revenue * 0.2;
        ebitda = revenue - cogs - expenses;
        forecastRevenue = summary.forecastRevenue || revenue * 1.1;
        forecastExpenses = summary.forecastExpenses || expenses;
        hasRealData = revenue > 0;

        dataSources.push({
          type: 'model_run',
          id: latestRun.id,
          name: 'Financial Model',
          timestamp: latestRun.createdAt,
          confidence: 0.9,
        });
      }

      // Get budget data for comparison
      const budgets = await prisma.budget.findMany({
        where: { orgId },
        orderBy: { month: 'desc' },
        take: 3,
      });

      if (budgets.length > 0) {
        const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
        if (!forecastExpenses && totalBudget > 0) {
          forecastExpenses = totalBudget / budgets.length;
        }
        dataSources.push({
          type: 'budget',
          id: 'budget_comparison',
          name: 'Budget Data',
          timestamp: new Date(),
          confidence: 0.85,
        });
      }

      if (!hasRealData) {
        revenue = 85000;
        expenses = 70000;
        cogs = 17000;
        ebitda = revenue - cogs - expenses;
        forecastRevenue = 95000;
        forecastExpenses = 65000;

        dataSources.push({
          type: 'manual_input',
          id: 'benchmark_data',
          name: 'Industry Benchmarks',
          timestamp: new Date(),
          confidence: 0.5,
        });
      }
    } catch (error) {
      console.error('[AnalyticsAgent] Error:', error);
    }

    return {
      revenue,
      expenses,
      cogs,
      ebitda,
      forecastRevenue,
      forecastExpenses,
      grossMargin: (revenue - cogs) / revenue,
      hasRealData,
      modelId: (latestRun as any)?.modelId
    };
  }

  /**
   * Perform variance analysis (e.g., "Why did EBITDA miss forecast?")
   */
  private async performVarianceAnalysis(
    orgId: string,
    data: any,
    thoughts: AgentThought[],
    dataSources: DataSource[],
    calculations: Record<string, number>
  ): Promise<any> {
    thoughts.push({
      step: 3,
      thought: 'Performing variance analysis - comparing actuals to forecast',
      action: 'variance_calculation',
    });

    const revenueVariance = data.revenue - data.forecastRevenue;
    const revenueVariancePct = (revenueVariance / data.forecastRevenue) * 100;

    const expenseVariance = data.expenses - data.forecastExpenses;
    const expenseVariancePct = (expenseVariance / data.forecastExpenses) * 100;

    const expectedEbitda = data.forecastRevenue - (data.forecastRevenue * 0.2) - data.forecastExpenses;
    const ebitdaVariance = data.ebitda - expectedEbitda;
    const ebitdaVariancePct = (ebitdaVariance / expectedEbitda) * 100;

    calculations.actualRevenue = data.revenue;
    calculations.forecastRevenue = data.forecastRevenue;
    calculations.revenueVariance = revenueVariance;
    calculations.revenueVariancePct = revenueVariancePct;
    calculations.actualExpenses = data.expenses;
    calculations.forecastExpenses = data.forecastExpenses;
    calculations.expenseVariance = expenseVariance;
    calculations.expenseVariancePct = expenseVariancePct;
    calculations.actualEbitda = data.ebitda;
    calculations.expectedEbitda = expectedEbitda;
    calculations.ebitdaVariance = ebitdaVariance;

    // Identify contributing factors
    const factors = [];

    if (revenueVariance < 0) {
      factors.push({
        category: 'Revenue Shortfall',
        impact: revenueVariance,
        impactPct: revenueVariancePct,
        explanation: `Revenue came in ${Math.abs(revenueVariancePct).toFixed(1)}% below forecast ($${Math.abs(revenueVariance).toLocaleString()} shortfall)`,
        drivers: [
          'Lower than expected customer acquisition',
          'Higher churn than projected',
          'Delayed deal closures',
        ],
      });
    }

    if (expenseVariance > 0) {
      factors.push({
        category: 'Expense Overrun',
        impact: expenseVariance,
        impactPct: expenseVariancePct,
        explanation: `Expenses exceeded forecast by ${expenseVariancePct.toFixed(1)}% ($${expenseVariance.toLocaleString()} over)`,
        drivers: [
          'Increased operational costs',
          'Unplanned hiring or contractor expenses',
          'Infrastructure scaling costs',
        ],
      });
    }

    if (data.cogs / data.revenue > 0.25) {
      factors.push({
        category: 'COGS Pressure',
        impact: (data.cogs / data.revenue - 0.2) * data.revenue,
        impactPct: ((data.cogs / data.revenue - 0.2) / 0.2) * 100,
        explanation: `COGS at ${(data.cogs / data.revenue * 100).toFixed(1)}% of revenue is above the 20% benchmark`,
        drivers: [
          'Supplier price increases',
          'Higher delivery/hosting costs',
          'Product mix shift toward lower-margin items',
        ],
      });
    }

    // Add data source for calculations
    dataSources.push({
      type: 'calculation',
      id: 'variance_analysis',
      name: 'Variance Analysis',
      timestamp: new Date(),
      confidence: 0.9,
      snippet: `EBITDA variance: ${ebitdaVariancePct.toFixed(1)}%`,
    });

    return {
      type: 'variance',
      summary: `EBITDA ${ebitdaVariance < 0 ? 'missed' : 'exceeded'} forecast by ${Math.abs(ebitdaVariancePct).toFixed(1)}%`,
      factors,
      totalVariance: ebitdaVariance,
    };
  }


  /**
   * Perform driver analysis using Reasoning Engine
   */
  private async performDriverAnalysis(
    data: any,
    query: string,
    thoughts: AgentThought[],
    dataSources: DataSource[],
    calculations: Record<string, number>
  ): Promise<any> {
    thoughts.push({
      step: 3,
      thought: 'Identifying key drivers using logic engine...',
      action: 'driver_analysis',
    });

    const targetMetric = query.toLowerCase().includes('burn') ? 'monthly_burn_rate' :
      query.toLowerCase().includes('runway') ? 'cash_runway' :
        query.toLowerCase().includes('revenue') ? 'revenue' : 'net_income';

    let drivers: any[] = [];

    if (data.modelId) {
      try {
        // Use "increase" to see positive correlation drivers
        const reasoning = await reasoningService.analyzeMetric(data.modelId, targetMetric, 'increase');
        drivers = reasoning.analysis || [];

        thoughts.push({
          step: 3.5,
          thought: `Reasoning engine identified top drivers for ${targetMetric}`,
          observation: `Top driver: ${drivers[0]?.driver} (Impact: ${drivers[0]?.estimated_impact})`
        });

        // Add reasoning explanation
        dataSources.push({
          type: 'reasoning_engine',
          id: 'driver_analysis',
          name: 'Causal Driver Analysis',
          timestamp: new Date(),
          confidence: 0.9,
          snippet: `Top drivers for ${targetMetric}: ${drivers.map((d: any) => d.driver).join(', ')}`
        });

      } catch (e) {
        console.warn('Driver analysis failed', e);
      }
    }

    if (drivers.length === 0) {
      // Fallback
      drivers = [
        { driver: 'Headcount', reasoning: 'Primary expense driver', estimated_impact: 'High' },
        { driver: 'Server Costs', reasoning: 'Scales with usage', estimated_impact: 'Medium' }
      ];
    }

    return {
      type: 'driver_analysis',
      target: targetMetric,
      summary: `Key drivers for **${targetMetric.replace(/_/g, ' ')}** identified.`,
      factors: drivers.map((d: any) => ({
        category: d.driver,
        explanation: d.reasoning,
        drivers: [d.action === 'increase' ? 'Positive Correlation' : 'Negative Correlation', d.estimated_impact],
        impact: 0, // Qualitative
        impactPct: 0
      }))
    };
  }

  /**
   * Perform general financial analysis
   */
  private async performGeneralAnalysis(
    data: any,
    thoughts: AgentThought[],
    calculations: Record<string, number>
  ): Promise<any> {
    thoughts.push({
      step: 3,
      thought: 'Performing general financial health analysis',
      action: 'health_check',
    });

    calculations.revenue = data.revenue;
    calculations.expenses = data.expenses;
    calculations.ebitda = data.ebitda;
    calculations.grossMargin = data.grossMargin;
    calculations.operatingMargin = data.ebitda / data.revenue;

    const factors = [];

    // Analyze gross margin
    if (data.grossMargin < 0.7) {
      factors.push({
        category: 'Gross Margin',
        impact: (0.7 - data.grossMargin) * data.revenue,
        impactPct: (0.7 - data.grossMargin) * 100,
        explanation: `Gross margin at ${(data.grossMargin * 100).toFixed(1)}% is below SaaS benchmark of 70%`,
        drivers: ['High COGS relative to revenue', 'Pricing optimization opportunity'],
      });
    }

    // Analyze operating efficiency
    const opexRatio = data.expenses / data.revenue;
    if (opexRatio > 0.8) {
      factors.push({
        category: 'Operating Efficiency',
        impact: (opexRatio - 0.8) * data.revenue,
        impactPct: (opexRatio - 0.8) * 100,
        explanation: `Operating expenses at ${(opexRatio * 100).toFixed(1)}% of revenue indicate room for efficiency gains`,
        drivers: ['High overhead costs', 'Scaling investments', 'Team size optimization'],
      });
    }

    return {
      type: 'health_check',
      summary: `Overall financial health: ${data.ebitda > 0 ? 'Positive' : 'Negative'} EBITDA of $${data.ebitda.toLocaleString()}`,
      factors,
      totalVariance: data.ebitda,
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(analysis: any): AgentRecommendation[] {
    const recommendations: AgentRecommendation[] = [];

    for (const factor of analysis.factors) {
      recommendations.push({
        id: uuidv4(),
        title: `Address ${factor.category}`,
        description: factor.explanation,
        impact: {
          type: factor.impact < 0 ? 'negative' : 'neutral',
          metric: factor.category.toLowerCase().replace(' ', '_'),
          value: `$${Math.abs(factor.impact).toLocaleString()} (${Math.abs(factor.impactPct).toFixed(1)}%)`,
          confidence: 0.8,
        },
        priority: Math.abs(factor.impactPct) > 10 ? 'high' : 'medium',
        category: 'financial_performance',
        actions: factor.drivers,
        dataSources: [],
      });
    }

    return recommendations;
  }

  /**
   * Build natural language answer
   */
  private buildAnswer(intent: string, analysis: any, data: any): string {
    let answer = '';

    if (intent === 'variance_analysis' || analysis.type === 'variance') {
      answer += `**Variance Analysis Summary**\n\n`;
      answer += `${analysis.summary}\n\n`;

      answer += `**Contributing Factors:**\n\n`;
      for (const factor of analysis.factors) {
        answer += `📊 **${factor.category}:** ${factor.explanation}\n`;
        answer += `   *Potential drivers:*\n`;
        for (const driver of factor.drivers) {
          answer += `   • ${driver}\n`;
        }
        answer += '\n';
      }

      answer += `**Key Metrics:**\n`;
      answer += `• Actual Revenue: $${data.revenue.toLocaleString()} vs Forecast: $${data.forecastRevenue.toLocaleString()}\n`;
      answer += `• Actual Expenses: $${data.expenses.toLocaleString()} vs Forecast: $${data.forecastExpenses.toLocaleString()}\n`;
      answer += `• EBITDA: $${data.ebitda.toLocaleString()}\n`;
    } else {
      answer += `**Financial Health Analysis**\n\n`;
      answer += `${analysis.summary}\n\n`;

      if (analysis.factors.length > 0) {
        answer += `**Areas for Improvement:**\n\n`;
        for (const factor of analysis.factors) {
          answer += `• **${factor.category}:** ${factor.explanation}\n`;
        }
      } else {
        answer += `✅ No critical issues identified. Financial metrics are within healthy ranges.`;
      }
    }

    return answer;
  }
}

export const analyticsAgent = new AnalyticsAgentService();
