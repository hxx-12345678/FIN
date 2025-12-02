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
import { financialCalculations } from '../financial-calculations.service';
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
  promptId?: string; // AUDITABILITY: Link to exact prompt used
  dataSources?: Array<{ type: string; id: string; snippet: string }>; // AUDITABILITY: Exact data sources
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

/**
 * Generate CFO-focused system prompt
 */
function getCFOSystemPrompt(): string {
  return `You are an experienced Chief Financial Officer (CFO) with 20+ years of experience in financial planning, analysis, and strategic decision-making.

YOUR CORE RESPONSIBILITIES:
1. Provide strategic financial insights, not just facts
2. Think like a CFO: analyze risk, consider trade-offs, prioritize actions
3. Ground all numbers in provided data - NEVER invent or hallucinate numbers
4. Provide varied, non-repetitive recommendations
5. Explain your reasoning transparently
6. Consider multiple scenarios (base, upside, downside)
7. Identify risks and provide warnings

YOUR THINKING PROCESS:
- Always start with data validation
- Calculate metrics using provided formulas
- Consider strategic implications, not just tactical
- Think about cash flow, runway, burn rate, unit economics
- Consider market conditions, competitive landscape
- Provide actionable recommendations with clear impact
- Explain trade-offs and risks

CRITICAL RULES:
1. NEVER invent numbers - only use provided data or calculated values
2. NEVER repeat the same recommendation verbatim
3. ALWAYS explain your reasoning
4. ALWAYS consider multiple scenarios
5. ALWAYS identify risks and provide warnings
6. ALWAYS ground recommendations in financial data

OUTPUT FORMAT:
You must respond with valid JSON matching the required schema.`;
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
      "type": "string (e.g., 'reduce_expenses', 'increase_revenue', 'optimize_cash')",
      "category": "string (e.g., 'opEx', 'revenue', 'cash_management')",
      "action": "string (brief action description)",
      "explain": "string (CFO-level explanation with reasoning)",
      "impact": {
        "key_metric": "numeric value",
        "timeframe": "string"
      },
      "priority": "high|medium|low",
      "timeline": "string (e.g., '30_days', 'immediate')",
      "confidence": 0.0-1.0,
      "reasoning": "string (step-by-step CFO reasoning)",
      "assumptions": {},
      "warnings": ["string"]
    }
  ],
  "risks": ["string"],
  "warnings": ["string"],
  "naturalLanguage": "string (CFO-style explanation in natural language)"
}

CRITICAL: 
- Do NOT repeat recommendations
- Do NOT invent numbers
- Do NOT use generic responses
- Think strategically like a CFO
- Ground everything in data`;
}

/**
 * Generate CFO-focused calculation explanation prompt
 */
function getCFOCalculationPrompt(
  userQuery: string,
  calculationResult: any,
  formula: string
): string {
  return `As a CFO, explain this financial calculation to the user.

USER QUESTION: "${userQuery}"

CALCULATION RESULT:
${JSON.stringify(calculationResult, null, 2)}

FORMULA USED: ${formula}

YOUR TASK:
Provide a CFO-level explanation that:
1. Explains what the calculation means in business terms
2. Provides context and implications
3. Identifies any risks or concerns
4. Suggests next steps if applicable

