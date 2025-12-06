/**
 * FORMULA AUTOCOMPLETE SERVICE
 * Provides smart formula suggestions for financial models
 * Similar to Abacum's auto-complete formulas feature
 */

import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errors';

export interface FormulaSuggestion {
  formula: string;
  description: string;
  category: 'revenue' | 'expense' | 'calculation' | 'ratio' | 'forecast' | 'custom';
  parameters: Array<{
    name: string;
    description: string;
    required: boolean;
    type: 'number' | 'cell' | 'range' | 'string';
  }>;
  example: string;
  complexity: 'simple' | 'medium' | 'complex';
}

export interface AutocompleteRequest {
  context: string; // Current cell or context
  partialFormula?: string; // What user has typed so far
  modelType?: 'saas' | 'ecommerce' | 'services' | 'mixed';
  category?: string; // Revenue, Expense, etc.
  existingFormulas?: string[]; // To avoid duplicates
}

export interface AutocompleteResult {
  suggestions: FormulaSuggestion[];
  currentFormula?: string;
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

// Financial formula library
const FORMULA_LIBRARY: FormulaSuggestion[] = [
  // Revenue Formulas
  {
    formula: 'SUM({range})',
    description: 'Sum of values in a range',
    category: 'revenue',
    parameters: [
      { name: 'range', description: 'Cell range (e.g., A1:A10)', required: true, type: 'range' },
    ],
    example: 'SUM(A1:A12)',
    complexity: 'simple',
  },
  {
    formula: 'AVERAGE({range})',
    description: 'Average of values in a range',
    category: 'revenue',
    parameters: [
      { name: 'range', description: 'Cell range', required: true, type: 'range' },
    ],
    example: 'AVERAGE(B1:B12)',
    complexity: 'simple',
  },
  {
    formula: 'GROWTH({current}, {previous}, {periods})',
    description: 'Calculate growth rate',
    category: 'revenue',
    parameters: [
      { name: 'current', description: 'Current period value', required: true, type: 'number' },
      { name: 'previous', description: 'Previous period value', required: true, type: 'number' },
      { name: 'periods', description: 'Number of periods', required: false, type: 'number' },
    ],
    example: 'GROWTH(1000, 800, 1)',
    complexity: 'medium',
  },
  {
    formula: 'MRR({base_mrr}, {growth_rate})',
    description: 'Calculate Monthly Recurring Revenue',
    category: 'revenue',
    parameters: [
      { name: 'base_mrr', description: 'Base MRR', required: true, type: 'number' },
      { name: 'growth_rate', description: 'Growth rate (decimal)', required: true, type: 'number' },
    ],
    example: 'MRR(10000, 0.05)',
    complexity: 'medium',
  },
  {
    formula: 'ARR({mrr})',
    description: 'Convert MRR to Annual Recurring Revenue',
    category: 'revenue',
    parameters: [
      { name: 'mrr', description: 'Monthly Recurring Revenue', required: true, type: 'number' },
    ],
    example: 'ARR(10000)',
    complexity: 'simple',
  },
  {
    formula: 'REVENUE({customers}, {arpu})',
    description: 'Calculate revenue from customers and ARPU',
    category: 'revenue',
    parameters: [
      { name: 'customers', description: 'Number of customers', required: true, type: 'number' },
      { name: 'arpu', description: 'Average Revenue Per User', required: true, type: 'number' },
    ],
    example: 'REVENUE(100, 50)',
    complexity: 'simple',
  },
  
  // Expense Formulas
  {
    formula: 'BURN_RATE({expenses}, {periods})',
    description: 'Calculate monthly burn rate',
    category: 'expense',
    parameters: [
      { name: 'expenses', description: 'Total expenses', required: true, type: 'number' },
      { name: 'periods', description: 'Number of periods', required: true, type: 'number' },
    ],
    example: 'BURN_RATE(50000, 1)',
    complexity: 'simple',
  },
  {
    formula: 'RUNWAY({cash}, {burn_rate})',
    description: 'Calculate cash runway in months',
    category: 'expense',
    parameters: [
      { name: 'cash', description: 'Current cash balance', required: true, type: 'number' },
      { name: 'burn_rate', description: 'Monthly burn rate', required: true, type: 'number' },
    ],
    example: 'RUNWAY(500000, 50000)',
    complexity: 'simple',
  },
  {
    formula: 'COGS({revenue}, {cogs_percent})',
    description: 'Calculate Cost of Goods Sold',
    category: 'expense',
    parameters: [
      { name: 'revenue', description: 'Revenue amount', required: true, type: 'number' },
      { name: 'cogs_percent', description: 'COGS percentage (decimal)', required: true, type: 'number' },
    ],
    example: 'COGS(100000, 0.25)',
    complexity: 'simple',
  },
  
  // Calculation Formulas
  {
    formula: 'GROSS_MARGIN({revenue}, {cogs})',
    description: 'Calculate gross margin percentage',
    category: 'calculation',
    parameters: [
      { name: 'revenue', description: 'Revenue', required: true, type: 'number' },
      { name: 'cogs', description: 'Cost of Goods Sold', required: true, type: 'number' },
    ],
    example: 'GROSS_MARGIN(100000, 25000)',
    complexity: 'simple',
  },
  {
    formula: 'NET_INCOME({revenue}, {expenses})',
    description: 'Calculate net income',
    category: 'calculation',
    parameters: [
      { name: 'revenue', description: 'Total revenue', required: true, type: 'number' },
      { name: 'expenses', description: 'Total expenses', required: true, type: 'number' },
    ],
    example: 'NET_INCOME(100000, 75000)',
    complexity: 'simple',
  },
  {
    formula: 'CASH_FLOW({net_income}, {depreciation}, {changes})',
    description: 'Calculate cash flow',
    category: 'calculation',
    parameters: [
      { name: 'net_income', description: 'Net income', required: true, type: 'number' },
      { name: 'depreciation', description: 'Depreciation', required: false, type: 'number' },
      { name: 'changes', description: 'Working capital changes', required: false, type: 'number' },
    ],
    example: 'CASH_FLOW(25000, 5000, -2000)',
    complexity: 'medium',
  },
  
  // Ratio Formulas
  {
    formula: 'CAC({marketing_cost}, {new_customers})',
    description: 'Calculate Customer Acquisition Cost',
    category: 'ratio',
    parameters: [
      { name: 'marketing_cost', description: 'Total marketing cost', required: true, type: 'number' },
      { name: 'new_customers', description: 'Number of new customers', required: true, type: 'number' },
    ],
    example: 'CAC(10000, 100)',
    complexity: 'simple',
  },
  {
    formula: 'LTV({arpu}, {lifetime_months})',
    description: 'Calculate Customer Lifetime Value',
    category: 'ratio',
    parameters: [
      { name: 'arpu', description: 'Average Revenue Per User', required: true, type: 'number' },
      { name: 'lifetime_months', description: 'Average customer lifetime in months', required: true, type: 'number' },
    ],
    example: 'LTV(50, 24)',
    complexity: 'simple',
  },
  {
    formula: 'LTV_CAC_RATIO({ltv}, {cac})',
    description: 'Calculate LTV:CAC ratio',
    category: 'ratio',
    parameters: [
      { name: 'ltv', description: 'Lifetime Value', required: true, type: 'number' },
      { name: 'cac', description: 'Customer Acquisition Cost', required: true, type: 'number' },
    ],
    example: 'LTV_CAC_RATIO(1200, 100)',
    complexity: 'simple',
  },
  {
    formula: 'CHURN_RATE({lost_customers}, {total_customers})',
    description: 'Calculate customer churn rate',
    category: 'ratio',
    parameters: [
      { name: 'lost_customers', description: 'Number of lost customers', required: true, type: 'number' },
      { name: 'total_customers', description: 'Total customers at start', required: true, type: 'number' },
    ],
    example: 'CHURN_RATE(10, 1000)',
    complexity: 'simple',
  },
  
  // Forecast Formulas
  {
    formula: 'FORECAST({base}, {growth_rate}, {periods})',
    description: 'Forecast future value with growth rate',
    category: 'forecast',
    parameters: [
      { name: 'base', description: 'Base value', required: true, type: 'number' },
      { name: 'growth_rate', description: 'Growth rate per period (decimal)', required: true, type: 'number' },
      { name: 'periods', description: 'Number of periods ahead', required: true, type: 'number' },
    ],
    example: 'FORECAST(10000, 0.05, 3)',
    complexity: 'medium',
  },
  {
    formula: 'COMPOUND_GROWTH({initial}, {rate}, {periods})',
    description: 'Calculate compound growth',
    category: 'forecast',
    parameters: [
      { name: 'initial', description: 'Initial value', required: true, type: 'number' },
      { name: 'rate', description: 'Growth rate (decimal)', required: true, type: 'number' },
      { name: 'periods', description: 'Number of periods', required: true, type: 'number' },
    ],
    example: 'COMPOUND_GROWTH(10000, 0.08, 12)',
    complexity: 'medium',
  },
];

export const formulaAutocompleteService = {
  /**
   * Get formula suggestions based on context
   */
  getSuggestions: async (
    request: AutocompleteRequest
  ): Promise<AutocompleteResult> => {
    try {
      let suggestions: FormulaSuggestion[] = [];

      // Filter by category if provided
      if (request.category) {
        suggestions = FORMULA_LIBRARY.filter(
          f => f.category === request.category || f.category === 'calculation'
        );
      } else {
        suggestions = [...FORMULA_LIBRARY];
      }

      // Filter by partial formula if provided
      if (request.partialFormula) {
        const partial = request.partialFormula.toLowerCase();
        suggestions = suggestions.filter(s => 
          s.formula.toLowerCase().includes(partial) ||
          s.description.toLowerCase().includes(partial) ||
          s.example.toLowerCase().includes(partial)
        );
      }

      // Filter out existing formulas to avoid duplicates
      if (request.existingFormulas && request.existingFormulas.length > 0) {
        const existingLower = request.existingFormulas.map(f => f.toLowerCase());
        suggestions = suggestions.filter(s => 
          !existingLower.some(existing => existing.includes(s.formula.toLowerCase()))
        );
      }

      // Sort by relevance (exact matches first, then by complexity)
      suggestions.sort((a, b) => {
        if (request.partialFormula) {
          const aMatch = a.formula.toLowerCase().startsWith(request.partialFormula.toLowerCase());
          const bMatch = b.formula.toLowerCase().startsWith(request.partialFormula.toLowerCase());
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
        }
        const complexityOrder = { simple: 1, medium: 2, complex: 3 };
        return complexityOrder[a.complexity] - complexityOrder[b.complexity];
      });

      // Limit to top 10 suggestions
      suggestions = suggestions.slice(0, 10);

      // Validate current formula if provided
      let isValid = true;
      const errors: string[] = [];
      const warnings: string[] = [];

      if (request.partialFormula) {
        const validation = validateFormula(request.partialFormula);
        isValid = validation.isValid;
        errors.push(...validation.errors);
        warnings.push(...validation.warnings);
      }

      return {
        suggestions,
        currentFormula: request.partialFormula,
        isValid,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error: any) {
      logger.error('Error getting formula suggestions', error);
      throw new Error(`Failed to get formula suggestions: ${error.message}`);
    }
  },

  /**
   * Validate a formula
   */
  validateFormula: (formula: string): { isValid: boolean; errors: string[]; warnings: string[] } => {
    return validateFormula(formula);
  },

  /**
   * Get formula by name
   */
  getFormula: (formulaName: string): FormulaSuggestion | null => {
    return FORMULA_LIBRARY.find(f => 
      f.formula.toLowerCase().startsWith(formulaName.toLowerCase())
    ) || null;
  },

  /**
   * Get all formulas by category
   */
  getFormulasByCategory: (category: string): FormulaSuggestion[] => {
    return FORMULA_LIBRARY.filter(f => f.category === category);
  },
};

/**
 * Validate formula syntax and structure
 */
function validateFormula(formula: string): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!formula || formula.trim().length === 0) {
    return { isValid: true, errors: [], warnings: [] };
  }

