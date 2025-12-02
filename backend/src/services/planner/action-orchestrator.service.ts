/**
 * PLANNER & ACTION ORCHESTRATOR
 * Maps intent + slots to deterministic operations
 * Enforces approval gates and validation
 */

import { ValidationError, ForbiddenError } from '../../utils/errors';
import { financialCalculations } from '../financial-calculations.service';
import { jobService } from '../job.service';
import prisma from '../../config/database';
import { auditService } from '../audit.service';

export interface PlannerAction {
  type: string;
  operation: string;
  params: Record<string, any>;
  requiresApproval: boolean;
  approvalReason?: string;
  impact?: {
    runway_delta_months?: number;
    burn_delta?: number;
    cost_delta?: number;
  };
}

export interface PlannerResult {
  actions: PlannerAction[];
  validation: {
    ok: boolean;
    issues: string[];
    warnings: string[];
  };
  requiresApproval: boolean;
  approvalThreshold?: number;
}

export const actionOrchestrator = {
  /**
   * Plan actions based on intent and slots
   */
  plan: async (
    orgId: string,
    userId: string,
    intent: string,
    slots: Record<string, any>,
    modelRunId?: string
  ): Promise<PlannerResult> => {
    const actions: PlannerAction[] = [];
    const issues: string[] = [];
    const warnings: string[] = [];
    let requiresApproval = false;

    // Get current model state for impact calculation
    let currentModelRun = null;
    if (modelRunId) {
      currentModelRun = await prisma.modelRun.findUnique({
        where: { id: modelRunId },
      });
    } else {
      // Get latest model run
      const model = await prisma.model.findFirst({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
      });
      if (model) {
        currentModelRun = await prisma.modelRun.findFirst({
          where: { modelId: model.id, status: 'done' },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    const modelState = (currentModelRun?.summaryJson as any) || {};
    const currentCash = modelState.cashBalance || 0;
    const currentBurn = modelState.burnRate || 0;
    const currentRunway = modelState.runwayMonths || 0;

    // Route by intent
    switch (intent) {
      case 'runway_calculation': {
        const cash = slots.cash?.normalized_value || currentCash;
        const burn = slots.burn_rate?.normalized_value || currentBurn;

        if (!cash || !burn) {
          issues.push('Missing required slots: cash and burn_rate');
          break;
        }

        const calc = financialCalculations.calculateRunway(cash, burn);
        if (calc.valid && calc.result !== null) {
          actions.push({
            type: 'calculation',
            operation: 'calculate_runway',
            params: { cash, burn, result: calc.result },
            requiresApproval: false,
          });
        } else {
          issues.push(...calc.errors);
        }
        break;
      }

      case 'burn_rate_calculation': {
        const expenses = slots.expenses?.normalized_value;
        const revenue = slots.revenue?.normalized_value || 0;

        if (!expenses) {
          issues.push('Missing required slot: expenses');
          break;
        }

        const calc = financialCalculations.calculateBurnRate(expenses, revenue);
        if (calc.valid && calc.result !== null) {
          actions.push({
            type: 'calculation',
            operation: 'calculate_burn_rate',
            params: { expenses, revenue, result: calc.result },
            requiresApproval: false,
          });
        }
        break;
      }

      case 'scenario_simulation': {
        const scenarioType = slots.scenario_type?.value || 'base';
        const params = {
          revenueGrowth: slots.revenue_growth?.normalized_value,
          expenseChange: slots.expense_change?.normalized_value,
          headcountChange: slots.headcount_change?.normalized_value,
        };

        actions.push({
          type: 'simulation',
          operation: 'create_scenario',
          params: { scenarioType, ...params },
          requiresApproval: false,
        });
        break;
      }

      case 'monte_carlo': {
        const numSimulations = slots.num_simulations?.normalized_value || 5000;
        const drivers = slots.drivers?.value || {};
        const randomSeed = slots.random_seed?.normalized_value;

        actions.push({
          type: 'simulation',
          operation: 'run_monte_carlo',
          params: { numSimulations, drivers, randomSeed },
          requiresApproval: false,
        });
        break;
      }

      case 'assumption_edit': {
        const changes = slots.changes?.value || {};
        const impact = calculateAssumptionImpact(changes, modelState);

        // Check approval threshold
        const approvalThreshold = 0.15; // 15% change requires approval
        if (impact.runway_delta_percent && Math.abs(impact.runway_delta_percent) > approvalThreshold) {
          requiresApproval = true;
          warnings.push(`Large impact detected: ${(impact.runway_delta_percent * 100).toFixed(1)}% runway change`);
        }

        actions.push({
          type: 'model_update',
          operation: 'update_assumptions',
          params: { changes },
          requiresApproval,
          approvalReason: requiresApproval ? 'Large impact on runway' : undefined,
          impact,
        });
        break;
      }

      case 'strategy_recommendation': {
        const goal = slots.goal?.value || '';
        const constraints = slots.constraints?.value || {};

        actions.push({
          type: 'recommendation',
          operation: 'generate_recommendations',
          params: { goal, constraints },
          requiresApproval: false,
        });
        break;
      }

      default: {
        issues.push(`Unsupported intent: ${intent}`);
      }
    }

    return {
      actions,
      validation: {
        ok: issues.length === 0,
        issues,
        warnings,
      },
      requiresApproval,
      approvalThreshold: requiresApproval ? 0.15 : undefined,
    };
  },

  /**
   * Execute planned actions
   */
  execute: async (
    orgId: string,
    userId: string,
    actions: PlannerAction[],
    modelRunId?: string
  ): Promise<any[]> => {
    const results = [];

    for (const action of actions) {
      if (action.requiresApproval) {
        throw new ForbiddenError(`Action requires approval: ${action.approvalReason}`);
      }

      switch (action.operation) {
        case 'calculate_runway': {
          // Return calculation result in expected format
          results.push({
            operation: 'calculate_runway',
            result: action.params.result,
            params: action.params,
          });
          break;
        }
        case 'calculate_burn_rate': {
          // Return calculation result in expected format
          results.push({
            operation: 'calculate_burn_rate',
            result: action.params.result,
            params: action.params,
          });
          break;
        }

        case 'create_scenario': {
          // Create scenario via scenario service
          const model = await prisma.model.findFirst({
            where: { orgId },
            orderBy: { createdAt: 'desc' },
          });

          if (model) {
            // This would call scenario service
            results.push({ scenarioCreated: true, params: action.params });
          }
          break;
        }

        case 'run_monte_carlo': {
          // Create Monte Carlo job
          const model = await prisma.model.findFirst({
            where: { orgId },
            orderBy: { createdAt: 'desc' },
          });

          if (model) {
            // This would call montecarlo service
            results.push({ monteCarloJobCreated: true, params: action.params });
          }
          break;
        }

        case 'generate_recommendations': {
          // Generate AI-CFO plan
          const plan = await prisma.aICFOPlan.create({
            data: {
              orgId,
              modelRunId: modelRunId || null,
              name: `AI-CFO Plan: ${action.params.goal}`,
              description: `Generated plan`,
              planJson: {
                goal: action.params.goal,
                constraints: action.params.constraints,
                stagedChanges: [],
              },
              status: 'draft',
              createdById: userId,
            },
          });

          results.push({ planId: plan.id });
          break;
        }

        default: {
          results.push({ error: `Unknown operation: ${action.operation}` });
        }
      }
    }

    return results;
  },
};

/**
 * Calculate impact of assumption changes
 */
function calculateAssumptionImpact(
  changes: Record<string, any>,
  currentState: any
): {
  runway_delta_months?: number;
  runway_delta_percent?: number;
  burn_delta?: number;
  cost_delta?: number;
} {
  const impact: any = {};

  // Simplified impact calculation
  if (changes.expenseChange && currentState.burnRate) {
    const newBurn = currentState.burnRate * (1 + changes.expenseChange);
    const currentRunway = currentState.runwayMonths || 0;
    const newRunway = currentState.cashBalance / newBurn;
    impact.runway_delta_months = newRunway - currentRunway;
    impact.runway_delta_percent = (impact.runway_delta_months / currentRunway);
    impact.burn_delta = newBurn - currentState.burnRate;
  }

  return impact;
}