OUTPUT JSON:
{
  "explanation": "string (CFO-style natural language explanation)",
  "implications": ["string"],
  "risks": ["string"],
  "nextSteps": ["string"]
}`;
}

/**
 * Generate CFO recommendations using Gemini
 * AUDITABILITY: Saves prompts to database and links to recommendations
 */
export async function generateCFORecommendations(
  userQuery: string,
  groundingContext: GroundingContext,
  intent: string,
  calculations?: Record<string, any>,
  config?: LLMConfig,
  orgId?: string,
  userId?: string
): Promise<CFORecommendation[]> {
  const llmConfig: LLMConfig = config || {
    provider: (process.env.LLM_PROVIDER as any) || (process.env.GEMINI_API_KEY ? 'gemini' : 'fallback'),
    apiKey: process.env.GEMINI_API_KEY || process.env.LLM_API_KEY,
    model: process.env.GEMINI_MODEL || process.env.LLM_MODEL || 'gemini-2.0-flash-exp',
  };

  // If no API key, return empty (fallback will be used)
  if (!llmConfig.apiKey || llmConfig.provider === 'fallback') {
    console.log('CFO Prompt Service: No Gemini API key, using fallback');
    return [];
  }

  try {
    const systemPrompt = getCFOSystemPrompt();
    const userPrompt = getCFORecommendationPrompt(userQuery, groundingContext, intent, calculations);

    const request: LLMRequest = {
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.7, // Higher temperature for varied responses
      maxTokens: 2000,
    };

    // AUDITABILITY: Save prompt to database before making LLM call
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
      } catch (error: any) {
        console.warn('Failed to save prompt for auditability:', error.message);
        // Continue even if prompt save fails
      }
    }

    let response;
    try {
      response = await llmClient.call(request, llmConfig);
      
      // AUDITABILITY: Update prompt with response and token usage
      if (savedPromptId && response.usage) {
        try {
          await prisma.prompt.update({
            where: { id: savedPromptId },
            data: {
              responseText: response.content,
              tokensUsed: response.usage.total_tokens || undefined,
            },
          });
        } catch (error: any) {
          console.warn('Failed to update prompt with response:', error.message);
        }
      }
    } catch (error: any) {
      // Handle rate limits and other API errors gracefully
      if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
        console.warn('Gemini API rate limit/quota exceeded, using fallback');
      } else {
        console.error('Gemini API call failed:', error.message);
      }
      
      // AUDITABILITY: Update prompt with error if saved
      if (savedPromptId) {
        try {
          await prisma.prompt.update({
            where: { id: savedPromptId },
            data: {
              responseText: `ERROR: ${error.message?.substring(0, 500) || 'Unknown error'}`,
            },
          });
        } catch (updateError: any) {
          console.warn('Failed to update prompt with error:', updateError.message);
        }
      }
      
      return [];
    }
    
    // Parse JSON response
    let parsed: any;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      console.error('Response content:', response.content?.substring(0, 500) || 'No content');
      return [];
    }

    // Validate and transform recommendations
    const recommendations: CFORecommendation[] = [];
    
    if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
      for (const rec of parsed.recommendations) {
        // Validate required fields
        if (!rec.type || !rec.action || !rec.explain) {
          continue;
        }

        // Ensure impact is an object
        if (!rec.impact || typeof rec.impact !== 'object') {
          rec.impact = {};
        }

        // Validate confidence
        let confidence = typeof rec.confidence === 'number' ? rec.confidence : 0.7;
        confidence = Math.max(0, Math.min(1, confidence));

        // AUDITABILITY: Build data sources from evidence and calculations
        const dataSources: Array<{ type: string; id: string; snippet: string }> = [];
        
        // Add evidence as data sources
        groundingContext.evidence.slice(0, 3).forEach(e => {
          dataSources.push({
            type: 'evidence',
            id: e.doc_id,
            snippet: e.content.substring(0, 150),
          });
        });
        
        // Add calculations as data sources
        if (calculations) {
          Object.entries(calculations).forEach(([key, value]) => {
            dataSources.push({
              type: 'calculation',
              id: key,
              snippet: `${key}: ${JSON.stringify(value)}`,
            });
          });
        }

        recommendations.push({
          type: rec.type,
          category: rec.category || 'general',
          action: rec.action,
          explain: rec.explain,
          impact: rec.impact,
          priority: ['high', 'medium', 'low'].includes(rec.priority) ? rec.priority : 'medium',
          timeline: rec.timeline || '30_days',
          confidence,
          reasoning: rec.reasoning || rec.explain,
          assumptions: rec.assumptions || {},
          warnings: Array.isArray(rec.warnings) ? rec.warnings : [],
          evidence: groundingContext.evidence.slice(0, 3).map(e => ({
            doc_id: e.doc_id,
            snippet: e.content.substring(0, 150),
          })),
          promptId: savedPromptId, // AUDITABILITY: Link to exact prompt
          dataSources, // AUDITABILITY: Exact data sources used
        });
      }
    }

    // Remove duplicates based on action signature
    const uniqueRecommendations = removeDuplicates(recommendations);

    return uniqueRecommendations;
  } catch (error: any) {
    console.error('CFO recommendation generation failed:', error.message);
    return [];
  }
}

/**
 * Generate CFO-style natural language explanation
 */
export async function generateCFOExplanation(
  userQuery: string,
  analysis: CFOAnalysis,
  config?: LLMConfig
): Promise<string> {
  const llmConfig: LLMConfig = config || {
    provider: (process.env.LLM_PROVIDER as any) || (process.env.GEMINI_API_KEY ? 'gemini' : 'fallback'),
    apiKey: process.env.GEMINI_API_KEY || process.env.LLM_API_KEY,
    model: process.env.GEMINI_MODEL || process.env.LLM_MODEL || 'gemini-2.0-flash-exp',
  };

  if (!llmConfig.apiKey || llmConfig.provider === 'fallback') {
    console.log('CFO Explanation Service: No Gemini API key, using fallback');
    return generateFallbackExplanation(analysis);
  }

  try {
    const systemPrompt = getCFOSystemPrompt();
    const userPrompt = `As a CFO, explain this financial analysis in natural language.

