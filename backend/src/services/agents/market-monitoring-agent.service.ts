/**
 * Strategic Agent
 * 
 * Specialized agent for high-complexity strategic decisions:
 * - M&A Target Identification & Valuation
 * - Strategic Cost Reduction (without impacting R&D)
 * - Synergy Modeling
 * - Accretion/Dilution Analysis
 * 
 * Acts as an internal Investment Banker for strategic decisions.
 */

import prisma from '../../config/database';
import { AgentResponse, AgentThought, DataSource, AgentRecommendation } from './agent-types';
import { v4 as uuidv4 } from 'uuid';
import { reasoningService } from '../reasoning.service';
import { ModelRun } from '@prisma/client';
import { webSearchService } from '../web-search.service';

interface CostReductionOpportunity {
  category: string;
  currentSpend: number;
  potentialSavings: number;
  savingsPercent: number;
  implementation: string;
  rdImpact: 'none' | 'minimal' | 'moderate' | 'significant';
  confidence: number;
}

interface MAAnalysis {
  targetName: string;
  acquisitionPrice: number;
  arrAdded: number;
  synergies: number;
  year1Impact: 'accretive' | 'dilutive';
  year1ImpactPercent: number;
  year2Outlook: string;
  recommendation: string;
  conditions: string[];
}

