/**
 * FINANCIAL CALCULATIONS SERVICE
 * CFO-level financial calculations with validation and error handling
 * No hallucinations - all calculations grounded in data
 */

import { ValidationError } from '../utils/errors';

export interface FinancialMetrics {
  revenue?: number;
  expenses?: number;
  payroll?: number;
  cashBalance?: number;
  burnRate?: number;
  runwayMonths?: number;
  cac?: number;
  ltv?: number;
  churnRate?: number;
  arr?: number;
  mrr?: number;
}

export interface CalculationResult {
  valid: boolean;
  result: number | null;
  formula: string;
  assumptions: string[];
  warnings: string[];
  errors: string[];
}

export const financialCalculations = {
  /**
   * Calculate cash from runway and burn rate
   * Formula: Cash = Runway (months) × Burn Rate (monthly)
   */
  calculateCashFromRunway: (runwayMonths: number, burnRate: number): CalculationResult => {
    const warnings: string[] = [];
    const errors: string[] = [];
    const assumptions: string[] = [];

    // Validation
    if (runwayMonths < 0) {
      errors.push('Runway cannot be negative');
      return { valid: false, result: null, formula: 'Cash = Runway × Burn Rate', assumptions, warnings, errors };
    }

    if (burnRate < 0) {
      errors.push('Burn rate cannot be negative');
      return { valid: false, result: null, formula: 'Cash = Runway × Burn Rate', assumptions, warnings, errors };
    }

    if (runwayMonths === 0) {
      warnings.push('Runway is zero - company has no cash runway');
    }

    if (burnRate === 0) {
      warnings.push('Burn rate is zero - unusual for operating company');
    }

    assumptions.push(`Constant burn rate of $${burnRate.toLocaleString()}/month`);
    assumptions.push(`No revenue or additional funding during runway period`);

    const cash = runwayMonths * burnRate;

    return {
      valid: true,
      result: cash,
      formula: `Cash = ${runwayMonths} months × $${burnRate.toLocaleString()}/month`,
      assumptions,
      warnings,
      errors,
    };
  },

  /**
   * Calculate runway from cash and burn rate
   * Formula: Runway (months) = Cash / Burn Rate
   */
  calculateRunway: (cashBalance: number, burnRate: number): CalculationResult => {
    const warnings: string[] = [];
    const errors: string[] = [];
    const assumptions: string[] = [];

    if (cashBalance < 0) {
      errors.push('Cash balance cannot be negative');
      return { valid: false, result: null, formula: 'Runway = Cash / Burn Rate', assumptions, warnings, errors };
    }

    if (burnRate <= 0) {
      if (burnRate === 0) {
        warnings.push('Burn rate is zero - runway is infinite');
        return { valid: true, result: Infinity, formula: 'Runway = Cash / Burn Rate', assumptions, warnings, errors };
      }
      errors.push('Burn rate must be positive');
      return { valid: false, result: null, formula: 'Runway = Cash / Burn Rate', assumptions, warnings, errors };
    }

    assumptions.push(`Constant burn rate of $${burnRate.toLocaleString()}/month`);
    assumptions.push(`No revenue or additional funding`);

    const runway = cashBalance / burnRate;

    if (runway < 1) {
      warnings.push('Runway is less than 1 month - critical cash situation');
    }

    return {
      valid: true,
      result: runway,
      formula: `Runway = $${cashBalance.toLocaleString()} / $${burnRate.toLocaleString()}/month`,
      assumptions,
      warnings,
      errors,
    };
  },

  /**
   * Calculate burn rate from expenses and revenue
   * Formula: Burn Rate = Expenses - Revenue
   */
  calculateBurnRate: (expenses: number, revenue: number = 0): CalculationResult => {
    const warnings: string[] = [];
    const errors: string[] = [];
    const assumptions: string[] = [];

    if (expenses < 0) {
      errors.push('Expenses cannot be negative');
      return { valid: false, result: null, formula: 'Burn Rate = Expenses - Revenue', assumptions, warnings, errors };
    }

    if (revenue < 0) {
      warnings.push('Revenue is negative - unusual');
    }

    assumptions.push(`Monthly expenses: $${expenses.toLocaleString()}`);
    assumptions.push(`Monthly revenue: $${revenue.toLocaleString()}`);

    const burnRate = expenses - revenue;

    if (burnRate < 0) {
      warnings.push('Negative burn rate - company is profitable (cash positive)');
    }

    return {
      valid: true,
      result: burnRate,
      formula: `Burn Rate = $${expenses.toLocaleString()} - $${revenue.toLocaleString()}`,
      assumptions,
      warnings,
      errors,
    };
  },

  /**
   * Calculate runway with revenue dip and payroll increase
   * Formula: New Runway = Cash / (New Burn Rate)
   * New Burn Rate = (Expenses × (1 + payrollIncrease)) - (Revenue × (1 - revenueDip))
   */
  calculateRunwayWithChanges: (
    cashBalance: number,
    currentRevenue: number,
    currentExpenses: number,
    revenueDipPercent: number,
    payrollIncreasePercent: number
  ): CalculationResult => {
    const warnings: string[] = [];
    const errors: string[] = [];
    const assumptions: string[] = [];

    // Validation
    if (cashBalance < 0) {
      errors.push('Cash balance cannot be negative');
      return { valid: false, result: null, formula: 'Complex runway calculation', assumptions, warnings, errors };
    }

    if (revenueDipPercent < 0 || revenueDipPercent > 1) {
      errors.push('Revenue dip must be between 0 and 1 (0% to 100%)');
      return { valid: false, result: null, formula: 'Complex runway calculation', assumptions, warnings, errors };
    }

    if (payrollIncreasePercent < 0 || payrollIncreasePercent > 1) {
      errors.push('Payroll increase must be between 0 and 1 (0% to 100%)');
      return { valid: false, result: null, formula: 'Complex runway calculation', assumptions, warnings, errors };
    }

    // Calculate new revenue and expenses
    const newRevenue = currentRevenue * (1 - revenueDipPercent);
    const newExpenses = currentExpenses * (1 + payrollIncreasePercent);
    const newBurnRate = newExpenses - newRevenue;

    assumptions.push(`Revenue decreases by ${(revenueDipPercent * 100).toFixed(1)}%`);
    assumptions.push(`Payroll increases by ${(payrollIncreasePercent * 100).toFixed(1)}%`);
    assumptions.push(`New monthly revenue: $${newRevenue.toLocaleString()}`);
    assumptions.push(`New monthly expenses: $${newExpenses.toLocaleString()}`);

    if (newBurnRate <= 0) {
      warnings.push('New burn rate is zero or negative - company becomes profitable');
      return { valid: true, result: Infinity, formula: 'Runway = Cash / New Burn Rate', assumptions, warnings, errors };
    }

    const runway = cashBalance / newBurnRate;

    if (runway < 1) {
      warnings.push('Runway is less than 1 month - critical situation');
    }

    return {
      valid: true,
      result: runway,
      formula: `Runway = $${cashBalance.toLocaleString()} / $${newBurnRate.toLocaleString()}/month`,
      assumptions,
      warnings,
      errors,
    };
  },

  /**
   * Calculate impact of zero CAC
   * If CAC = 0, customer acquisition cost is free
   */
  calculateZeroCACImpact: (ltv: number, currentCAC: number): CalculationResult => {
    const warnings: string[] = [];
    const errors: string[] = [];
    const assumptions: string[] = [];

    if (ltv <= 0) {
      errors.push('LTV must be positive');
      return { valid: false, result: null, formula: 'LTV:CAC ratio', assumptions, warnings, errors };
    }

    if (currentCAC < 0) {
      errors.push('CAC cannot be negative');
      return { valid: false, result: null, formula: 'LTV:CAC ratio', assumptions, warnings, errors };
    }

    const currentRatio = currentCAC > 0 ? ltv / currentCAC : Infinity;
    const newRatio = Infinity; // LTV / 0 = Infinity

    assumptions.push(`Current LTV: $${ltv.toLocaleString()}`);
    assumptions.push(`Current CAC: $${currentCAC.toLocaleString()}`);
    assumptions.push(`New CAC: $0 (free acquisition)`);

    warnings.push('Zero CAC is unrealistic - customer acquisition always has costs');
    warnings.push('Infinite LTV:CAC ratio indicates perfect unit economics');

    return {
      valid: true,
      result: newRatio,
      formula: `LTV:CAC = $${ltv.toLocaleString()} / $0`,
      assumptions,
      warnings,
      errors,
    };
  },

  /**
   * Validate financial metrics for consistency
   */
  validateMetrics: (metrics: FinancialMetrics): {
    valid: boolean;
    issues: string[];
    warnings: string[];
  } => {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check for negative values where not allowed
    if (metrics.revenue !== undefined && metrics.revenue < 0) {
      warnings.push('Revenue is negative - unusual');
    }

    if (metrics.expenses !== undefined && metrics.expenses < 0) {
      issues.push('Expenses cannot be negative');
    }

    if (metrics.payroll !== undefined && metrics.payroll < 0) {
      issues.push('Payroll cannot be negative');
    }

    if (metrics.cashBalance !== undefined && metrics.cashBalance < 0) {
      warnings.push('Cash balance is negative - company is insolvent');
    }

    if (metrics.burnRate !== undefined && metrics.burnRate < 0) {
      warnings.push('Negative burn rate - company is profitable');
    }

    if (metrics.runwayMonths !== undefined && metrics.runwayMonths < 0) {
      issues.push('Runway cannot be negative');
    }

    // Check consistency
    if (metrics.revenue !== undefined && metrics.expenses !== undefined && metrics.burnRate !== undefined) {
      const calculatedBurn = metrics.expenses - metrics.revenue;
      const diff = Math.abs(calculatedBurn - metrics.burnRate);
      if (diff > 0.01) {
        warnings.push(`Burn rate inconsistency: calculated ${calculatedBurn}, provided ${metrics.burnRate}`);
      }
    }

    if (metrics.cashBalance !== undefined && metrics.burnRate !== undefined && metrics.runwayMonths !== undefined) {
      if (metrics.burnRate > 0) {
        const calculatedRunway = metrics.cashBalance / metrics.burnRate;
        const diff = Math.abs(calculatedRunway - metrics.runwayMonths);
        if (diff > 0.1) {
          warnings.push(`Runway inconsistency: calculated ${calculatedRunway.toFixed(2)} months, provided ${metrics.runwayMonths}`);
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
    };
  },
};

