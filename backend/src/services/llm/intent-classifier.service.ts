/**
 * INTENT CLASSIFICATION SERVICE
 * Uses LLM for intent classification and entity extraction
 * Falls back to regex if LLM unavailable or low confidence
 */

import { ValidationError } from '../../utils/errors';

export interface IntentSlot {
  value: string | number | null;
  normalized_value: number | string | null;
  currency?: string | null;
  confidence: number;
  unit?: string;
}

export interface IntentClassification {
  intent: string;
  confidence: number;
  slots: Record<string, IntentSlot>;
  fallback_used?: boolean;
  model_used?: string;
  originalInput?: string;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'fallback';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

const INTENT_TYPES = [
  'runway_calculation',
  'burn_rate_calculation',
  'revenue_forecast',
  'expense_forecast',
  'hire_impact',
  'churn_impact',
  'cac_ltv_analysis',
  'scenario_simulation',
  'monte_carlo',
  'budget_vs_actual',
  'variance_analysis',
  'anomaly_detection',
  'risk_analysis',
  'strategy_recommendation',
  'assumption_edit',
  'data_import',
  'model_sync',
  'generate_board_deck',
  'export_report',
  'fundraising_readiness',
  'cash_survival_estimation',
  'headcount_planning',
  'unit_economics_analysis',
  'cost_optimization',
  'pricing_impact',
  'margin_improvement',
];

/**
 * Fallback regex-based intent classifier
 * Used when LLM unavailable or confidence too low
 */
function fallbackIntentClassifier(input: string): IntentClassification {
  const lower = input.toLowerCase();
  const slots: Record<string, IntentSlot> = {};
  
  // Extract numbers
  const numbers = input.match(/\d+(?:,\d{3})*(?:\.\d+)?/g) || [];
  const amounts = numbers.map(n => parseFloat(n.replace(/,/g, '')));
  
  // Extract currency
  let currency: string | null = null;
  if (lower.includes('$') || lower.includes('usd') || lower.includes('dollar')) {
    currency = 'USD';
  } else if (lower.includes('₹') || lower.includes('inr') || lower.includes('rupee')) {
    currency = 'INR';
  }

  // Enhanced entity extraction - extract specific financial values
  const runwayMatch = lower.match(/(\d+)\s*(?:months?|month|m)\s*(?:runway|of runway)/i);
  if (runwayMatch) {
    slots.runway_months = { value: runwayMatch[1], normalized_value: parseFloat(runwayMatch[1]), confidence: 0.8 };
  }
  
  let cashMatch = input.match(/\$\s*(\d{1,3}(?:,\d{3})+)\s*(?:k|thousand|000)?\s*(?:cash|dollar)?/i);
  if (!cashMatch) {
    cashMatch = input.match(/\$(\d{1,3}(?:,\d{3})+)\s*(?:k|thousand|000)?\s*(?:cash|dollar)?/i);
  }
  if (!cashMatch) {
    cashMatch = input.match(/\$(\d+(?:,\d{3})*)\s*(?:k|thousand|000)?\s*(?:cash|dollar)?/i);
  }
  
  if (cashMatch) {
    const cashVal = parseFloat(cashMatch[1].replace(/,/g, ''));
    slots.cash_amount = { value: cashMatch[0], normalized_value: cashVal, currency: 'USD', confidence: 0.9 };
  }

  // Basic keyword mapping
  let intent = 'strategy_recommendation'; // Default
  if (lower.includes('runway') || lower.includes('how long') || lower.includes('cash last')) {
    intent = 'runway_calculation';
  } else if (lower.includes('burn') || lower.includes('spending')) {
    intent = 'burn_rate_calculation';
  } else if (lower.includes('revenue') || lower.includes('sales') || lower.includes('forecast revenue')) {
    intent = 'revenue_forecast';
  } else if (lower.includes('hire') || lower.includes('headcount') || lower.includes('recruit')) {
    intent = 'hire_impact';
  } else if (lower.includes('churn') || lower.includes('retention')) {
    intent = 'churn_impact';
  } else if (lower.includes('cac') || lower.includes('ltv') || lower.includes('unit economics')) {
    intent = 'unit_economics_analysis';
  } else if (lower.includes('scenario') || lower.includes('what if') || lower.includes('simulate')) {
    intent = 'scenario_simulation';
  } else if (lower.includes('budget') || lower.includes('actual') || lower.includes('variance')) {
    intent = 'budget_vs_actual';
  } else if (lower.includes('risk') || lower.includes('warn') || lower.includes('threat')) {
    intent = 'risk_analysis';
  } else if (lower.includes('cost') || lower.includes('reduce') || lower.includes('optimize')) {
    intent = 'cost_optimization';
  } else if (lower.includes('fundraising') || lower.includes('raise') || lower.includes('capital')) {
    intent = 'fundraising_readiness';
  }

  return {
    intent,
    confidence: 0.7,
    slots,
    fallback_used: true,
    model_used: 'regex_fallback',
    originalInput: input,
  };
}

/**
 * Call LLM API using llm-client service
 */
async function callLLMAPI(prompt: string, config: LLMConfig): Promise<any> {
  try {
    const { llmClient } = await import('../llm/llm-client.service');
    
    const systemPrompt = `You are a financial intent parser for a CFO assistant. Given a user query, return JSON with intent, slots, and confidence.

Map to one of these intents: ${INTENT_TYPES.join(', ')}
Extract entities: amounts, dates, metrics, percentages, currency, timeframes, conditions
Normalize numeric tokens (commas, lakh/crore, INR, USD) into canonical values
Return confidence score (0.0 to 1.0)
Think like a CFO: understand the strategic intent behind the question

OUTPUT JSON schema:
{
  "intent": "string (one of the listed intents)",
  "confidence": 0.0-1.0,
  "slots": {
    "slot_name": {
      "value": "raw value",
      "normalized_value": number or string,
      "currency": "USD" | "INR" | null,
      "confidence": 0.0-1.0,
      "unit": "optional unit"
    }
  }
}

Respond ONLY with valid JSON, no other text.`;

    const response = await llmClient.call({
      prompt,
      systemPrompt,
      temperature: 0.3,
      maxTokens: 500,
    }, config);

    // Parse JSON response
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.warn('Failed to parse LLM JSON response:', parseError);
    }

    return null;
  } catch (error: any) {
    if (error instanceof ValidationError) {
      console.warn('LLM API call failed (rate limit/invalid key), using fallback');
      return null;
    }
    console.warn('LLM API call failed:', error?.message?.substring(0, 100));
    return null;
  }
}