USER QUESTION: "${userQuery}"

ANALYSIS:
${JSON.stringify(analysis, null, 2)}

YOUR TASK:
Provide a clear, CFO-style explanation that:
1. Answers the user's question directly
2. Explains the reasoning and calculations
3. Highlights key recommendations
4. Mentions risks and warnings
5. Uses professional but accessible language
6. Is concise but comprehensive

OUTPUT: Plain text explanation (no JSON, no markdown)`;

    const request: LLMRequest = {
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.6,
      maxTokens: 1000,
    };

    let response;
    try {
      response = await llmClient.call(request, llmConfig);
      return response.content.trim();
    } catch (error: any) {
      // Handle rate limits and other API errors gracefully
      if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
        console.warn('Gemini API rate limit/quota exceeded, using fallback explanation');
      } else {
        console.error('CFO explanation generation failed:', error.message);
      }
      return generateFallbackExplanation(analysis);
    }
  } catch (error: any) {
    // Outer catch for any unexpected errors
    console.error('CFO explanation generation failed:', error.message);
    return generateFallbackExplanation(analysis);
  }
}

/**
 * Remove duplicate recommendations
 */
function removeDuplicates(recommendations: CFORecommendation[]): CFORecommendation[] {
  const seen = new Set<string>();
  const unique: CFORecommendation[] = [];

  for (const rec of recommendations) {
    // Create signature from type, category, and key impact values
    const impactKey = Object.keys(rec.impact)
      .sort()
      .map(k => `${k}:${rec.impact[k]}`)
      .join('|');
    const signature = `${rec.type}_${rec.category}_${impactKey}`.toLowerCase();

    if (!seen.has(signature)) {
      seen.add(signature);
      unique.push(rec);
    }
  }

  return unique;
}

/**
 * Generate fallback explanation when LLM unavailable
 */
function generateFallbackExplanation(analysis: CFOAnalysis): string {
  let explanation = `Based on the financial analysis, `;

  if (analysis.calculations) {
    const calcEntries = Object.entries(analysis.calculations);
    if (calcEntries.length > 0) {
      explanation += `the calculated metrics show: ${calcEntries.map(([k, v]) => `${k} = ${v}`).join(', ')}. `;
    }
  }

  if (analysis.recommendations.length > 0) {
    explanation += `I recommend the following strategic actions: `;
    explanation += analysis.recommendations
      .slice(0, 3)
      .map((r, i) => `${i + 1}. ${r.action}: ${r.explain}`)
      .join(' ');
    explanation += '. ';
  }

  if (analysis.risks.length > 0) {
    explanation += `Key risks to consider: ${analysis.risks.join(', ')}. `;
  }

  if (analysis.warnings.length > 0) {
    explanation += `Warnings: ${analysis.warnings.join(', ')}.`;
  }

  return explanation;
}