  // Check for balanced parentheses
  const openParens = (formula.match(/\(/g) || []).length;
  const closeParens = (formula.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push('Unbalanced parentheses');
  }

  // Check for invalid characters
  const invalidChars = formula.match(/[^A-Za-z0-9_().,\s{}-]/g);
  if (invalidChars && invalidChars.length > 0) {
    warnings.push(`Potentially invalid characters: ${invalidChars.join(', ')}`);
  }

  // Check for division by zero patterns
  if (formula.includes('/0') || formula.match(/\/\s*0\s*[,\\)]/)) {
    errors.push('Potential division by zero');
  }

  // Check for circular references (basic check)
  if (formula.includes('{') && formula.includes('}')) {
    const references = formula.match(/\{[^}]+\}/g) || [];
    const selfReference = references.some(ref => {
      const cellRef = ref.replace(/[{}]/g, '');
      return formula.includes(cellRef) && cellRef.length > 0;
    });
    if (selfReference) {
      warnings.push('Potential circular reference detected');
    }
  }

  // Check formula length
  if (formula.length > 1000) {
    warnings.push('Formula is very long and may be difficult to maintain');
  }

  // Check for valid function names
  const functionPattern = /([A-Z_]+)\s*\(/g;
  const matches = formula.matchAll(functionPattern);
  const knownFunctions = FORMULA_LIBRARY.map(f => {
    const funcName = f.formula.split('(')[0];
    return funcName.toUpperCase();
  });

  for (const match of matches) {
    const funcName = match[1].toUpperCase();
    if (!knownFunctions.includes(funcName) && !['SUM', 'AVERAGE', 'MAX', 'MIN', 'IF', 'AND', 'OR'].includes(funcName)) {
      warnings.push(`Unknown function: ${funcName}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

