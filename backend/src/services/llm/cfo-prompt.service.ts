/**
 * CFO-FOCUSED PROMPT SERVICE
 * Generates CFO-specific prompts that ensure:
 * - CFO-like thinking (strategic, analytical, risk-aware)
 * - No hallucinations (all numbers grounded in data)
 * - No repetition (varied responses)
 * - Proper financial reasoning
 */

import { llmClient, LLMRequest, LLMConfig } from './llm-client.service';
import { GroundingContext } from '../rag/grounding.service';
import prisma from '../../config/database';

export interface CFORecommendation {
  type: string;
  category: string;
  action: string;
  explain: string;
  impact: Record<string, any>;
  priority: 'high' | 'medium' | 'low';
  timeline: string;
  confidence: number;
  reasoning: string;
  assumptions: Record<string, any>;
  warnings: string[];
  evidence?: Array<{ doc_id: string; snippet: string }>;
  promptId?: string;
  dataSources?: Array<{ type: string; id: string; snippet: string }>;
}

export interface CFOAnalysis {
  intent: string;
  calculations?: Record<string, any>;
  recommendations: CFORecommendation[];
  scenarios?: {
    base?: any;
    upside?: any;
    downside?: any;
  };
  risks: string[];
  warnings: string[];
  naturalLanguage: string;
}

export interface CFOGeneratedResponse {
  recommendations: CFORecommendation[];
  naturalLanguage: string;
  risks: string[];
  warnings: string[];
  promptId?: string;
}

/**
 * Generate CFO-focused system prompt
 */
function getCFOSystemPrompt(): string {
  return `You are a highly analytical, strategic Chief Financial Officer (CFO). Your goal is to provide deep, data-driven financial insights and actionable strategies.

CORE PRINCIPLES:
1. DATA INTEGRITY: Only use the numbers provided in the 'AVAILABLE FINANCIAL DATA' and 'CALCULATED METRICS'. NEVER invent numbers.
2. CFO THINKING: Go beyond basic facts. Analyze trends, identify risks, and suggest strategic pivots. Think about runway, burn rate, unit economics (LTV/CAC), and capital efficiency.
3. VARIETY & QUALITY: Provide unique, insightful recommendations. Avoid generic or repetitive advice. Each response must feel fresh and specifically tailored to the current data.
4. ACTIONABILITY: Every recommendation must have a clear 'Impact' and 'Reasoning'.
5. SCENARIO AWARENESS: Consider best-case and worst-case scenarios in your analysis.

REPETITION PREVENTION:
- Do not repeat the same phrases across different recommendations.
- Do not suggest the same generic "reduce payroll" or "increase marketing" without specific context from the data.
- If data is limited, acknowledge it and provide the best possible estimate based on industry standards, but label it as such.

OUTPUT FORMAT:
Return a valid JSON object matching the requested schema. Ensure 'naturalLanguage' is sophisticated and professional.`;
}

/**
 * Generate CFO-focused recommendation prompt
 */
function getCFORecommendationPrompt(
  userQuery: string,
  groundingContext: GroundingContext,
  intent: string,
  calculations?: Record<string, any>
): string {
  const evidenceSummary = groundingContext.evidence
    .map((e, i) => `${i + 1}. ${e.doc_type}: ${e.content.substring(0, 200)}...`)
    .join('\n');

  const calculationsSummary = calculations
    ? Object.entries(calculations)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n')
    : 'No calculations available';

  return `As a CFO, analyze this financial question and provide strategic recommendations.

USER QUESTION: "${userQuery}"

INTENT: ${intent}

AVAILABLE FINANCIAL DATA:
${evidenceSummary}

CALCULATED METRICS:
${calculationsSummary}

CURRENT FINANCIAL STATE:
${JSON.stringify(groundingContext.model_state || {}, null, 2)}

YOUR TASK:
1. Analyze the question from a CFO perspective
2. Use ONLY the provided data - do not invent numbers
3. Generate 3-5 strategic recommendations that:
   - Are varied and non-repetitive
   - Are grounded in the financial data
   - Include clear impact metrics
   - Consider risks and trade-offs
   - Are actionable with timelines
4. Provide CFO-level reasoning for each recommendation
5. Identify risks and warnings

OUTPUT JSON SCHEMA:
{
  "recommendations": [
    {
      "type": "string",
      "category": "string",
      "action": "string",
      "explain": "string",
      "impact": { "key_metric": "value" },
      "priority": "high|medium|low",
      "timeline": "string",
      "confidence": number,
      "reasoning": "string",
      "assumptions": {},
      "warnings": []
    }
  ],
  "naturalLanguage": "Professional summary answering the user query",
  "risks": ["Risk 1", "Risk 2"],
  "warnings": ["Warning 1"]
}`;
}

