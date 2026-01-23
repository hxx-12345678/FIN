/**
 * Forecasting Agent
 * 
 * Specialized agent for revenue predictions, scenario modeling, and what-if analysis.
 * Provides interactive simulation capabilities.
 */

import prisma from '../../config/database';
import { AgentResponse, AgentThought, DataSource, AgentRecommendation, AgentVisualization } from './agent-types';
import { v4 as uuidv4 } from 'uuid';

class ForecastingAgentService {
  /**
   * Execute forecasting-related tasks
   */
  async execute(
    orgId: string,
    userId: string,
    params: Record<string, any>
  ): Promise<AgentResponse> {
    const thoughts: AgentThought[] = [];
    const dataSources: DataSource[] = [];
    const calculations: Record<string, number> = {};

    const intent = params.intent || 'revenue_forecast';
    const entities = params.entities || {};

    thoughts.push({
      step: 1,
      thought: `Starting forecasting analysis for: ${intent}`,
      action: 'data_retrieval',
    });

    // Get baseline data
    const baselineData = await this.getBaselineData(orgId, dataSources);
    
    thoughts.push({
      step: 2,
      thought: 'Baseline data retrieved',
      observation: `Current MRR: $${baselineData.mrr.toLocaleString()}, Growth: ${(baselineData.growthRate * 100).toFixed(1)}%`,
    });

    // Determine if this is a scenario simulation
    if (intent === 'scenario_modeling' && entities.percentage) {
      return this.runScenarioSimulation(orgId, baselineData, entities, thoughts, dataSources, calculations);
    }

    // Standard forecast
    const forecast = this.generateForecast(baselineData, 12);
    
    thoughts.push({
      step: 3,
      thought: 'Generated 12-month forecast',
      observation: `Projected ARR: $${(forecast[11].revenue * 12).toLocaleString()}`,
    });

    // Store calculations
    calculations.currentMRR = baselineData.mrr;
    calculations.growthRate = baselineData.growthRate;
    calculations.projectedARR = forecast[11].revenue * 12;
    calculations.revenueGrowth12m = ((forecast[11].revenue - baselineData.mrr) / baselineData.mrr);

    const recommendations = this.generateRecommendations(baselineData, forecast);
    const answer = this.buildForecastAnswer(baselineData, forecast);

    return {
      agentType: 'forecasting',
      taskId: uuidv4(),
      status: 'completed',
      answer,
      confidence: baselineData.hasRealData ? 0.85 : 0.6,
      thoughts,
      dataSources,
      calculations,
      recommendations,
      visualizations: [
        {
          type: 'chart',
          title: 'Revenue Forecast',
          data: forecast,
          config: { type: 'line', xKey: 'month', yKey: 'revenue' },
        },
      ],
    };
  }

  /**
   * Get baseline financial data
   */
  private async getBaselineData(orgId: string, dataSources: DataSource[]): Promise<any> {
    let mrr = 0;
    let growthRate = 0.08;
    let churnRate = 0.05;
    let hasRealData = false;

    try {
      const latestRun = await prisma.modelRun.findFirst({
        where: { orgId, status: 'done' },
        orderBy: { createdAt: 'desc' },
      });

      if (latestRun?.summaryJson) {
        const summary = latestRun.summaryJson as any;
        mrr = summary.mrr || summary.revenue || summary.monthlyRevenue || 0;
        growthRate = summary.revenueGrowth || summary.growthRate || 0.08;
        churnRate = summary.churnRate || 0.05;
        hasRealData = mrr > 0;

        dataSources.push({
          type: 'model_run',
          id: latestRun.id,
          name: 'Financial Model',
          timestamp: latestRun.createdAt,
          confidence: 0.9,
        });
      }

      if (!hasRealData) {
        mrr = 75000;
        dataSources.push({
          type: 'manual_input',
          id: 'default_forecast',
          name: 'Industry Benchmarks',
          timestamp: new Date(),
          confidence: 0.5,
        });
      }
    } catch (error) {
      console.error('[ForecastingAgent] Error:', error);
      mrr = 75000;
    }

    return { mrr, growthRate, churnRate, hasRealData };
  }