export const intentClassifierService = {
  /**
   * Classify intent and extract entities
   */
  classify: async (input: string, config?: LLMConfig): Promise<IntentClassification> => {
    // OPTIMIZATION: Fast path for common queries using regex before calling LLM
    const query = input.toLowerCase().trim();
    
    // Improved regex to handle "What is my cash runway?" and similar
    if (query.includes('runway') && (query.includes('what') || query.includes('check') || query.includes('tell') || query.includes('my') || query.includes('how long'))) {
      return { intent: 'runway_calculation', confidence: 0.98, slots: {}, model_used: 'fast_path_regex' };
    }
    if (query.includes('burn') && (query.includes('what') || query.includes('reduce') || query.includes('check') || query.includes('my') || query.includes('optimize'))) {
      return { intent: 'burn_rate_calculation', confidence: 0.98, slots: {}, model_used: 'fast_path_regex' };
    }
    if (query.includes('staged') && (query.includes('change') || query.includes('recommendation') || query.includes('view'))) {
      return { intent: 'strategy_recommendation', confidence: 0.98, slots: {}, model_used: 'fast_path_regex' };
    }
    if ((query.includes('metric') || query.includes('kpi')) && (query.includes('what') || query.includes('show') || query.includes('my'))) {
      return { intent: 'unit_economics_analysis', confidence: 0.98, slots: {}, model_used: 'fast_path_regex' };
    }
    if ((query.includes('raise') || query.includes('funding') || query.includes('capital') || query.includes('fundraising')) && (query.includes('should') || query.includes('when') || query.includes('readiness'))) {
      return { intent: 'fundraising_readiness', confidence: 0.98, slots: {}, model_used: 'fast_path_regex' };
    }

    const apiKeys = [
      process.env.GEMINI_API_KEY_1?.trim(),
      process.env.GEMINI_API_KEY_2?.trim(),
      process.env.GEMINI_API_KEY?.trim(),
      process.env.LLM_API_KEY?.trim(),
    ].filter(Boolean) as string[];

    const llmConfig: LLMConfig = config || {
      provider: (process.env.LLM_PROVIDER as any) || (apiKeys.length > 0 ? 'gemini' : 'fallback'),
      apiKey: apiKeys[0],
      model: process.env.GEMINI_MODEL || process.env.LLM_MODEL || 'gemini-2.0-flash-exp',
    };

    if (!llmConfig.apiKey || llmConfig.provider === 'fallback' || apiKeys.length === 0) {
      return fallbackIntentClassifier(input);
    }

    try {
      const result = await callLLMAPI(input, llmConfig);
      
      if (result && result.intent && result.confidence >= 0.6) {
        return {
          ...result,
          originalInput: input,
          model_used: llmConfig.model,
          fallback_used: false,
        };
      }
      
      return fallbackIntentClassifier(input);
    } catch (error) {
      return fallbackIntentClassifier(input);
    }
  },

  /**
   * Validate intent classification results
   */
  validate: (classification: IntentClassification): { valid: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    if (classification.confidence < 0.5) {
      issues.push('Low classification confidence');
    }
    
    if (!classification.intent) {
      issues.push('Missing intent');
    }
    
    return {
      valid: issues.length === 0,
      issues,
    };
  },
};
