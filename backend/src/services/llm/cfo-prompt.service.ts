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

CRITICAL ANTI-HALLUCINATION RULES: 
- Do NOT repeat recommendations
- Do NOT invent numbers - ONLY use numbers from provided data
- Do NOT use generic responses
- If data is insufficient, explicitly state that and recommend connecting accounting system
- EVERY number in your response MUST be traceable to the provided data or calculations
- If you cannot calculate something from provided data, say "Insufficient data" rather than guessing
- Include evidence references for every numeric claim
- Think strategically like a CFO
- Ground everything in data
- Be transparent about data limitations

TRANSPARENCY REQUIREMENTS:
- Cite the source of every number used
- Show calculation steps for any computed values
- Indicate confidence levels
- List assumptions made`;
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
  const full = await generateCFOResponse(
    userQuery,
    groundingContext,
    intent,
    calculations,
    config,
    orgId,
    userId
  );
  return full.recommendations;
}

/**
 * Generate a full CFO response (recommendations + natural language) in ONE Gemini call.
 * This reduces rate-limit pressure compared to separate recommendation + explanation calls.
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
  // Support multiple API keys
  const apiKeys = [
    process.env.GEMINI_API_KEY_1?.trim(),
    process.env.GEMINI_API_KEY_2?.trim(),
    process.env.GEMINI_API_KEY?.trim(),
    process.env.LLM_API_KEY?.trim(),
  ].filter(Boolean) as string[];

  const llmConfig: LLMConfig = config || {
    provider: (process.env.LLM_PROVIDER as any) || (apiKeys.length > 0 ? 'gemini' : 'fallback'),
    apiKey: apiKeys[0], // Use first available key
    model: process.env.GEMINI_MODEL || process.env.LLM_MODEL || 'gemini-2.5-flash',
  };

  // If no API key, return empty (fallback will be used)
  if (!llmConfig.apiKey || llmConfig.provider === 'fallback' || apiKeys.length === 0) {
    console.log('CFO Prompt Service: No Gemini API key, using fallback');
    return { recommendations: [], naturalLanguage: '', risks: [], warnings: [] };
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
      
      return { recommendations: [], naturalLanguage: '', risks: [], warnings: [] };
    }
    
    // Parse JSON response (be robust to leading/trailing text)
    let parsed: any;
    try {
      const raw = (response.content || '').trim();
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error('No JSON object delimiters found in response');
      }
      const jsonText = raw.slice(firstBrace, lastBrace + 1);
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      console.error('Response content:', response.content?.substring(0, 500) || 'No content');
      return { recommendations: [], naturalLanguage: '', risks: [], warnings: [] };
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

    // Extract naturalLanguage - handle both direct string and nested JSON
    let naturalLanguage = '';
    if (typeof parsed.naturalLanguage === 'string') {
      naturalLanguage = parsed.naturalLanguage.trim();
      // If it's a JSON string, parse it
      if (naturalLanguage.startsWith('{') && naturalLanguage.includes('naturalLanguage')) {
        try {
          const nested = JSON.parse(naturalLanguage);
          naturalLanguage = typeof nested.naturalLanguage === 'string' ? nested.naturalLanguage : naturalLanguage;
        } catch {
          // If parsing fails, use as-is
        }
      }
    } else if (parsed.naturalLanguage && typeof parsed.naturalLanguage === 'object') {
      // Extract text from object, don't stringify
      if (typeof parsed.naturalLanguage.naturalLanguage === 'string') {
        naturalLanguage = parsed.naturalLanguage.naturalLanguage;
      } else if (typeof parsed.naturalLanguage.text === 'string') {
        naturalLanguage = parsed.naturalLanguage.text;
      } else if (typeof parsed.naturalLanguage.content === 'string') {
        naturalLanguage = parsed.naturalLanguage.content;
      } else {
        // Last resort: try to find any string property
        const stringProps = Object.values(parsed.naturalLanguage).filter(v => typeof v === 'string');
        naturalLanguage = stringProps.length > 0 ? (stringProps[0] as string) : '';
      }
    }

    // Final safety check: ensure naturalLanguage is always a string, never JSON
    if (!naturalLanguage || typeof naturalLanguage !== 'string') {
      // If we have recommendations, build a basic explanation from them
      if (uniqueRecommendations.length > 0) {
        naturalLanguage = `Based on your financial data, I've identified ${uniqueRecommendations.length} strategic recommendation${uniqueRecommendations.length > 1 ? 's' : ''}:\n\n`;
        uniqueRecommendations.slice(0, 3).forEach((rec, idx) => {
          naturalLanguage += `${idx + 1}. ${rec.action}\n   ${rec.explain}\n\n`;
        });
      } else {
        naturalLanguage = 'I\'ve analyzed your financial data. Please check the recommendations tab for detailed insights.';
      }
    }
    
    // One more check: if naturalLanguage looks like JSON, try to extract text
    if (naturalLanguage.trim().startsWith('{') && naturalLanguage.includes('"')) {
      try {
        const testParse = JSON.parse(naturalLanguage);
        if (testParse.naturalLanguage && typeof testParse.naturalLanguage === 'string') {
          naturalLanguage = testParse.naturalLanguage;
        } else if (testParse.text && typeof testParse.text === 'string') {
          naturalLanguage = testParse.text;
        } else if (testParse.content && typeof testParse.content === 'string') {
          naturalLanguage = testParse.content;
        }
      } catch {
        // If it's not valid JSON or extraction fails, use as-is
      }
    }

    return {
      recommendations: uniqueRecommendations,
      naturalLanguage: naturalLanguage,
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      promptId: savedPromptId,
    };
  } catch (error: any) {
    console.error('CFO recommendation generation failed:', error.message);
    return { recommendations: [], naturalLanguage: '', risks: [], warnings: [] };
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
  // Support multiple API keys
  const apiKeys = [
    process.env.GEMINI_API_KEY_1?.trim(),
    process.env.GEMINI_API_KEY_2?.trim(),
    process.env.GEMINI_API_KEY?.trim(),
    process.env.LLM_API_KEY?.trim(),
  ].filter(Boolean) as string[];

  const llmConfig: LLMConfig = config || {
    provider: (process.env.LLM_PROVIDER as any) || (apiKeys.length > 0 ? 'gemini' : 'fallback'),
    apiKey: apiKeys[0], // Use first available key
    model: process.env.GEMINI_MODEL || process.env.LLM_MODEL || 'gemini-2.5-flash',
  };

  if (!llmConfig.apiKey || llmConfig.provider === 'fallback' || apiKeys.length === 0) {
    console.log('CFO Explanation Service: No Gemini API key, using fallback');
    return generateFallbackExplanation(analysis, userQuery);
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
      return generateFallbackExplanation(analysis, userQuery);
    }
  } catch (error: any) {
    // Outer catch for any unexpected errors
    console.error('CFO explanation generation failed:', error.message);
    return generateFallbackExplanation(analysis, userQuery);
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
 * Makes it question-specific and uses real financial data
 */
function generateFallbackExplanation(analysis: CFOAnalysis, userQuery?: string): string {
  const query = (userQuery || '').toLowerCase().trim();
  let explanation = '';
  
  // Start with CFO-level professional opening
  const cfoOpenings = [
    'As your CFO, ',
    'From a financial leadership perspective, ',
    'From a CFO standpoint, ',
    'Analyzing your financial position, ',
    'From a strategic financial perspective, ',
    'Reviewing your company\'s financial health, ',
    'Based on my analysis of your balance sheet and cash flow, ',
    'Looking at your current growth trajectory and efficiency, ',
  ];
  const randomOpening = cfoOpenings[Math.floor(Math.random() * cfoOpenings.length)];

  // Handle special queries that don't need recommendations
  if (query.includes('view') && (query.includes('staged') || query.includes('change') || query.includes('recommendation'))) {
    // User wants to see existing staged changes, not generate new ones
    if (analysis.recommendations.length > 0) {
      explanation = `${randomOpening}here are your current staged changes and recommendations:\n\n`;
      explanation += `**Current Recommendations:**\n\n`;
      analysis.recommendations.slice(0, 5).forEach((r, i) => {
        explanation += `${i + 1}. **${r.action}** (${r.priority} priority)\n`;
        explanation += `   ${r.explain || r.reasoning || 'Based on financial analysis'}\n`;
        if (r.impact && Object.keys(r.impact).length > 0) {
          const impactText = Object.entries(r.impact)
            .filter(([_, v]) => v !== null && v !== undefined)
            .slice(0, 2)
            .map(([k, v]) => {
              const key = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              return typeof v === 'number' 
                ? (k.includes('month') || k.includes('runway') ? `${key}: ${v.toFixed(1)} months`
                  : k.includes('percent') || k.includes('rate') ? `${key}: ${(v * 100).toFixed(1)}%`
                  : `${key}: $${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`)
                : `${key}: ${v}`;
            })
            .join(', ');
          explanation += `   *Expected Impact: ${impactText}*\n`;
        }
        explanation += `\n`;
      });
      explanation += `\n💡 **Tip:** You can review and apply these recommendations in the "Staged Changes" tab.`;
    } else {
      explanation = `${randomOpening}there are currently no staged changes. Ask me a financial question to generate recommendations, such as:\n\n`;
      explanation += `- "What is my cash runway?"\n`;
      explanation += `- "How can I reduce my burn rate?"\n`;
      explanation += `- "What are my key financial metrics?"\n`;
    }
    return explanation.trim();
  }

  if (query.includes('task') && (query.includes('create') || query.includes('show') || query.includes('view'))) {
    explanation = `${randomOpening}to create tasks from recommendations, please use the "Create Task from Recommendation" button on any recommendation, or review the "Tasks" tab to see existing tasks.`;
    return explanation.trim();
  }

  if (query.includes('metric') || query.includes('kpi') || query.includes('key performance')) {
    // Show key metrics
    if (analysis.calculations && Object.keys(analysis.calculations).length > 0) {
      explanation = `${randomOpening}here are your key financial metrics:\n\n`;
      Object.entries(analysis.calculations)
        .filter(([k]) => !k.includes('operation') && !k.includes('calculated_'))
        .slice(0, 6)
        .forEach(([k, v]) => {
          const key = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const value = typeof v === 'number' 
            ? (k.includes('month') || k.includes('runway')
                ? `${v.toFixed(1)} months`
                : k.includes('percent') || k.includes('rate') || k.includes('growth')
                ? `${(v * 100).toFixed(1)}%`
                : `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`)
            : v;
          explanation += `- **${key}:** ${value}\n`;
        });
      explanation += `\n💡 **Tip:** Connect your accounting system for real-time metrics.`;
    } else {
      explanation = `${randomOpening}I don't have sufficient financial data to show metrics. Please connect your accounting system for accurate metrics.`;
    }
    return explanation.trim();
  }

  // Question-specific opening based on intent - ALWAYS provide actual data if available
  if (query.includes('runway') || query.includes('cash') || query.includes('survive') || query.includes('how long')) {
    if (analysis.calculations?.runway || analysis.calculations?.runwayMonths) {
      const runway = analysis.calculations.runway || analysis.calculations.runwayMonths;
      explanation = `Your current cash runway is approximately ${typeof runway === 'number' ? runway.toFixed(1) : runway} months. `;
    } else if (analysis.recommendations.length > 0) {
      // Extract runway from evidence if available (evidence can be strings or objects)
      const allEvidence = analysis.recommendations.flatMap(r => {
        const ev = r.evidence || [];
        return ev.map((e: any) => typeof e === 'string' ? e : e.snippet || e.content || String(e));
      });
      
      // Try to find runway in evidence
      let runwayValue: string | null = null;
      const runwayEvidence = allEvidence.find((e: string) => e.includes('Runway:') || e.includes('runway') || e.includes('months'));
      if (runwayEvidence) {
        // Try multiple patterns
        const match1 = runwayEvidence.match(/(\d+\.?\d*)\s*months?/i);
        const match2 = runwayEvidence.match(/Runway:\s*(\d+\.?\d*)/i);
        const match3 = runwayEvidence.match(/(\d+\.?\d*)\s*m\b/i);
        runwayValue = match1?.[1] || match2?.[1] || match3?.[1] || null;
      }
      
      // If not in evidence, try to extract from action - check ALL recommendations
      if (!runwayValue) {
        for (const r of analysis.recommendations) {
          const actionText = r.action || '';
          if (actionText.toLowerCase().includes('runway') || actionText.toLowerCase().includes('months')) {
          const actionMatch = actionText.match(/(\d+\.?\d*)\s*months?/i);
          if (actionMatch) {
            runwayValue = actionMatch[1];
            break;
          }
          }
        }
      }
      
      // If still not found, try to extract from explain field
      if (!runwayValue) {
        const runwayExplain = analysis.recommendations.find(r => 
          r.explain?.includes('runway') || r.explain?.includes('months')
        );
        if (runwayExplain?.explain) {
          const explainMatch = runwayExplain.explain.match(/(\d+\.?\d*)\s*months?/i);
          if (explainMatch) {
            runwayValue = explainMatch[1];
          }
        }
      }
      
      if (runwayValue) {
        explanation = `${randomOpening}your current cash runway is approximately ${runwayValue} months. `;
      } else {
        explanation = `${randomOpening}I've analyzed your cash runway based on your current financial position. `;
      }
    } else {
      explanation = `${randomOpening}I've analyzed your cash runway based on your current financial position. `;
    }
  } else if (query.includes('burn rate') || query.includes('burn')) {
    if (analysis.calculations?.burnRate) {
      const burn = analysis.calculations.burnRate;
      explanation = `${randomOpening}your monthly burn rate is $${typeof burn === 'number' ? burn.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : burn}. `;
    } else if (analysis.recommendations.length > 0) {
      // Extract burn rate from evidence if available (evidence can be strings or objects)
      const evidence = analysis.recommendations[0].evidence || [];
      const evidenceStrings = evidence.map((e: any) => typeof e === 'string' ? e : e.snippet || e.content || String(e));
      const burnMatch = evidenceStrings.find((e: string) => e.includes('Burn Rate:') || e.includes('burn') || e.includes('Burn:'));
      if (burnMatch) {
        const burnValue = burnMatch.match(/\$([\d,]+)/)?.[1] || 'N/A';
        explanation = `${randomOpening}your current monthly burn is approximately $${burnValue}. `;
      } else {
        // Try to extract from action
        const burnAction = analysis.recommendations.find(r => r.action?.includes('burn') || r.action?.includes('Burn'));
        if (burnAction?.action) {
          const actionMatch = burnAction.action.match(/\$([\d,]+)/);
          if (actionMatch) {
            explanation = `${randomOpening}your monthly burn rate is approximately $${actionMatch[1]}. `;
          } else {
            explanation = `${randomOpening}I've analyzed your burn rate. `;
          }
        } else {
          explanation = `${randomOpening}I've analyzed your burn rate. `;
        }
      }
    } else {
      explanation = `${randomOpening}I've analyzed your burn rate. `;
    }
  } else if (query.includes('fundraising') || query.includes('raise funding') || query.includes('raise capital')) {
    explanation = `${randomOpening}from a fundraising readiness perspective, `;
  } else if (query.includes('cost') && (query.includes('optimize') || query.includes('reduce') || query.includes('cut'))) {
    explanation = `${randomOpening}for cost optimization, `;
  } else if (query.includes('revenue') && (query.includes('growth') || query.includes('increase') || query.includes('accelerate'))) {
    explanation = `${randomOpening}to accelerate revenue growth, `;
  } else if (query.includes('extend') && query.includes('runway')) {
    explanation = `${randomOpening}to extend your runway, `;
  } else if (query.includes('what') || query.includes('tell me') || query.includes('explain')) {
    // Generic "what" questions - provide relevant data
    if (analysis.calculations && Object.keys(analysis.calculations).length > 0) {
      explanation = `${randomOpening}based on your financial data:\n\n`;
      Object.entries(analysis.calculations)
        .filter(([k]) => !k.includes('operation') && !k.includes('calculated_'))
        .slice(0, 4)
        .forEach(([k, v]) => {
          const key = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const value = typeof v === 'number' 
            ? (k.includes('month') || k.includes('runway')
                ? `${v.toFixed(1)} months`
                : k.includes('percent') || k.includes('rate') || k.includes('growth')
                ? `${(v * 100).toFixed(1)}%`
                : `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`)
            : v;
          explanation += `- **${key}:** ${value}\n`;
        });
    } else {
      explanation = `${randomOpening}I need more financial data to answer your question. Please connect your accounting system for accurate insights.`;
      return explanation.trim();
    }
  } else {
    // Default: Answer the specific question asked
    explanation = `${randomOpening}to answer your question "${userQuery || 'about your finances'}", `;
    
    // Add relevant calculations if available
    if (analysis.calculations && Object.keys(analysis.calculations).length > 0) {
      const relevantCalcs = Object.entries(analysis.calculations)
        .filter(([k]) => !k.includes('operation') && !k.includes('calculated_'))
        .slice(0, 2);
      
      if (relevantCalcs.length > 0) {
        const calcText = relevantCalcs.map(([k, v]) => {
          const key = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          if (typeof v === 'number') {
            if (k.includes('month') || k.includes('runway')) {
              return `${key}: ${v.toFixed(1)} months`;
            } else if (k.includes('percent') || k.includes('rate') || k.includes('growth')) {
              return `${key}: ${(v * 100).toFixed(1)}%`;
            } else {
              return `${key}: $${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            }
          }
          return `${key}: ${v}`;
        }).join(', ');
        explanation += `here are the key metrics: ${calcText}. `;
      }
    }
  }

  // Only add recommendations if the query is asking for advice/strategic input
  // Don't add recommendations for simple informational queries
  const isAskingForAdvice = query.includes('how') || query.includes('should') || query.includes('recommend') || 
                            query.includes('what should') || query.includes('what can') || query.includes('suggest') ||
                            query.includes('optimize') || query.includes('improve') || query.includes('reduce') ||
                            query.includes('increase') || query.includes('extend') || query.length < 20; // Short queries likely asking for recommendations

  if (isAskingForAdvice && analysis.recommendations.length > 0) {
    explanation += `\n\n**Strategic Recommendations:**\n\n`;
    
    // Filter recommendations based on query relevance
    let relevantRecs = analysis.recommendations;
    if (query.includes('revenue') || query.includes('growth')) {
      relevantRecs = analysis.recommendations.filter(r => 
        r.category?.includes('revenue') || r.type?.includes('revenue') || r.action?.toLowerCase().includes('revenue')
      );
    } else if (query.includes('cost') || query.includes('burn') || query.includes('expense')) {
      relevantRecs = analysis.recommendations.filter(r => 
        r.category?.includes('cost') || r.type?.includes('cost') || r.action?.toLowerCase().includes('cost') ||
        r.category?.includes('burn') || r.action?.toLowerCase().includes('burn')
      );
    } else if (query.includes('runway') || query.includes('cash')) {
      relevantRecs = analysis.recommendations.filter(r => 
        r.category?.includes('cash') || r.type?.includes('runway') || r.action?.toLowerCase().includes('runway') ||
        r.action?.toLowerCase().includes('cash')
      );
    }
    
    // Use filtered recommendations or fall back to all
    const recsToShow = (relevantRecs.length > 0 ? relevantRecs : analysis.recommendations).slice(0, 3);
    
    recsToShow.forEach((r, i) => {
      explanation += `${i + 1}. **${r.action}** (${r.priority} priority)\n`;
      explanation += `   ${r.explain || r.reasoning || 'Based on financial analysis'}\n`;
      
      // Add impact if available
      if (r.impact && Object.keys(r.impact).length > 0) {
        const impactEntries = Object.entries(r.impact)
          .filter(([_, v]) => v !== null && v !== undefined)
          .slice(0, 2);
        if (impactEntries.length > 0) {
          const impactText = impactEntries.map(([k, v]) => {
            const key = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (typeof v === 'number') {
              if (k.includes('month') || k.includes('runway')) {
                return `${key}: ${v.toFixed(1)} months`;
              } else if (k.includes('percent') || k.includes('rate')) {
                return `${key}: ${(v * 100).toFixed(1)}%`;
              } else {
                return `${key}: $${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              }
            }
            return `${key}: ${v}`;
          }).join(', ');
          explanation += `   *Expected Impact: ${impactText}*\n`;
        }
      }
      
      explanation += `\n`;
    });
  }

  // Add risks if available
  if (analysis.risks.length > 0) {
    explanation += `\n**Key Risks:** ${analysis.risks.slice(0, 2).join(', ')}.`;
  }

  return explanation.trim() || 'I\'ve analyzed your financial situation and prepared strategic recommendations. Please review the staged changes tab for detailed action items.';
}

