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

  // Intent classification via keywords
  let intent = 'strategy_recommendation'; // default
  let confidence = 0.5;

  if (lower.includes('runway') || lower.includes('cash') && lower.includes('month')) {
    intent = 'runway_calculation';
    confidence = 0.7;
    if (amounts.length >= 2) {
      slots.cash = { value: amounts[0], normalized_value: amounts[0], currency, confidence: 0.6 };
      slots.burn_rate = { value: amounts[1], normalized_value: amounts[1], currency, confidence: 0.6 };
    }
  } else if (lower.includes('burn') && lower.includes('rate')) {
    intent = 'burn_rate_calculation';
    confidence = 0.7;
  } else if (lower.includes('revenue') && (lower.includes('forecast') || lower.includes('predict'))) {
    intent = 'revenue_forecast';
    confidence = 0.7;
  } else if (lower.includes('hire') || lower.includes('headcount')) {
    intent = 'hire_impact';
    confidence = 0.7;
  } else if (lower.includes('monte') || lower.includes('carlo')) {
    intent = 'monte_carlo';
    confidence = 0.8;
  } else if (lower.includes('scenario')) {
    intent = 'scenario_simulation';
    confidence = 0.7;
  } else if (lower.includes('variance') || lower.includes('budget') && lower.includes('actual')) {
    intent = 'variance_analysis';
    confidence = 0.7;
  } else if (lower.includes('fundraising') || lower.includes('fund') || lower.includes('capital')) {
    intent = 'fundraising_readiness';
    confidence = 0.7;
  }

  return {
    intent,
    confidence,
    slots,
    fallback_used: true,
    model_used: 'regex_fallback',
    originalInput: input,
  };
}

/**
 * LLM-based intent classifier
 * Calls LLM API for intent classification and entity extraction
 */
async function llmIntentClassifier(
  input: string,
  config: LLMConfig
): Promise<IntentClassification> {
  // For MVP: Check if LLM is configured
  if (!config.apiKey || config.provider === 'fallback') {
    return fallbackIntentClassifier(input);
  }

  const prompt = `You are a financial intent parser for a CFO assistant. Given a user query, return JSON with intent, slots, and confidence.

USER QUERY: "${input}"

INSTRUCTIONS:
- Map to one of these intents: ${INTENT_TYPES.join(', ')}
- Extract entities: amounts, dates, metrics, percentages, currency, timeframes, conditions
- Normalize numeric tokens (commas, lakh/crore, INR, USD) into canonical values
- Return confidence score (0.0 to 1.0)
- Think like a CFO: understand the strategic intent behind the question

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

  try {
    // For MVP: Simulate LLM call (replace with actual API call)
    // In production, implement actual LLM API calls here
    const response = await callLLMAPI(prompt, config);
    
    if (response && response.intent) {
      return {
        intent: response.intent,
        confidence: response.confidence || 0.5,
        slots: response.slots || {},
        fallback_used: false,
        model_used: config.model || config.provider,
        originalInput: input,
      };
    }
  } catch (error) {
    console.warn('LLM intent classification failed, using fallback:', error);
  }

  // Fallback to regex
  return fallbackIntentClassifier(input);
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
    // If it's a ValidationError (rate limit, invalid key), return fallback immediately
    if (error instanceof ValidationError) {
      console.warn('LLM API call failed (rate limit/invalid key), using fallback');
      return null;
    }
    // For other errors, log and return null to use fallback
    console.warn('LLM API call failed:', error?.message?.substring(0, 100));
    return null;
  }
}

export const intentClassifierService = {
  /**
   * Classify intent and extract entities
   */
  classify: async (
    input: string,
    config?: LLMConfig
  ): Promise<IntentClassification> => {
    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      throw new ValidationError('Input is required and must be a non-empty string');
    }

    const llmConfig: LLMConfig = config || {
      provider: (process.env.LLM_PROVIDER as any) || (process.env.GEMINI_API_KEY ? 'gemini' : 'fallback'),
      apiKey: process.env.GEMINI_API_KEY || process.env.LLM_API_KEY,
      model: process.env.GEMINI_MODEL || process.env.LLM_MODEL || 'gemini-2.0-flash-exp',
      baseUrl: process.env.LLM_BASE_URL,
    };

    return await llmIntentClassifier(input.trim(), llmConfig);
  },

  /**
   * Validate intent classification
   */
  validate: (classification: IntentClassification): {
    valid: boolean;
    issues: string[];
    requiresClarification: boolean;
  } => {
    const issues: string[] = [];

    if (!INTENT_TYPES.includes(classification.intent)) {
      issues.push(`Invalid intent: ${classification.intent}`);
    }

    if (classification.confidence < 0 || classification.confidence > 1) {
      issues.push(`Confidence must be between 0 and 1, got ${classification.confidence}`);
    }

    const requiresClarification = classification.confidence < 0.5;

    if (classification.confidence < 0.85 && classification.confidence >= 0.5) {
      issues.push('Low confidence - may need clarification');
    }

    return {
      valid: issues.length === 0,
      issues,
      requiresClarification,
    };
  },
};

