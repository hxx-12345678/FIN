/**
 * DECISION ENGINE SERVICE
 * The "Brain" of FinaPilot: Converts hypothetical changes into instant runway/risk answers.
 * This differentiates FinaPilot from Anaplan/Pigment by providing answers in <100ms.
 */

import prisma from '../config/database';
import { runwayCalculationService } from './runway-calculation.service';
import { montecarloService } from './montecarlo.service';
import { logger } from '../utils/logger';

export interface DecisionImpact {
  originalRunwayMonths: number;
  newRunwayMonths: number;
  runwayDelta: number;
  cashOutDateImpact: string; 
  survivalProbabilityImpact: number; 
  currentSurvivalProbability: number;
  estimatedNewSurvivalProbability: number;
  recommendation: string;
  sensitivity: {
    maxAdditionalBurn: number; 
    revenueBuffer: number; 
  };
  actions: {
    title: string;
    impact: string;
    type: 'positive' | 'negative' | 'neutral';
  }[];
  provenance: {
    source: string; // 'model' | 'transactions'
    lastSyncAt: Date;
    confidence: string;
  };
}

export interface HypotheticalChange {
  headcountChange?: number; // +/- number of people
  avgSalary?: number;
  revenueChange?: number; // +/- monthly revenue
  marketingSpendChange?: number;
  burnChange?: number; // Direct burn adjustment
}

