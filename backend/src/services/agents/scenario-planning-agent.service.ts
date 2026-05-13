/**
 * Scenario Planning Agent — Production Grade
 *
 * Runs genuine Monte Carlo simulations using real baseline financial data.
 * No hardcoded probabilities — all outputs are computed from stochastic paths.
 */

import prisma from '../../config/database';
import { AgentType, AgentResponse, AgentStatus, AgentThought, DataSource } from './agent-types';
import { v4 as uuidv4 } from 'uuid';

export class ScenarioPlanningAgent {
  public type: AgentType = 'scenario_planning';

  async execute(orgId: string, userId: string, params: any): Promise<AgentResponse> {
    const thoughts: AgentThought[] = [];
    const dataSources: DataSource[] = [];
    const calculations: Record<string, number> = {};
    const query = params.query || '';

    thoughts.push({
      step: 1,
      thought: 'Loading baseline financial snapshot for Monte Carlo simulation...',
      action: 'data_retrieval',
    });

    // ── 1. Get real baseline data ──
    const baselineSnapshot = params.baselineSnapshot;
    let baseRevenue = 0;
    let baseBurn = 0;
    let baseCash = 0;
    let growthRate = 0.03; // Monthly
    let churnRate = 0.02;
    let hasRealData = false;

    if (baselineSnapshot) {
      baseRevenue = Number(baselineSnapshot.monthlyRevenue || 0);
      baseBurn = Number(baselineSnapshot.monthlyBurn || baselineSnapshot.opex || 0);
      baseCash = Number(baselineSnapshot.cashBalance || 0);
      churnRate = Number(baselineSnapshot.churnRate || 0.02);
      hasRealData = baseRevenue > 0 || baseBurn > 0;
    }

    if (!hasRealData) {
      try {
        const latestRun = await prisma.modelRun.findFirst({
          where: { orgId, status: { in: ['done', 'completed'] } },
          orderBy: { createdAt: 'desc' },
        });
        if (latestRun?.summaryJson) {
          const s = latestRun.summaryJson as any;
          baseRevenue = Number(s.revenue || s.mrr || 0);
          baseBurn = Number(s.monthlyBurn || s.expenses || s.opex || 0);
          baseCash = Number(s.cashBalance || s.initialCash || 0);
          growthRate = Number(s.revenueGrowth || 0.03);
          churnRate = Number(s.churnRate || 0.02);
          hasRealData = baseRevenue > 0;
          dataSources.push({
            type: 'model_run',
            id: latestRun.id,
            name: 'Financial Model',
            timestamp: latestRun.createdAt,
            confidence: 0.95,
          });
        }
      } catch (e) {
        console.warn('[ScenarioPlanningAgent] DB error:', e);
      }
    }

    if (!hasRealData) {
      return {
        agentType: this.type,
        taskId: uuidv4(),
        status: 'completed' as AgentStatus,
        answer:
          `**Scenario Planning**\n\n` +
          `⚠️ **Insufficient data for Monte Carlo simulation.** Revenue and burn data are required.\n\n` +
          `Please ensure a financial model has been run or transactions have been imported.`,
        confidence: 0.2,
        thoughts,
        dataSources,
      };
    }

    // ── 2. Run genuine Monte Carlo ──
    thoughts.push({
      step: 2,
      thought: `Running Monte Carlo simulation: ${5000} paths × 12 months. Base revenue: $${baseRevenue.toLocaleString()}, burn: $${baseBurn.toLocaleString()}`,
      action: 'stochastic_evaluation',
    });

    const ITERATIONS = 5000;
    const MONTHS = 12;
    const netGrowth = growthRate - churnRate;

    // Arrays to collect terminal values
    const terminalARR: number[] = [];
    const terminalCash: number[] = [];
    let positiveCashFlowCount = 0;

    for (let i = 0; i < ITERATIONS; i++) {
      let revenue = baseRevenue;
      let cash = baseCash;
      let reachedZero = false;

      for (let m = 0; m < MONTHS; m++) {
        // Stochastic shocks: growth ±3%, burn ±2%
        const growthShock = netGrowth + (Math.random() - 0.5) * 0.06;
        const burnShock = 1 + (Math.random() - 0.5) * 0.04;

        revenue = revenue * (1 + growthShock);
        const monthlyBurn = baseBurn * burnShock;
        const netCashFlow = revenue - monthlyBurn;
        cash += netCashFlow;

        if (cash <= 0) reachedZero = true;
      }

      terminalARR.push(revenue * 12);
      terminalCash.push(cash);
      if (!reachedZero) positiveCashFlowCount++;
    }

    // Sort for percentile extraction
    terminalARR.sort((a, b) => a - b);
    terminalCash.sort((a, b) => a - b);

    const survivalProbability = (positiveCashFlowCount / ITERATIONS * 100);
    const p10ARR = terminalARR[Math.floor(ITERATIONS * 0.1)];
    const p50ARR = terminalARR[Math.floor(ITERATIONS * 0.5)];
    const p90ARR = terminalARR[Math.floor(ITERATIONS * 0.9)];
    const p10Cash = terminalCash[Math.floor(ITERATIONS * 0.1)];
    const p50Cash = terminalCash[Math.floor(ITERATIONS * 0.5)];
    const p90Cash = terminalCash[Math.floor(ITERATIONS * 0.9)];

    const p10Runway = p10Cash > 0 ? (p10Cash / baseBurn) : 0;
    const p50Runway = p50Cash > 0 ? (p50Cash / baseBurn) : 0;
    const p90Runway = p90Cash > 0 ? (p90Cash / baseBurn) : 0;

    // Compute probability weights from actual distribution
    const downsideCount = terminalARR.filter(v => v <= p10ARR * 1.1).length;
    const upsideCount = terminalARR.filter(v => v >= p90ARR * 0.9).length;
    const baseCount = ITERATIONS - downsideCount - upsideCount;

    const downsideProbability = (downsideCount / ITERATIONS * 100);
    const baseProbability = (baseCount / ITERATIONS * 100);
    const upsideProbability = (upsideCount / ITERATIONS * 100);

    thoughts.push({
      step: 3,
      thought: `Simulation complete. Survival probability: ${survivalProbability.toFixed(1)}%. Generating scenario matrix...`,
      action: 'report_generation',
    });

    calculations.iterations = ITERATIONS;
    calculations.survival_probability = survivalProbability / 100;
    calculations.p10_arr = p10ARR;
    calculations.p50_arr = p50ARR;
    calculations.p90_arr = p90ARR;

    // ── 3. Build answer ──
    const answer =
      `### 📊 Scenario Planning — Monte Carlo Simulation\n` +
      `*${ITERATIONS.toLocaleString()} stochastic paths × ${MONTHS}-month forward horizon using real financial data.*\n\n` +
      `**Survival Probability:** **${survivalProbability.toFixed(1)}%** (maintaining positive cash through T+${MONTHS})\n\n` +
      `#### Scenario Matrix\n` +
      `| Scenario | Probability | Proj. ARR | Proj. Cash | Equiv. Runway |\n` +
      `| :--- | :---: | :---: | :---: | :---: |\n` +
      `| **Upside (p90)** | ${upsideProbability.toFixed(0)}% | $${Math.round(p90ARR).toLocaleString()} | $${Math.round(p90Cash).toLocaleString()} | ${p90Runway.toFixed(1)}m |\n` +
      `| **Base Case (p50)** | ${baseProbability.toFixed(0)}% | $${Math.round(p50ARR).toLocaleString()} | $${Math.round(p50Cash).toLocaleString()} | ${p50Runway.toFixed(1)}m |\n` +
      `| **Downside (p10)** | ${downsideProbability.toFixed(0)}% | $${Math.round(p10ARR).toLocaleString()} | $${Math.round(p10Cash < 0 ? 0 : p10Cash).toLocaleString()} | ${p10Runway.toFixed(1)}m |\n\n` +
      `#### Key Drivers\n` +
      `- **Revenue Growth:** ${(netGrowth * 100).toFixed(1)}%/mo ± 3% stochastic variance\n` +
      `- **Burn Volatility:** ±2% monthly shock applied to $${baseBurn.toLocaleString()} baseline\n` +
      `- **Starting Cash:** $${baseCash.toLocaleString()}\n\n` +
      (survivalProbability < 80
        ? `⚠️ **Risk Alert:** Survival probability below 80% threshold. Consider extending runway through cost reduction or fundraising.\n`
        : `✅ **Assessment:** Strong survival probability. Current trajectory supports strategic growth investment.\n`);

    return {
      agentType: this.type,
      taskId: uuidv4(),
      status: 'completed' as AgentStatus,
      answer,
      confidence: hasRealData ? 0.92 : 0.5,
      thoughts,
      dataSources,
      calculations,
      confidenceIntervals: {
        p10: p10ARR,
        p50: p50ARR,
        p90: p90ARR,
        metric: 'Terminal ARR (12-month)',
      },
      liquidityMetrics: {
        survivalProbability: survivalProbability / 100,
        capitalRequired: p10Cash < 0 ? Math.abs(p10Cash) : 0,
      },
      scenarioTree: [
        {
          nodeId: 'base',
          label: 'Base Case (p50)',
          probability: baseProbability / 100,
          metrics: { arr: p50ARR, cash: p50Cash, runway: p50Runway },
        },
        {
          nodeId: 'downside',
          label: 'Downside Stress (p10)',
          probability: downsideProbability / 100,
          metrics: { arr: p10ARR, cash: p10Cash, runway: p10Runway },
        },
        {
          nodeId: 'upside',
          label: 'Upside Momentum (p90)',
          probability: upsideProbability / 100,
          metrics: { arr: p90ARR, cash: p90Cash, runway: p90Runway },
        },
      ],
      auditMetadata: {
        modelVersion: 'scenario-planning-v2.0.0-monte-carlo',
        timestamp: new Date(),
        inputVersions: {
          iterations: String(ITERATIONS),
          horizon_months: String(MONTHS),
        },
      },
    };
  }
}

export const scenarioPlanningAgent = new ScenarioPlanningAgent();