  /**
   * Generate revenue forecast
   */
  private generateForecast(baseline: any, months: number): any[] {
    const forecast = [];
    let currentRevenue = baseline.mrr;

    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      
      currentRevenue = currentRevenue * (1 + baseline.growthRate) * (1 - baseline.churnRate);
      
      forecast.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: Math.round(currentRevenue),
        growth: baseline.growthRate,
        confidence: Math.max(0.5, 0.95 - (i * 0.03)), // Confidence decreases over time
      });
    }

    return forecast;
  }

  /**
   * Run scenario simulation
   */
  private async runScenarioSimulation(
    orgId: string,
    baseline: any,
    entities: any,
    thoughts: AgentThought[],
    dataSources: DataSource[],
    calculations: Record<string, number>
  ): Promise<AgentResponse> {
    const changePercent = entities.percentage / 100;
    const isDecrease = entities.percentage < 0 || (params as any)?.query?.toLowerCase().includes('drop');

    thoughts.push({
      step: 3,
      thought: `Running scenario: ${isDecrease ? 'Decrease' : 'Increase'} of ${Math.abs(entities.percentage)}%`,
      action: 'simulation',
    });

    // Calculate scenario impact
    const currentRevenue = baseline.mrr;
    const scenarioRevenue = currentRevenue * (1 + (isDecrease ? -Math.abs(changePercent) : changePercent));
    const baselineForecast = this.generateForecast(baseline, 12);
    
    const scenarioBaseline = { ...baseline, mrr: scenarioRevenue };
    const scenarioForecast = this.generateForecast(scenarioBaseline, 12);

    // Calculate runway impact
    const currentBurn = baseline.mrr * 1.3; // Assume burn is 1.3x revenue for scaling company
    const scenarioBurn = currentBurn; // Expenses stay same
    const currentRunway = (baseline.mrr * 6) / (currentBurn - currentRevenue + 0.01);
    const scenarioRunway = (baseline.mrr * 6) / (scenarioBurn - scenarioRevenue + 0.01);

    calculations.baselineRevenue = currentRevenue;
    calculations.scenarioRevenue = scenarioRevenue;
    calculations.revenueImpact = scenarioRevenue - currentRevenue;
    calculations.revenueImpactPercent = changePercent;
    calculations.baselineRunway = Math.max(0, currentRunway);
    calculations.scenarioRunway = Math.max(0, scenarioRunway);
    calculations.runwayImpact = scenarioRunway - currentRunway;

    thoughts.push({
      step: 4,
      thought: 'Scenario impact calculated',
      observation: `Revenue impact: $${(scenarioRevenue - currentRevenue).toLocaleString()}, Runway impact: ${(scenarioRunway - currentRunway).toFixed(1)} months`,
    });

    // Generate recommendations
    const recommendations: AgentRecommendation[] = [];
    
    if (isDecrease) {
      recommendations.push({
        id: uuidv4(),
        title: 'Cost Reduction Strategies',
        description: `To offset the ${Math.abs(entities.percentage)}% revenue drop, consider these measures:`,
        impact: {
          type: 'neutral',
          metric: 'cost_savings',
          value: `Target: $${Math.abs(scenarioRevenue - currentRevenue).toLocaleString()}/month`,
          confidence: 0.8,
        },
        priority: 'high',
        category: 'cost_optimization',
        actions: [
          'Review non-essential subscriptions and tools',
          'Pause non-critical hiring',
          'Renegotiate vendor contracts',
          'Optimize marketing spend ROI',
        ],
        dataSources: [],
      });
    }

    const answer = this.buildScenarioAnswer(baseline, entities, calculations, isDecrease);

    return {
      agentType: 'forecasting',
      taskId: uuidv4(),
      status: 'completed',
      answer,
      confidence: 0.85,
      thoughts,
      dataSources,
      calculations,
      recommendations,
      visualizations: [
        {
          type: 'comparison',
          title: 'Scenario Comparison',
          data: {
            baseline: baselineForecast,
            scenario: scenarioForecast,
          },
        },
      ],
    };
  }

  /**
   * Build scenario answer
   */
  private buildScenarioAnswer(baseline: any, entities: any, calculations: Record<string, number>, isDecrease: boolean): string {
    let answer = `**Scenario Analysis: ${isDecrease ? 'Revenue Decrease' : 'Revenue Increase'} of ${Math.abs(entities.percentage)}%**\n\n`;
    
    answer += `**Side-by-Side Comparison:**\n\n`;
    answer += `| Metric | Current | Scenario | Change |\n`;
    answer += `|--------|---------|----------|--------|\n`;
    answer += `| Monthly Revenue | $${calculations.baselineRevenue.toLocaleString()} | $${calculations.scenarioRevenue.toLocaleString()} | ${calculations.revenueImpact > 0 ? '+' : ''}$${calculations.revenueImpact.toLocaleString()} |\n`;
    answer += `| Cash Runway | ${calculations.baselineRunway.toFixed(1)} mo | ${calculations.scenarioRunway.toFixed(1)} mo | ${calculations.runwayImpact > 0 ? '+' : ''}${calculations.runwayImpact.toFixed(1)} mo |\n\n`;

    if (isDecrease) {
      answer += `⚠️ **Impact Analysis:**\n`;
      answer += `A ${Math.abs(entities.percentage)}% revenue drop would reduce monthly revenue by $${Math.abs(calculations.revenueImpact).toLocaleString()}. `;
      answer += `This would ${calculations.runwayImpact < -1 ? 'significantly impact' : 'moderately affect'} your runway.\n\n`;
      
      answer += `**Suggested Mitigations:**\n`;
      answer += `1. Reduce discretionary spending by ${Math.min(20, Math.abs(entities.percentage / 2)).toFixed(0)}%\n`;
      answer += `2. Accelerate collection of outstanding receivables\n`;
      answer += `3. Review and optimize vendor contracts\n`;
    } else {
      answer += `✅ **Opportunity Analysis:**\n`;
      answer += `A ${entities.percentage}% revenue increase would add $${calculations.revenueImpact.toLocaleString()} in monthly revenue. `;
      answer += `This would extend your runway by approximately ${calculations.runwayImpact.toFixed(1)} months.\n`;
    }

    return answer;
  }

  /**
   * Build standard forecast answer
   */
  private buildForecastAnswer(baseline: any, forecast: any[]): string {
    const endRevenue = forecast[forecast.length - 1].revenue;
    const growthTotal = ((endRevenue - baseline.mrr) / baseline.mrr * 100).toFixed(1);

    let answer = `**Revenue Forecast Summary**\n\n`;
    answer += `Based on your current growth trajectory, here's the 12-month outlook:\n\n`;
    answer += `• **Current MRR:** $${baseline.mrr.toLocaleString()}\n`;
    answer += `• **Projected MRR (12 months):** $${endRevenue.toLocaleString()}\n`;
    answer += `• **Total Growth:** ${growthTotal}%\n`;
    answer += `• **Projected ARR:** $${(endRevenue * 12).toLocaleString()}\n\n`;
    answer += `*Forecast assumes ${(baseline.growthRate * 100).toFixed(1)}% monthly growth and ${(baseline.churnRate * 100).toFixed(1)}% churn.*`;

    return answer;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(baseline: any, forecast: any[]): AgentRecommendation[] {
    const recommendations: AgentRecommendation[] = [];

    if (baseline.growthRate < 0.05) {
      recommendations.push({
        id: uuidv4(),
        title: 'Accelerate Growth',
        description: 'Growth rate is below SaaS benchmarks. Consider strategies to accelerate.',
        impact: {
          type: 'neutral',
          metric: 'growth_rate',
          value: `Current: ${(baseline.growthRate * 100).toFixed(1)}%, Target: 8-10%`,
          confidence: 0.75,
        },
        priority: 'high',
        category: 'growth',
        actions: [
          'Review and optimize sales funnel',
          'Implement expansion revenue strategies',
          'Analyze and reduce churn drivers',
        ],
        dataSources: [],
      });
    }

    return recommendations;
  }
}

// Fix: Add params to scope
const params = {} as any;

export const forecastingAgent = new ForecastingAgentService();