/**
 * Generate a full CFO response (recommendations + natural language) in ONE Gemini call.
 */
export async function generateCFOResponse(
  userQuery: string,
  groundingContext: GroundingContext,
  intent: string,
  calculations?: Record<string, any>,
  config?: LLMConfig,
  orgId?: string,
  userId?: string
): Promise<CFOGeneratedResponse> {
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
    return { recommendations: [], naturalLanguage: 'AI CFO service currently unavailable.', risks: [], warnings: [] };
  }

  try {
    const systemPrompt = getCFOSystemPrompt();
    const userPrompt = getCFORecommendationPrompt(userQuery, groundingContext, intent, calculations);

    const request: LLMRequest = {
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 1500,
      topP: 0.95,
    };

    let savedPromptId: string | undefined;
    if (orgId && userId) {
      try {
        const savedPrompt = await prisma.prompt.create({
          data: {
            orgId,
            userId,
            promptTemplate: systemPrompt,
            renderedPrompt: userPrompt,
            provider: llmConfig.provider,
            modelUsed: llmConfig.model || 'gemini-2.0-flash-exp',
            cached: false,
          },
        });
        savedPromptId = savedPrompt.id;
      } catch (err) {
        console.warn('Failed to save prompt:', err);
      }
    }

    const response = await llmClient.call(request, llmConfig);

    if (savedPromptId && response.usage) {
      await prisma.prompt.update({
        where: { id: savedPromptId },
        data: {
          responseText: response.content,
          tokensUsed: response.usage.total_tokens || undefined,
        },
      }).catch(err => console.warn('Failed to update prompt:', err));
    }

    let parsed: any;
    try {
      const raw = (response.content || '').trim();
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1) throw new Error('No JSON found');
      parsed = JSON.parse(raw.slice(firstBrace, lastBrace + 1));
    } catch (err) {
      console.error('Failed to parse Gemini response:', err);
      return { recommendations: [], naturalLanguage: 'Failed to generate financial analysis.', risks: [], warnings: [] };
    }

    const recommendations = (parsed.recommendations || []).map((rec: any) => ({
      ...rec,
      confidence: typeof rec.confidence === 'number' ? rec.confidence : 0.7,
      promptId: savedPromptId,
    }));

    return {
      recommendations,
      naturalLanguage: parsed.naturalLanguage || 'Analysis complete.',
      risks: parsed.risks || [],
      warnings: parsed.warnings || [],
      promptId: savedPromptId,
    };
  } catch (error: any) {
    console.error('CFO Response generation failed:', error.message);
    return { recommendations: [], naturalLanguage: 'Error generating response.', risks: [], warnings: [] };
  }
}

/**
 * Helper to remove duplicates
 */
function removeDuplicates(recs: CFORecommendation[]): CFORecommendation[] {
  const seen = new Set();
  return recs.filter(r => {
    const key = `${r.type}:${r.action}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Generate CFO-style natural language explanation (Legacy fallback)
 */
export async function generateCFOExplanation(
  userQuery: string,
  analysis: CFOAnalysis,
  config?: LLMConfig
): Promise<string> {
  // Simplified version for speed
  return analysis.naturalLanguage || 'Strategic assessment complete.';
}