export const decisionEngineService = {
  /**
   * Calculates the instant impact of a financial decision.
   * Does NOT require a model run.
   */
  calculateInstantImpact: async (orgId: string, change: HypotheticalChange): Promise<DecisionImpact> => {
    // 1. Get current live runway data
    const currentRunway = await runwayCalculationService.calculateRunway(orgId);
    const { runwayMonths, cashBalance, monthlyBurnRate } = currentRunway;

    // 2. Calculate Burn Delta
    let burnDelta = 0;
    
    // Impact of headcount (Default avg salary $100k/yr = ~$8.3k/mo)
    if (change.headcountChange) {
      const avgMonthlySalary = change.avgSalary ? (change.avgSalary / 12) : 8333;
      burnDelta += change.headcountChange * avgMonthlySalary;
    }

    // Impact of marketing/direct burn
    if (change.marketingSpendChange) burnDelta += change.marketingSpendChange;
    if (change.burnChange) burnDelta += change.burnChange;

    // Impact of revenue (Negative burn delta)
    if (change.revenueChange) burnDelta -= change.revenueChange;

    // 3. Calculate New Runway
    const newBurnRate = Math.max(0, monthlyBurnRate + burnDelta);
    let newRunwayMonths = 0;
    
    if (newBurnRate <= 0) {
      newRunwayMonths = 999; // Profitable/Infinite
    } else {
      newRunwayMonths = Math.max(0, cashBalance / newBurnRate);
    }

    // 4. Get Latest Monte Carlo Survival Probability
    const latestMC = await prisma.monteCarloJob.findFirst({
      where: { orgId, status: 'done' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, percentilesJson: true }
    });

    // Get survival probability - default to 85% if no MC run or if calculation fails
    let currentSurvivalProbability = 0.85;
    try {
      if (latestMC && latestMC.percentilesJson) {
        const res: any = await montecarloService.getMonteCarloResult(latestMC.id);
        // Extract survival probability from various possible formats
        const sp = res?.survivalProbability || 
                   res?.survival_probability || 
                   res?.overall?.probabilitySurvivingFullPeriod ||
                   res?.overall?.probability_surviving_full_period;
        if (sp && typeof sp === 'number' && sp > 0 && sp <= 1) {
          currentSurvivalProbability = sp;
        }
      }
    } catch (error) {
      logger.warn(`[DecisionEngine] Could not get Monte Carlo survival probability, using default: ${error}`);
    }
    
    // Ensure currentSurvivalProbability is a valid number
    if (!currentSurvivalProbability || currentSurvivalProbability <= 0 || currentSurvivalProbability > 1) {
      currentSurvivalProbability = 0.85;
    }

    // 5. Calculate Deltas & Heuristic Survival Probability
    const runwayDelta = newRunwayMonths - runwayMonths;
    
    // Heuristic: If runway changes by 10%, survival probability shifts by ~2-5%
    // This is the "Instant" answer for the CFO.
    let runwayChangeRatio = 0;
    if (runwayMonths > 0) {
      runwayChangeRatio = runwayDelta / runwayMonths;
    } else if (runwayMonths === 0 && newRunwayMonths > 0) {
      // Going from 0 to positive runway is a huge improvement
      runwayChangeRatio = 0.5; // 50% improvement
    } else if (runwayMonths > 0 && newRunwayMonths === 999) {
      // Becoming profitable is a huge improvement
      runwayChangeRatio = 1.0; // 100% improvement
    }
    
    // Calculate new survival probability with bounds
    let estimatedNewSurvivalProbability = currentSurvivalProbability + (runwayChangeRatio * 0.25);
    estimatedNewSurvivalProbability = Math.min(0.99, Math.max(0.01, estimatedNewSurvivalProbability));
    
    // Ensure we always have valid probabilities
    if (!estimatedNewSurvivalProbability || isNaN(estimatedNewSurvivalProbability) || !isFinite(estimatedNewSurvivalProbability)) {
      estimatedNewSurvivalProbability = currentSurvivalProbability || 0.85;
    }

    // Generate Recommendation
    let recommendation = "";
    if (runwayDelta < -3) {
      recommendation = `CRITICAL: This decision reduces runway by over 3 months and drops survival probability to ${Math.round(estimatedNewSurvivalProbability * 100)}%. Consider offsetting with revenue growth.`;
    } else if (runwayDelta < 0) {
      recommendation = `WARNING: This reduces runway. Survival probability estimated to shift from ${Math.round(currentSurvivalProbability * 100)}% to ${Math.round(estimatedNewSurvivalProbability * 100)}%.`;
    } else if (runwayDelta > 0) {
      recommendation = "POSITIVE: This decision extends your cash runway and improves survival probability.";
    } else {
      recommendation = "NEUTRAL: Minimal impact on cash runway.";
    }

    // 6. Calculate Sensitivity Buffers (Strategic Insight - Pain Point 4)
    // How much extra monthly burn until we hit the 6-month "Danger Zone"?
    const dangerZoneMonths = 6;
    const maxSafeBurn = runwayMonths > dangerZoneMonths ? (cashBalance / dangerZoneMonths) : monthlyBurnRate;
    const maxAdditionalBurn = Math.max(0, maxSafeBurn - newBurnRate);
    
    // Revenue Buffer: How much can revenue drop before we hit the danger zone?
    // This is the maximum reduction in revenue (or increase in expenses) before hitting 6 months runway
    let revenueBuffer = 0;
    if (cashBalance > 0) {
      const safeBurnRate = cashBalance / dangerZoneMonths;
      if (newBurnRate > 0 && newBurnRate < safeBurnRate) {
        // We have buffer: revenue can drop by this amount (or expenses can increase)
        // before we hit the 6-month danger zone
        revenueBuffer = safeBurnRate - newBurnRate;
      } else if (newBurnRate === 0) {
        // No burn rate means we can sustain up to safeBurnRate
        revenueBuffer = safeBurnRate;
      }
      // If newBurnRate >= safeBurnRate, buffer is 0 (we're at or past danger zone)
    }
    
    // Ensure revenueBuffer is a valid number
    if (!revenueBuffer || isNaN(revenueBuffer) || !isFinite(revenueBuffer) || revenueBuffer < 0) {
      revenueBuffer = 0;
    }

    // 7. Estimate Cash-out Date Impact
    const impactText = runwayDelta === 0 ? "No change" : 
      `${Math.abs(Math.round(runwayDelta))} months ${runwayDelta > 0 ? 'later' : 'sooner'}`;

    // 8. Generate Actionable Decisions (Pain Point 8)
    const actions: DecisionImpact['actions'] = [];
    if (runwayDelta < 0) {
      actions.push({
        title: "Delay non-critical hiring",
        impact: `Extends runway by ${Math.abs(Math.round(runwayDelta))} months to return to baseline.`,
        type: 'positive'
      });
      actions.push({
        title: "Increase pricing by 10%",
        impact: "Estimated to offset burn increase and stabilize survival probability.",
        type: 'positive'
      });
    } else if (runwayDelta > 0) {
      actions.push({
        title: "Accelerate growth investment",
        impact: "You have excess runway; consider increasing marketing spend by 20%.",
        type: 'neutral'
      });
    } else {
      // Even when neutral, provide strategic guidance
      if (newBurnRate > 0 && cashBalance === 0) {
        actions.push({
          title: "Secure funding or accelerate revenue",
          impact: "Current burn rate requires immediate cash injection or revenue acceleration to maintain operations.",
          type: 'negative'
        });
      } else if (monthlyBurnRate > 0) {
        actions.push({
          title: "Monitor cash position closely",
          impact: "Maintain current trajectory while tracking runway monthly.",
          type: 'neutral'
        });
      }
    }

    return {
      originalRunwayMonths: Math.round(runwayMonths * 10) / 10,
      newRunwayMonths: Math.round(newRunwayMonths * 10) / 10,
      runwayDelta: Math.round(runwayDelta * 10) / 10,
      cashOutDateImpact: impactText,
      survivalProbabilityImpact: Math.round((estimatedNewSurvivalProbability - currentSurvivalProbability) * 100),
      currentSurvivalProbability,
      estimatedNewSurvivalProbability,
      recommendation,
      sensitivity: {
        maxAdditionalBurn: Math.round(maxAdditionalBurn),
        revenueBuffer: Math.round(revenueBuffer)
      },
      actions,
      provenance: {
        source: currentRunway.source,
        lastSyncAt: new Date(),
        confidence: currentRunway.confidence
      }
    };
  }
};

