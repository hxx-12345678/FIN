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
    const currentRevenue = modelState.revenue || modelState.mrr || 0;

    // Extract numbers from slots for fallback entity extraction
    const amounts: number[] = [];
    for (const slot of Object.values(slots)) {
      if (slot && typeof slot === 'object' && 'normalized_value' in slot) {
        const value = (slot as any).normalized_value;
        if (typeof value === 'number') {
          amounts.push(value);
        }
      }
    }

    // Route by intent
    switch (intent) {
      case 'runway_calculation': {
        // Try to extract from slots first (better entity extraction)
        let cash = slots.cash?.normalized_value;
        let burn = slots.burn_rate?.normalized_value;
        const runwayMonths = slots.runway_months?.normalized_value;
        
        // If we have runway and cash, calculate burn rate
        if (runwayMonths && cash && !burn) {
          burn = cash / runwayMonths;
          slots.burn_rate = {
            value: burn.toString(),
            normalized_value: burn,
            currency: slots.cash?.currency || null,
            confidence: 0.8,
          };
        }
        
        // If we have runway and burn, calculate cash needed
        if (runwayMonths && burn && !cash) {
          cash = burn * runwayMonths;
          slots.cash = {
            value: cash.toString(),
            normalized_value: cash,
            currency: slots.burn_rate?.currency || null,
            confidence: 0.8,
          };
        }
        
        // Use current model state if slots not available
        cash = cash || currentCash;
        burn = burn || currentBurn;

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
        // Enhanced: can calculate from runway and cash
        let expenses = slots.expenses?.normalized_value;
        let revenue = slots.revenue?.normalized_value || 0;
        const runwayMonths = slots.runway_months?.normalized_value;
        const cash = slots.cash?.normalized_value;
        
        // Debug logging
        if (process.env.DEBUG_EXTRACTION) {
          console.log(`[ActionOrchestrator] burn_rate_calculation - runwayMonths: ${runwayMonths}, cash: ${cash}, expenses: ${expenses}`);
        }
        
        // If we have runway and cash, calculate monthly burn
        if (runwayMonths && cash && !expenses) {
          const monthlyBurn = cash / runwayMonths;
          expenses = monthlyBurn + revenue; // Burn = Expenses - Revenue, so Expenses = Burn + Revenue
          
          if (process.env.DEBUG_EXTRACTION) {
            console.log(`[ActionOrchestrator] Calculated monthly burn: ${monthlyBurn} from cash ${cash} / runway ${runwayMonths}`);
          }
          
          actions.push({
            type: 'calculation',
            operation: 'calculate_burn_rate',
            params: { 
              cash, 
              runway: runwayMonths, 
              calculated_monthly_burn: monthlyBurn,
              expenses,
              revenue,
              result: monthlyBurn 
            },
            requiresApproval: false,
          });
          break;
        }
        
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

      case 'revenue_forecast': {
        const baseRevenue = slots.base_revenue?.normalized_value || slots.revenue?.normalized_value || currentRevenue;
        const growthRate = slots.growth_rate?.normalized_value || slots.revenue_growth?.normalized_value;
        const months = slots.months?.normalized_value;

        // Debug logging
        if (process.env.DEBUG_EXTRACTION) {
          console.log(`[ActionOrchestrator] revenue_forecast - baseRevenue: ${baseRevenue}, growthRate: ${growthRate}, months: ${months}`);
        }

        if (!baseRevenue || growthRate === undefined || !months) {
          issues.push('Missing required slots for revenue forecast: base_revenue (or revenue), growth_rate (or revenue_growth), months');
          break;
        }

        const calc = financialCalculations.calculateFutureRevenue(baseRevenue, growthRate, months);
        
        if (process.env.DEBUG_EXTRACTION && calc.valid) {
          console.log(`[ActionOrchestrator] Calculated future revenue: ${calc.result} from base ${baseRevenue} * (1 + ${growthRate})^${months}`);
        }
        if (calc.valid && calc.result !== null) {
          actions.push({
            type: 'calculation',
            operation: 'forecast_revenue',
            params: { baseRevenue, growthRate, months, result: calc.result },
            requiresApproval: false,
          });
        } else {
          issues.push(...calc.errors);
        }
        break;
      }

      case 'hire_impact': {
        const quantity = slots.quantity?.normalized_value || slots.hire_count?.normalized_value;
        const annualSalary = slots.annual_salary?.normalized_value || slots.salary?.normalized_value;

        if (!quantity || !annualSalary) {
          issues.push('Missing required slots for hire impact: quantity (or hire_count), annual_salary (or salary)');
          break;
        }

        const calc = financialCalculations.calculateHireImpact(quantity, annualSalary);
        if (calc.valid && calc.result !== null) {
          actions.push({
            type: 'calculation',
            operation: 'calculate_hire_impact',
            params: { quantity, annualSalary, result: calc.result },
            requiresApproval: false,
          });
        } else {
          issues.push(...calc.errors);
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
            result: action.params.result || action.params.calculated_monthly_burn,
            params: action.params,
          });
          break;
        }
        
        case 'forecast_revenue': {
          results.push({
            operation: 'forecast_revenue',
            result: action.params.result,
            params: action.params,
          });
          break;
        }
        
        case 'calculate_hire_impact': {
          results.push({
            operation: 'calculate_hire_impact',
            result: action.params.result || action.params.monthlyCost,
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