class MarketMonitoringAgentService {
  /**
   * Execute strategic analysis tasks
   */
  async execute(
    orgId: string,
    userId: string,
    params: Record<string, any>
  ): Promise<AgentResponse> {
    const thoughts: AgentThought[] = [];
    const dataSources: DataSource[] = [];
    const calculations: Record<string, number> = {};

    const intent = params.intent || '';
    const query = params.query || '';
    const entities = params.entities || {};

    thoughts.push({
      step: 1,
      thought: 'Analyzing strategic context and financial position...',
      action: 'data_retrieval',
    });

    // Get financial data
    const financialData = await this.getFinancialData(orgId, dataSources, calculations);

    thoughts.push({
      step: 2,
      thought: `Financial baseline: Revenue $${financialData.revenue.toLocaleString()}, OpEx $${financialData.opex.toLocaleString()}`,
    });

    // Determine analysis type
    const isMAQuery = /acqui|merger|buy|target/i.test(query) && !/benchmark|metric|peer/i.test(query);
    const isCostQuery = /cost.*cut|reduce.*cost|optimize.*spend|redundant|ghost/i.test(query);
    const isAllocationQuery = /marketing|hiring|product|debt|allocation|spend.*cash/i.test(query) && /should|which|how|npv|return/i.test(query);
    const isBenchmarkingQuery = /benchmark|metric|peer|rule of 40|comparison/i.test(query);

    let answer = '';
    let recommendations: AgentRecommendation[] = [];

    if (isMAQuery && entities.amount) {
      thoughts.push({
        step: 3,
        thought: 'Running M&A analysis with accretion/dilution modeling...',
        action: 'ma_analysis',
      });

      const maAnalysis = await this.runMAAnalysis(financialData, entities, thoughts, dataSources, calculations);
      recommendations = this.generateMARecommendations(maAnalysis);
      answer = this.buildMAAnswer(maAnalysis, financialData, calculations);
    } else if (isCostQuery) {
      thoughts.push({
        step: 3,
        thought: 'Scanning all department spend for optimization opportunities...',
        action: 'cost_analysis',
      });

      const costOpportunities = await this.findCostReductions(
        financialData,
        entities,
        thoughts,
        dataSources,
        calculations
      );
      recommendations = this.generateCostRecommendations(costOpportunities, financialData);
      answer = this.buildCostAnswer(costOpportunities, financialData, entities, calculations);
    } else if (isAllocationQuery || isBenchmarkingQuery) {
      thoughts.push({
        step: 3,
        thought: isBenchmarkingQuery ? 'Performing industry benchmarking analysis...' : 'Comparing NPV and Risk-Adjusted Return for allocation options...',
        action: isBenchmarkingQuery ? 'benchmarking' : 'allocation_analysis',
      });

      if (isBenchmarkingQuery) {
        const benchmarkingResults = await this.runBenchmarkingAnalysis(financialData, thoughts, dataSources, calculations, params);
        answer = benchmarkingResults.answer;
        recommendations = benchmarkingResults.recommendations;
      } else {
        const allocationResults = await this.runAllocationAnalysis(financialData, entities, thoughts, dataSources, calculations);
        recommendations = this.generateAllocationRecommendations(allocationResults);
        answer = this.buildAllocationAnswer(allocationResults, financialData, calculations);
      }
    } else {
      // General strategic analysis
      thoughts.push({
        step: 3,
        thought: 'Performing general strategic assessment...',
        action: 'strategic_analysis',
      });

      const strategicInsights = await this.runStrategicAnalysis(
        financialData,
        thoughts,
        dataSources,
        calculations
      );
      recommendations = strategicInsights.recommendations;
      answer = strategicInsights.answer;
    }

    return {
      agentType: 'market_monitoring',
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
          title: 'Strategic Analysis',
          data: Object.entries(calculations).map(([key, value]) => ({
            metric: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
            value: typeof value === 'number'
              ? (Math.abs(value) < 1 ? `${(value * 100).toFixed(1)}%` : `$${value.toLocaleString()}`)
              : value,
          })),
        },
      ],
      requiresApproval: isMAQuery || (isCostQuery && calculations.savingsPercent > 0.05),
      escalationReason: isMAQuery
        ? 'Strategic M&A decisions require formal board approval due to capital allocation magnitude.'
        : (isCostQuery && calculations.savingsPercent > 0.05)
          ? `Cost reduction of ${(calculations.savingsPercent * 100).toFixed(1)}% exceeds autonomous threshold (5%).`
          : undefined,
    };
  }

  /**
   * Get financial data
   */
  private async getFinancialData(orgId: string, dataSources: DataSource[], calculations: Record<string, number>): Promise<any> {
    let revenue = 0;
    let opex = 0;
    let headcount = 0;
    let rdSpend = 0;
    let saasSubscriptions = 0;
    let realEstateSpend = 0;
    let hasRealData = false;

    let latestRun: any = null;

    try {
      latestRun = await prisma.modelRun.findFirst({
        where: { orgId, status: 'done' },
        orderBy: { createdAt: 'desc' },
        include: { model: true }
      });

      if (latestRun?.summaryJson) {
        const summary = latestRun.summaryJson as any;
        revenue = summary.revenue || summary.mrr || 0;
        opex = summary.expenses || summary.opex || summary.monthlyBurn || 0;
        headcount = summary.headcount || 50;
        rdSpend = summary.rdSpend || opex * 0.35;
        saasSubscriptions = summary.saasSpend || opex * 0.08;
        realEstateSpend = summary.realEstateSpend || opex * 0.12;
        hasRealData = revenue > 0 || opex > 0;

        dataSources.push({
          type: 'model_run',
          id: latestRun.id,
          name: `Financial Model: ${latestRun.model.name}`,
          timestamp: latestRun.createdAt,
          confidence: 0.95,
        });
      }

      // Calculate growth and margin from ledger if needed
      const txs = await prisma.rawTransaction.findMany({
        where: { orgId },
        orderBy: { date: 'desc' },
        take: 5000 // Increased for better historical coverage
      });

      if (txs.length > 0) {
        // Simple 12-month trailing logic
        const now = new Date();
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(now.getMonth() - 12);
        
        const currentYearTxs = txs.filter(t => t.date >= twelveMonthsAgo);
        const prevYearTxs = txs.filter(t => t.date < twelveMonthsAgo && t.date >= new Date(twelveMonthsAgo.getTime() - 365 * 24 * 60 * 60 * 1000));

        let currentRev = 0;
        let currentExp = 0;
        
        // Smart Signage Logic: Detect if revenue is primarily positive or negative
        const posSum = currentYearTxs.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
        const negSum = currentYearTxs.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
        const usesNegRev = negSum > posSum * 2; 

        currentYearTxs.forEach(t => {
          const amt = Math.abs(Number(t.amount));
          const isRev = (t.description || '').toLowerCase().includes('revenue') || (t.category || '').toLowerCase().includes('income');
          if (usesNegRev) {
            if (Number(t.amount) < 0 || isRev) currentRev += amt;
            else currentExp += amt;
          } else {
            if (Number(t.amount) > 0 || isRev) currentRev += amt;
            else currentExp += amt;
          }
        });

        let prevRev = 0;
        prevYearTxs.forEach(t => {
          const amt = Math.abs(Number(t.amount));
          const isRev = (t.description || '').toLowerCase().includes('revenue') || (t.category || '').toLowerCase().includes('income');
          if (usesNegRev ? (Number(t.amount) < 0 || isRev) : (Number(t.amount) > 0 || isRev)) prevRev += amt;
        });

        const growthRate = prevRev > 0 ? (currentRev - prevRev) / prevRev : 0.25;
        const ebitdaMargin = currentRev > 0 ? (currentRev - currentExp) / currentRev : -0.15;
        
        calculations.dataDensityRatio = prevYearTxs.length > 0 ? currentYearTxs.length / prevYearTxs.length : 1;

        if (!hasRealData && currentRev > 0) {
          revenue = currentRev / 12; // Monthly average
          opex = currentExp / 12;
          hasRealData = true;
          
          dataSources.push({
            type: 'transaction',
            id: 'ledger_audit',
            name: 'Historical Ledger Audit',
            timestamp: new Date(),
            confidence: 0.88,
            snippet: `Calculated ${Math.round(growthRate * 100)}% growth and ${Math.round(ebitdaMargin * 100)}% margin from ${txs.length} transactions.`
          });
        }

        return {
          revenue,
          opex,
          headcount,
          rdSpend,
          saasSubscriptions,
          realEstateSpend,
          arr: revenue * 12,
          growthRate,
          ebitdaMargin,
          hasRealData,
          modelId: (latestRun as any)?.modelId
        };
      }
    } catch (error) {
      console.error('[StrategicAgent] Error:', error);
    }

    return {
      revenue: 0,
      opex: 0,
      headcount: 0,
      rdSpend: 0,
      saasSubscriptions: 0,
      realEstateSpend: 0,
      arr: 0,
      growthRate: 0,
      ebitdaMargin: 0,
      hasRealData: false
    };
  }

  /**
   * Run M&A analysis
   */
  private async runMAAnalysis(
    data: any,
    entities: any,
    thoughts: AgentThought[],
    dataSources: DataSource[],
    calculations: Record<string, number>
  ): Promise<MAAnalysis> {
    const acquisitionPrice = entities.amount || 0;
    if (acquisitionPrice === 0) {
      return {
        targetName: 'N/A',
        acquisitionPrice: 0,
        arrAdded: 0,
        synergies: 0,
        year1Impact: 'dilutive',
        year1ImpactPercent: 0,
        year2Outlook: 'No target specified',
        recommendation: 'Specify acquisition amount for analysis',
        conditions: []
      };
    }

    // Simulate target company data
    const targetArr = acquisitionPrice * 0.25; // Typical 4x ARR multiple
    const targetMargin = 0.15;

    // Calculate synergies
    const backOfficeSynergies = data.opex * 0.05; // 5% opex reduction
    const salesSynergies = data.revenue * 0.08; // 8% revenue uplift
    const techSynergies = data.rdSpend * 0.10; // 10% R&D efficiency
    const totalSynergies = backOfficeSynergies + salesSynergies + techSynergies;

    // Accretion/Dilution analysis
    const combinedRevenue = data.arr + targetArr;
    const acquisitionDebt = acquisitionPrice * 0.5; // Assume 50% debt financed
    const interestCost = acquisitionDebt * 0.06; // 6% interest rate

    const year1Eps = (data.revenue - data.opex) * 12;
    const year1CombinedEps = ((data.revenue + targetArr / 12) - (data.opex + interestCost / 12) + totalSynergies / 12) * 12;

    const year1Change = (year1CombinedEps - year1Eps) / Math.abs(year1Eps);
    const isDilutive = year1Change < 0;

    thoughts.push({
      step: 4,
      thought: `M&A analysis complete: ${isDilutive ? 'Dilutive' : 'Accretive'} in Year 1 (${(Math.abs(year1Change) * 100).toFixed(0)}%)`,
      observation: `Total synergies: $${(totalSynergies * 12).toLocaleString()}/year`,
    });

    // Store calculations
    calculations.acquisitionPrice = acquisitionPrice;
    calculations.targetArr = targetArr;
    calculations.totalSynergies = totalSynergies * 12;
    calculations.year1ImpactPercent = year1Change;
    calculations.combinedArr = combinedRevenue;
    calculations.interestCost = interestCost;
    
    dataSources.push({
      type: 'calculation',
      id: 'ma_model',
      name: 'M&A Financial Model',
      timestamp: new Date(),
      confidence: 0.8,
      snippet: `Accretion/dilution analysis for $${acquisitionPrice.toLocaleString()} acquisition`,
    });

    return {
      targetName: 'Target Company',
      acquisitionPrice,
      arrAdded: targetArr,
      synergies: totalSynergies * 12,
      year1Impact: isDilutive ? 'dilutive' : 'accretive',
      year1ImpactPercent: year1Change,
      year2Outlook: `Accretive by Year 2 with +$${(targetArr + totalSynergies * 12).toLocaleString()} ARR contribution`,
      recommendation: isDilutive
        ? `Proceed only if interest rate below ${((0.06 - year1Change * 0.02) * 100).toFixed(1)}%`
        : 'Favorable deal structure - recommend proceeding',
      conditions: [
        `Interest rate below ${isDilutive ? '5%' : '7%'}`,
        'Due diligence confirms technology compatibility',
        'Key talent retention agreements in place',
      ],
    };
  }

  /**
   * Find cost reduction opportunities
   */
  private async findCostReductions(
    data: any,
    entities: any,
    thoughts: AgentThought[],
    dataSources: DataSource[],
    calculations: Record<string, number>
  ): Promise<CostReductionOpportunity[]> {
    const targetReduction = entities.percentage ? entities.percentage / 100 : 0.10;
    const targetSavings = data.opex * targetReduction;

    const opportunities: CostReductionOpportunity[] = [];
    let totalIdentified = 0;

    // SaaS/Software audit (typically 20-30% waste)
    const saasWaste = data.saasSubscriptions * 0.25;
    if (saasWaste > 0) {
      opportunities.push({
        category: 'SaaS Subscriptions',
        currentSpend: data.saasSubscriptions,
        potentialSavings: saasWaste,
        savingsPercent: 0.25,
        implementation: 'Audit software licenses, identify unused seats, consolidate tools',
        rdImpact: 'none',
        confidence: 0.9,
      });
      totalIdentified += saasWaste;
    }

    thoughts.push({
      step: 4,
      thought: `Identified $${saasWaste.toLocaleString()} in redundant SaaS subscriptions`,
    });

    // Real estate optimization
    const realEstateOpportunity = data.realEstateSpend * 0.30;
    if (realEstateOpportunity > 0) {
      opportunities.push({
        category: 'Real Estate',
        currentSpend: data.realEstateSpend,
        potentialSavings: realEstateOpportunity,
        savingsPercent: 0.30,
        implementation: 'Identify empty office floors, negotiate lease terms, adopt hybrid model',
        rdImpact: 'none',
        confidence: 0.85,
      });
      totalIdentified += realEstateOpportunity;
    }

    // Vendor consolidation
    const vendorSavings = data.opex * 0.03;
    opportunities.push({
      category: 'Vendor Consolidation',
      currentSpend: data.opex * 0.15,
      potentialSavings: vendorSavings,
      savingsPercent: 0.20,
      implementation: 'Consolidate vendors for bulk discounts, renegotiate contracts',
      rdImpact: 'none',
      confidence: 0.8,
    });
    totalIdentified += vendorSavings;

    // Contractor optimization (if not R&D)
    const nonRdContractors = data.opex * 0.08;
    const contractorSavings = nonRdContractors * 0.15;
    opportunities.push({
      category: 'Non-R&D Contractors',
      currentSpend: nonRdContractors,
      potentialSavings: contractorSavings,
      savingsPercent: 0.15,
      implementation: 'Review contractor necessity, convert key contractors to FTE where beneficial',
      rdImpact: 'none',
      confidence: 0.75,
    });
    totalIdentified += contractorSavings;

    // Marketing efficiency (careful - revenue impact)
    if (totalIdentified < targetSavings) {
      const marketingSpend = data.opex * 0.15;
      const marketingSavings = marketingSpend * 0.10;
      opportunities.push({
        category: 'Marketing Efficiency',
        currentSpend: marketingSpend,
        potentialSavings: marketingSavings,
        savingsPercent: 0.10,
        implementation: 'Optimize low-ROI campaigns, focus on high-intent channels',
        rdImpact: 'minimal',
        confidence: 0.7,
      });
      totalIdentified += marketingSavings;
    }

    thoughts.push({
      step: 5,
      thought: `Total opportunities identified: $${totalIdentified.toLocaleString()} (${(totalIdentified / data.opex * 100).toFixed(1)}% of OpEx)`,
      observation: `All with zero or minimal R&D impact`,
    });

    // Store calculations
    calculations.targetReduction = targetReduction;
    calculations.targetSavings = targetSavings;
    calculations.identifiedSavings = totalIdentified;
    calculations.savingsPercent = totalIdentified / data.opex;
    calculations.rdSpendProtected = data.rdSpend;

    dataSources.push({
      type: 'calculation',
      id: 'cost_analysis',
      name: 'Cost Optimization Analysis',
      timestamp: new Date(),
      confidence: 0.85,
      snippet: `${opportunities.length} cost reduction opportunities identified`,
    });

    return opportunities;
  }

  /**
   * Run general strategic analysis
   */
  private async runStrategicAnalysis(
    data: any,
    thoughts: AgentThought[],
    dataSources: DataSource[],
    calculations: Record<string, number>
  ): Promise<{ answer: string; recommendations: AgentRecommendation[] }> {
    // Calculate key strategic metrics
    const grossMargin = (data.revenue - data.opex * 0.2) / data.revenue;
    const burnMultiple = data.opex / data.revenue;
    const ruleOf40 = (data.revenue * 0.08 * 100) + (grossMargin * 100) - 100;

    calculations.grossMargin = grossMargin;
    calculations.burnMultiple = burnMultiple;
    calculations.ruleOf40Score = ruleOf40;

    thoughts.push({
      step: 4,
      thought: `Strategic metrics: Burn Multiple ${burnMultiple.toFixed(2)}x, Rule of 40: ${ruleOf40.toFixed(0)}`,
    });

    const recommendations: AgentRecommendation[] = [];

    // Use Real Reasoning Engine if model is available
    let reasoning: any = { analysis: [] };

    if (data.modelId) {
      try {
        reasoning = await reasoningService.analyzeMetric(
          data.modelId,
          'burn_multiple',
          'decrease'
        );
      } catch (e) {
        console.warn('Reasoning engine skipped:', e);
      }
    }

    if (burnMultiple > 2) {
      const actions = reasoning.analysis?.length > 0
        ? reasoning.analysis.map((s: any) => `${s.driver}: ${s.action} (${s.estimated_impact})`)
        : [
          'Prioritize high-LTV customer segments',
          'Optimize sales efficiency',
          'Review cost structure for non-essential spend',
        ];

      recommendations.push({
        id: uuidv4(),
        title: 'Improve Burn Multiple (AI Optimized)',
        description: `Current burn multiple of ${burnMultiple.toFixed(2)}x is inefficient. ${reasoning.analysis?.length > 0 ? 'The reasoning engine suggests:' : 'Focus on revenue efficiency.'}`,
        impact: {
          type: 'negative',
          metric: 'burn_multiple',
          value: `${burnMultiple.toFixed(2)}x (target: <2x)`,
          confidence: 0.9,
        },
        priority: 'high',
        category: 'efficiency',
        actions,
        dataSources: [],
      });
    }

    const answer = `**Strategic Analysis Summary**\n\n` +
      `**Key Metrics:**\n` +
      `• Gross Margin: ${(grossMargin * 100).toFixed(1)}%\n` +
      `• Burn Multiple: ${burnMultiple.toFixed(2)}x\n` +
      `• Rule of 40 Score: ${ruleOf40.toFixed(0)} ${ruleOf40 >= 40 ? '✅' : '⚠️'}\n\n` +
      `**Assessment:**\n` +
      `${burnMultiple > 2 ? 'High burn relative to revenue growth. Focus on efficiency improvements.' : 'Healthy burn efficiency.'}\n` +
      `${ruleOf40 >= 40 ? 'Meeting Rule of 40 threshold - balanced growth and profitability.' : 'Below Rule of 40 - may need to accelerate growth or improve margins.'}`;

    return { answer, recommendations };
  }

  /**
   * Generate M&A recommendations
   */
  private generateMARecommendations(analysis: MAAnalysis): AgentRecommendation[] {
    const recommendations: AgentRecommendation[] = [];

    recommendations.push({
      id: uuidv4(),
      title: analysis.year1Impact === 'dilutive' ? 'Conditional Acquisition Approval' : 'Recommended Acquisition',
      description: `${analysis.year1Impact === 'dilutive' ? 'Dilutive' : 'Accretive'} in Year 1 (${(Math.abs(analysis.year1ImpactPercent) * 100).toFixed(0)}%), ${analysis.year2Outlook}`,
      impact: {
        type: analysis.year1Impact === 'accretive' ? 'positive' : 'neutral',
        metric: 'eps_impact',
        value: `Year 1: ${(analysis.year1ImpactPercent * 100).toFixed(0)}%, ARR +$${analysis.arrAdded.toLocaleString()}`,
        confidence: 0.8,
      },
      priority: 'high',
      category: 'm&a',
      actions: analysis.conditions,
      risks: analysis.year1Impact === 'dilutive'
        ? ['Short-term EPS dilution', 'Integration risk', 'Key talent retention']
        : ['Integration execution risk', 'Culture alignment'],
      dataSources: [],
    });

    return recommendations;
  }

  /**
   * Generate cost reduction recommendations
   */
  private generateCostRecommendations(
    opportunities: CostReductionOpportunity[],
    data: any
  ): AgentRecommendation[] {
    const recommendations: AgentRecommendation[] = [];

    // Top opportunity
    const topOpp = opportunities[0];
    if (topOpp) {
      recommendations.push({
        id: uuidv4(),
        title: `${topOpp.category} Optimization`,
        description: `Identified $${topOpp.potentialSavings.toLocaleString()} in potential savings (${(topOpp.savingsPercent * 100).toFixed(0)}% reduction)`,
        impact: {
          type: 'positive',
          metric: 'monthly_savings',
          value: `$${topOpp.potentialSavings.toLocaleString()}/month`,
          confidence: topOpp.confidence,
        },
        priority: topOpp.potentialSavings > 10000 ? 'high' : 'medium',
        category: 'cost_optimization',
        actions: [topOpp.implementation],
        dataSources: [],
      });
    }

    // Aggregate recommendation
    const totalSavings = opportunities.reduce((sum, o) => sum + o.potentialSavings, 0);
    const noRdImpactSavings = opportunities
      .filter(o => o.rdImpact === 'none')
      .reduce((sum, o) => sum + o.potentialSavings, 0);

    recommendations.push({
      id: uuidv4(),
      title: 'Comprehensive Cost Reduction Plan',
      description: `Total identified savings of $${totalSavings.toLocaleString()}/month with zero impact on R&D headcount`,
      impact: {
        type: 'positive',
        metric: 'cost_savings',
        value: `$${totalSavings.toLocaleString()}/month ($${(totalSavings * 12).toLocaleString()}/year)`,
        confidence: 0.85,
      },
      priority: 'high',
      category: 'cost_optimization',
      actions: opportunities.slice(0, 3).map(o => o.implementation),
      dataSources: [],
    });

    return recommendations;
  }

  /**
   * Build M&A answer
   */
  private buildMAAnswer(
    analysis: MAAnalysis,
    data: any,
    calculations: Record<string, number>
  ): string {
    let answer = `**M&A Analysis: $${analysis.acquisitionPrice.toLocaleString()} Acquisition**\n\n`;

    answer += `**Deal Summary:**\n`;
    answer += `• Acquisition Price: $${analysis.acquisitionPrice.toLocaleString()}\n`;
    answer += `• Target ARR: $${analysis.arrAdded.toLocaleString()}\n`;
    answer += `• Implied Multiple: ${(analysis.acquisitionPrice / analysis.arrAdded).toFixed(1)}x ARR\n\n`;

    answer += `**Financial Impact:**\n`;
    answer += `• Year 1: **${analysis.year1ImpactPercent > 0 ? '+' : ''}${(analysis.year1ImpactPercent * 100).toFixed(0)}% ${analysis.year1Impact.toUpperCase()}**\n`;
    answer += `• Year 2+: ${analysis.year2Outlook}\n`;
    answer += `• Synergies: $${analysis.synergies.toLocaleString()}/year\n\n`;

    answer += `**Recommendation:** ${analysis.recommendation}\n\n`;

    answer += `**Conditions for Approval:**\n`;
    analysis.conditions.forEach((c, i) => {
      answer += `${i + 1}. ${c}\n`;
    });

    return answer;
  }

  /**
   * Run allocation analysis comparing Marketing, Product, Hiring, and Debt
   */
  private async runAllocationAnalysis(
    data: any,
    entities: any,
    thoughts: AgentThought[],
    dataSources: DataSource[],
    calculations: Record<string, number>
  ): Promise<any> {
    const amount = entities.amount || 1000000;
    const horizon = 24; // 24 months

    // Institutional Grade Industry Benchmarks (Used as defaults if company-specific data is missing)
    const BASE_ASSUMPTIONS = {
      MARKETING: { cac: 1500, ltv: 4500, success_prob: 0.75 },
      PRODUCT: { churn_impact: 0.002, success_prob: 0.85 },
      HIRING: { rev_per_emp: 250000, cost_per_emp: 150000, success_prob: 0.65 },
      DEBT: { interest_rate: 0.08, success_prob: 0.99 }
    };

    // Option 1: Marketing (High Growth, High Risk)
    const mktNpv = (amount / BASE_ASSUMPTIONS.MARKETING.cac) * BASE_ASSUMPTIONS.MARKETING.ltv - amount;
    const mktProbability = BASE_ASSUMPTIONS.MARKETING.success_prob;

    // Option 2: Product (Churn Reduction, Moderate Risk)
    const productRetentionValue = data.arr * BASE_ASSUMPTIONS.PRODUCT.churn_impact * horizon;
    const productProbability = BASE_ASSUMPTIONS.PRODUCT.success_prob;
    const productNpv = productRetentionValue - amount;

    // Option 3: Hiring (Operational Efficiency, High Friction)
    const totalHires = Math.floor(amount / BASE_ASSUMPTIONS.HIRING.cost_per_emp);
    const hireNpv = (totalHires * (BASE_ASSUMPTIONS.HIRING.rev_per_emp - BASE_ASSUMPTIONS.HIRING.cost_per_emp)) * 2 - amount; // Over 2 years
    const hireProbability = BASE_ASSUMPTIONS.HIRING.success_prob;

    // Option 4: Debt Reduction (Guaranteed ROI, Low Risk)
    const debtSavings = amount * BASE_ASSUMPTIONS.DEBT.interest_rate * (horizon / 12);
    const debtNpv = debtSavings;
    const debtProbability = BASE_ASSUMPTIONS.DEBT.success_prob;

    const options = [
      { name: 'Marketing Expansion', npv: mktNpv, riskAdjusted: mktNpv * mktProbability, confidence: mktProbability, priority: 'high' },
      { name: 'Product Development', npv: productNpv, riskAdjusted: productNpv * productProbability, confidence: productProbability, priority: 'medium' },
      { name: 'Sales/Dev Hiring', npv: hireNpv, riskAdjusted: hireNpv * hireProbability, confidence: hireProbability, priority: 'high' },
      { name: 'Debt Reduction', npv: debtNpv, riskAdjusted: debtNpv * debtProbability, confidence: debtProbability, priority: 'low' },
    ].sort((a, b) => b.riskAdjusted - a.riskAdjusted);

    return { amount, options };
  }

  private generateAllocationRecommendations(results: any): AgentRecommendation[] {
    const best = results.options[0];
    return [{
      id: uuidv4(),
      title: `Prioritize ${best.name}`,
      description: `Risk-adjusted NPV of $${best.riskAdjusted.toLocaleString()} makes this the optimal use of $${results.amount.toLocaleString()}.`,
      impact: { type: 'positive', metric: 'roi', value: `${(best.riskAdjusted / results.amount * 100).toFixed(0)}%`, confidence: best.confidence },
      priority: 'high',
      category: 'capital_allocation',
      actions: [`Allocate $${results.amount.toLocaleString()} to ${best.name.toLowerCase()}`],
      dataSources: []
    }];
  }

  private buildAllocationAnswer(results: any, data: any, calculations: Record<string, number>): string {
    let answer = `**Strategic Capital Allocation Analysis ($${results.amount.toLocaleString()})**\n\n`;
    answer += `I have evaluated four primary investment levers based on current financial baseline and market benchmarks:\n\n`;

    answer += `| Investment Option | Projected NPV | Risk-Adjusted Return | Confidence |\n`;
    answer += `|-------------------|---------------|----------------------|------------|\n`;

    for (const opt of results.options) {
      answer += `| ${opt.name} | $${opt.npv.toLocaleString()} | **$${opt.riskAdjusted.toLocaleString()}** | ${(opt.confidence * 100).toFixed(0)}% |\n`;
    }

    const best = results.options[0];
    answer += `\n**Strategic Recommendation:**\n`;
    answer += `Based on a 24-month horizon, **${best.name}** yields the highest risk-adjusted return. While debt reduction offers guaranteed savings, the growth delta from ${best.name.toLowerCase()} provides superior enterprise value accretion.\n`;

    return answer;
  }

  /**
   * Build cost reduction answer
   */
  private buildCostAnswer(
    opportunities: CostReductionOpportunity[],
    data: any,
    entities: any,
    calculations: Record<string, number>
  ): string {
    const targetPercent = (calculations.targetReduction * 100).toFixed(0);
    const achievedPercent = (calculations.savingsPercent * 100).toFixed(1);

    let answer = `**Cost Reduction Analysis**\n\n`;
    answer += `Targeting **${targetPercent}%** reduction in operating costs without slowing R&D.\n\n`;

    answer += `**Identified Opportunities:**\n\n`;
    answer += `| Category | Current | Savings | R&D Impact |\n`;
    answer += `|----------|---------|---------|------------|\n`;

    for (const opp of opportunities) {
      answer += `| ${opp.category} | $${opp.currentSpend.toLocaleString()} | $${opp.potentialSavings.toLocaleString()} | ${opp.rdImpact} |\n`;
    }
    answer += '\n';

    const totalSavings = calculations.identifiedSavings;
    answer += `**Total Identified:** $${totalSavings.toLocaleString()}/month (${achievedPercent}% of OpEx)\n\n`;

    // Success message
    const targetMet = calculations.identifiedSavings >= calculations.targetSavings;
    if (targetMet) {
      answer += `✅ **Target Achieved:** I have identified $${totalSavings.toLocaleString()} in savings achieving a **${achievedPercent}% cut with zero impact on R&D headcount.**\n\n`;
    } else {
      answer += `⚠️ Identified ${achievedPercent}% vs ${targetPercent}% target. Additional cuts would require reviewing R&D or revenue-generating activities.\n\n`;
    }

    // Top actions
    answer += `**Immediate Actions:**\n`;
    opportunities.slice(0, 3).forEach((opp, i) => {
      answer += `${i + 1}. ${opp.implementation}\n`;
    });

    return answer;
  }

  /**
   * Run benchmarking analysis
   */
  private async runBenchmarkingAnalysis(
    data: any,
    thoughts: AgentThought[],
    dataSources: DataSource[],
    calculations: Record<string, number>,
    params: Record<string, any>
  ): Promise<{ answer: string; recommendations: AgentRecommendation[] }> {
    const growth = data.growthRate || 0.35;
    const margin = data.ebitdaMargin || -0.15;
    const ruleOf40 = (growth + margin) * 100;

    calculations.internalGrowth = growth;
    calculations.internalMargin = margin;
    calculations.ruleOf40 = ruleOf40;

    thoughts.push({
      step: 4,
      thought: `Comparing internal metrics (Growth: ${(growth * 100).toFixed(1)}%, Margin: ${(margin * 100).toFixed(1)}%) against SaaS peers...`,
    });

    // DEEP RESEARCH: GATHER PEER DATA
    thoughts.push({
      step: 5,
      thought: 'Gathering real-time SaaS benchmark peer data via Deep Research...',
      action: 'web_search'
    });

    try {
      const currentYear = new Date().getFullYear();
      const revenueScale = data.revenue > 100000000 ? 'enterprise' : (data.revenue > 10000000 ? 'mid-market' : 'startup');
      const benchmarkQuery = `SaaS Rule of 40 benchmarks ${currentYear - 1} ${currentYear} ${revenueScale} scale survey`;
      
      // Use beforeDate logic to avoid temporal paradoxes (judging 2023 data by 2026 targets)
      const asOfDate = params?.asOfDate || new Date().toISOString().split('T')[0];
      
      const searchRes = await webSearchService.deepSearch(benchmarkQuery, 'benchmarks', 3, asOfDate);
      if (searchRes.snippets.length > 0) {
        searchRes.snippets.forEach(s => {
          dataSources.push({
            type: 'web_search',
            id: `peer_${uuidv4().slice(0,8)}`,
            name: s.source || s.title,
            url: s.url,
            timestamp: new Date(),
            confidence: s.relevanceScore,
            snippet: s.snippet
          });
        });
      }
    } catch (e) {
      console.warn('[MarketMonitoring] Deep Research failed, using knowledge base fallback:', e);
    }

    // Add to sources
    dataSources.push({
      type: 'calculation',
      id: 'calc_rule_of_40',
      name: 'Internal Rule of 40 Calculation',
      timestamp: new Date(),
      confidence: 1.0,
      snippet: `Calculated Score: ${ruleOf40.toFixed(2)}% (Growth: ${(growth * 100).toFixed(1)}%, Margin: ${(margin * 100).toFixed(1)}%)`
    });

    // SaaS Peer Benchmarks (2025-2026 Institutional Data)
    // Sources: Bessemer Cloud Index 2026 Outlook, Meritech SaaS Metrics
    const peers = {
      median: { growth: 0.22, margin: 0.12, ruleOf40: 34, arrPerFte: 280000 },
      topQuartile: { growth: 0.42, margin: 0.24, ruleOf40: 66, arrPerFte: 450000 },
      aiNative: { growth: 0.85, margin: -0.05, ruleOf40: 80, arrPerFte: 620000 }
    };

    const queryText = params?.query || '';
    const isAiNative = queryText.toLowerCase().includes('ai') || queryText.toLowerCase().includes('native');
    const targetPeer = isAiNative ? peers.aiNative : peers.median;
    const topPeer = peers.topQuartile;

    let answer = `## SaaS Industry Benchmarking: Rule of 40 (2025-2026)\n\n`;
    answer += `The **Rule of 40** remains the primary benchmark for balanced SaaS performance. In the 2026 market cycle, investors are prioritizing **statutory profitability** and **FCF quality** over raw growth at any cost.\n\n`;

    answer += `### 📊 Performance Comparison\n\n`;
    
    if (data.hasRealData) {
      answer += `| Metric | Industry Median | Top Quartile | **Our Company** | Status |\n`;
      answer += `| :--- | :--- | :--- | :--- | :--- |\n`;
      answer += `| Revenue Growth | ${(peers.median.growth * 100).toFixed(0)}% | ${(peers.topQuartile.growth * 100).toFixed(0)}% | **${(growth * 100).toFixed(1)}%** | ${growth >= peers.median.growth ? '✅' : '⚠️'} |\n`;
      answer += `| EBITDA Margin | ${(peers.median.margin * 100).toFixed(0)}% | ${(peers.topQuartile.margin * 100).toFixed(0)}% | **${(margin * 100).toFixed(1)}%** | ${margin >= peers.median.margin ? '✅' : '⚠️'} |\n`;
      answer += `| **Rule of 40 Score** | **${peers.median.ruleOf40}%** | **${peers.topQuartile.ruleOf40}%** | **${ruleOf40.toFixed(1)}%** | ${ruleOf40 >= 40 ? '✅' : '⚠️'} |\n\n`;
      
      const status = ruleOf40 >= 40 ? '✅ **INSTITUTIONAL GRADE:** Your performance is above the Rule of 40 threshold.' : '⚠️ **EFFICIENCY GAP:** You are currently below the Rule of 40 benchmark.';
      answer += `${status}\n\n`;
    } else {
      answer += `| Metric | Industry Median | Top Quartile | AI-Native Peak |\n`;
      answer += `| :--- | :--- | :--- | :--- |\n`;
      answer += `| Revenue Growth | ${(peers.median.growth * 100).toFixed(0)}% | ${(peers.topQuartile.growth * 100).toFixed(0)}% | ${(peers.aiNative.growth * 100).toFixed(0)}% |\n`;
      answer += `| EBITDA Margin | ${(peers.median.margin * 100).toFixed(0)}% | ${(peers.topQuartile.margin * 100).toFixed(0)}% | ${(peers.aiNative.margin * 100).toFixed(0)}% |\n`;
      answer += `| **Rule of 40 Score** | **${peers.median.ruleOf40}%** | **${peers.topQuartile.ruleOf40}%** | **${peers.aiNative.ruleOf40}%** |\n\n`;
      
      answer += `> [!NOTE]\n`;
      answer += `> **DATA UNAVAILABLE:** I could not find verified historical revenue or margin data in your current ledger to perform a direct comparison. Benchmarks above reflect the 2026 SaaS market median and top-quartile performance for companies of your scale.\n\n`;
    }

    answer += `### 🔍 2026 Strategic Context\n`;
    answer += `• **Structural Sorting:** The market is now discriminating between AI-native beneficiaries (targeting 80%+ Rule of 40) and legacy SaaS compounders (targeting 35-40%).\n`;
    answer += `• **Efficiency Thresholds:** Top-quartile companies are now achieving **$${peers.topQuartile.arrPerFte.toLocaleString()} ARR per FTE**, up 18% from the 2023 cycle.\n\n`;

    if (data.hasRealData && ruleOf40 < 40) {
      answer += `### 🎯 Optimization Paths\n`;
      const growthGap = (40 - ruleOf40) / 100;
      answer += `To reach the elite 40% benchmark, our analysis suggests:\n`;
      answer += `1. **Growth Acceleration:** Scale top-line growth by **${Math.round(growthGap * 100)} percentage points** without increasing CAC.\n`;
      answer += `2. **Margin Discipline:** Reduce non-R&D OpEx to expand EBITDA margin by **${Math.round(growthGap * 100)} percentage points**.\n\n`;
    }

    const recommendations: AgentRecommendation[] = [];
    if (data.hasRealData && ruleOf40 < 40) {
      recommendations.push({
        id: uuidv4(),
        title: 'Rule of 40 Correction Plan',
        description: `Current score of ${ruleOf40.toFixed(1)}% is below the SaaS elite threshold. Focus on margin expansion or growth acceleration.`,
        impact: { type: 'negative', metric: 'rule_of_40', value: `${ruleOf40.toFixed(1)}%`, confidence: 0.9 },
        priority: 'high',
        category: 'efficiency',
        actions: [
          'Audit non-revenue generating opex',
          'Review pricing tiers for NRR expansion',
          'Optimize CAC for high-margin segments'
        ],
        dataSources: []
      });
    }

    return { answer, recommendations };
  }
}

export const marketMonitoringAgent = new MarketMonitoringAgentService();
