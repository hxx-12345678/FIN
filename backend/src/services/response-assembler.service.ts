/**
 * RESPONSE ASSEMBLER SERVICE
 * Validates and assembles structured JSON responses
 * Ensures all outputs match schema and include provenance
 */

import { v4 as uuidv4 } from 'uuid';
import { IntentClassification } from './llm/intent-classifier.service';
import { GroundingContext } from './rag/grounding.service';
import { PlannerResult } from './planner/action-orchestrator.service';

export interface StructuredResponse {
  request_id: string;
  intent: string;
  input: Record<string, any>;
  validation: {
    ok: boolean;
    issues: string[];
    warnings: string[];
  };
  calculations?: Record<string, any>;
  scenarios?: {
    base?: any;
    downside?: any;
    upside?: any;
    stress?: any;
  };
  monte_carlo?: {
    seed?: number;
    runs?: number;
    p10?: number;
    p50?: number;
    p90?: number;
  };
  recommendations?: Array<{
    type: string;
    explain: string;
    impact?: Record<string, any>;
    confidence?: number;
  }>;
  evidence?: Array<{
    doc_id: string;
    score: number;
    snippet: string;
  }>;
  warnings: string[];
  errors: string[];
  audit: {
    model_version: string;
    llm_model?: string;
    prompt_id?: string;
    timestamp: string;
  };
  timestamp: string;
}

export const responseAssembler = {
  /**
   * Assemble structured response from all components
   */
  assemble: (
    intentClassification: IntentClassification,
    groundingContext: GroundingContext,
    plannerResult: PlannerResult,
    executionResults: any[],
    modelVersion: string = 'v1.0'
  ): StructuredResponse => {
    // Ensure executionResults is an array
    const results = Array.isArray(executionResults) ? executionResults : [];
    const requestId = uuidv4();
    const timestamp = new Date().toISOString();

    // Extract calculations from execution results
    const calculations: Record<string, any> = {};
    for (const result of results) {
      if (result.result !== undefined && typeof result.result === 'number') {
        const operation = result.operation || 'calculation';
        // Use more specific keys for better extraction
        if (operation.includes('burn_rate') || operation.includes('calculate_burn_rate')) {
          calculations.burnRate = result.result;
          calculations[operation] = result.result; // Also keep operation name
        } else if (operation.includes('runway') || operation.includes('calculate_runway')) {
          calculations.runway = result.result;
          calculations[operation] = result.result;
        } else if (operation.includes('revenue') || operation.includes('forecast_revenue')) {
          calculations.futureRevenue = result.result;
          calculations[operation] = result.result;
        } else if (operation.includes('hire') || operation.includes('calculate_hire_impact')) {
          calculations.monthlyCost = result.result;
          calculations[operation] = result.result;
        } else {
          calculations[operation] = result.result;
        }
      } else if (result.params?.result !== undefined && typeof result.params.result === 'number') {
        // Handle action results with params.result
        const operation = result.params.operation || result.operation || 'calculation';
        if (operation.includes('burn_rate') || operation.includes('calculate_burn_rate')) {
          // For burn rate, prioritize calculated_monthly_burn if available
          const burnValue = result.params.calculated_monthly_burn !== undefined ? result.params.calculated_monthly_burn : result.params.result;
          calculations.burnRate = burnValue;
          calculations[operation] = burnValue;
        } else if (operation.includes('runway') || operation.includes('calculate_runway')) {
          calculations.runway = result.params.result;
          calculations[operation] = result.params.result;
        } else if (operation.includes('revenue') || operation.includes('forecast_revenue')) {
          calculations.futureRevenue = result.params.result;
          calculations[operation] = result.params.result;
        } else if (operation.includes('hire') || operation.includes('calculate_hire_impact')) {
          calculations.monthlyCost = result.params.result;
          calculations[operation] = result.params.result;
        } else {
        calculations[operation] = result.params.result;
        }
      }
    }

    // Extract recommendations
    const recommendations: Array<{
      type: string;
      explain: string;
      impact?: Record<string, any>;
      confidence?: number;
    }> = [];

    // Extract evidence
    const evidence = groundingContext.evidence.map((doc) => ({
      doc_id: doc.doc_id,
      score: doc.score,
      snippet: doc.content.substring(0, 200),
    }));

    // Collect all warnings
    const warnings: string[] = [
      ...plannerResult.validation.warnings,
      ...intentClassification.confidence < 0.85 ? ['Low intent confidence'] : [],
      ...groundingContext.confidence < 0.6 ? ['Low grounding confidence'] : [],
    ];

    // Collect errors
    const errors: string[] = [
      ...plannerResult.validation.issues,
    ];

    return {
      request_id: requestId,
      intent: intentClassification.intent,
      input: {
        raw: (intentClassification as any).originalInput || intentClassification.intent, // Would be original user input
        slots: intentClassification.slots,
      },
      validation: {
        ok: plannerResult.validation.ok && errors.length === 0,
        issues: plannerResult.validation.issues,
        warnings: plannerResult.validation.warnings,
      },
      calculations: Object.keys(calculations).length > 0 ? calculations : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      evidence: evidence.length > 0 ? evidence : undefined,
      warnings: warnings.length > 0 ? warnings : [],
      errors: errors.length > 0 ? errors : [],
      audit: {
        model_version: modelVersion,
        llm_model: intentClassification.model_used,
        prompt_id: `p-${requestId.substring(0, 8)}`,
        timestamp,
      },
      timestamp,
    };
  },

  /**
   * Validate response schema
   */
  validate: (response: StructuredResponse): {
    valid: boolean;
    issues: string[];
  } => {
    const issues: string[] = [];

    // Required fields
    if (!response.request_id) issues.push('Missing request_id');
    if (!response.intent) issues.push('Missing intent');
    if (!response.timestamp) issues.push('Missing timestamp');
    if (!response.audit) issues.push('Missing audit');

    // Validate intent is valid
    const validIntents = [
      'runway_calculation',
      'burn_rate_calculation',
      'revenue_forecast',
      'scenario_simulation',
      'monte_carlo',
      'strategy_recommendation',
    ];
    if (!validIntents.includes(response.intent)) {
      issues.push(`Invalid intent: ${response.intent}`);
    }

    // Validate calculations are numeric if present
    if (response.calculations) {
      for (const [key, value] of Object.entries(response.calculations)) {
        if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
          issues.push(`Invalid calculation result for ${key}: ${value}`);
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  },
};

