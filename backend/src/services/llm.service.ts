import 'dotenv/config';
import fetch from 'node-fetch';

/**
 * LLM Service for high-performance AI operations in Node.js
 * Used for intent classification, narrative synthesis, and strategic reasoning.
 */
class LlmService {
    private apiKeys: string[] = [];
    private model: string; // Declare model here

    constructor() {
        // Load primary keys
        if (process.env.GEMINI_API_KEY) this.apiKeys.push(process.env.GEMINI_API_KEY);

        // Load indexed keys for high availability (up to 9)
        for (let i = 1; i <= 9; i++) {
            const key = process.env[`GEMINI_API_KEY_${i}`];
            if (key) {
                if (!this.apiKeys.includes(key)) this.apiKeys.push(key);
            }
        }

        // Use model from env or current best default
        this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

        console.info(`[LlmService] Initialized with model: ${this.model} and ${this.apiKeys.length} keys`);
        if (this.apiKeys.length === 0) {
            console.error('[LlmService] CRITICAL: No Gemini API keys found in .env!');
        }
    }

    /**
     * Complete a prompt using Gemini
     */
    async complete(systemPrompt: string, userPrompt: string, jsonMode = false): Promise<string> {
        if (this.apiKeys.length === 0) {
            throw new Error('No Gemini API keys found in environment');
        }

        let lastError: any = null;

        // Try keys in sequence
        for (const key of this.apiKeys) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${key}`;
                console.debug(`[LlmService] Calling URL: ${url.replace(key, 'REDACTED')}`);

                const payload = {
                    contents: [{
                        parts: [{
                            text: `${systemPrompt}\n\nUser Request: ${userPrompt}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1, // Lower temperature for consistent financial analysis
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: 8192, // Increased for deep reports
                        responseMimeType: jsonMode ? "application/json" : "text/plain"
                    }
                };

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errText = await response.text();
                    console.warn(`[LlmService] Gemini API error (status ${response.status}): ${errText}`);
                    lastError = `Gemini API error (status ${response.status}): ${errText}`;
                    continue;
                }

                const data = await response.json() as any;
                const candidate = data.candidates?.[0];
                const content = candidate?.content;
                const finishReason = candidate?.finishReason;

                if (content && content.parts) {
                    const text = content.parts.map((p: any) => p.text || '').join('');
                    if (text) {
                        console.debug(`[LlmService] Gemini returned ${text.length} chars. Finish Reason: ${finishReason}`);
                        if (text.length < 500) {
                            console.debug(`[LlmService] Unexpectedly short response. Full data: ${JSON.stringify(data)}`);
                        }
                        return text;
                    }
                }

                if (data) {
                    console.warn(`Gemini API response missing text content, but data received: ${JSON.stringify(data).substring(0, 200)}`);
                    lastError = `Gemini API response missing text content.`;
                }
            } catch (error: any) {
                console.warn(`LlmService error with key: ${error.message}`);
                lastError = error.message;
            }
        }

        throw new Error(`All LLM attempts failed. Last error: ${lastError}`);
    }

    /**
     * Synthesize multiple agent outputs into a professional CFO report
     */
    async synthesizeCfoReport(
        query: string,
        agentOutputs: string[],
        calculations: Record<string, number>
    ): Promise<string> {
        const currentDate = new Date().toLocaleDateString();
        const systemPrompt = `You are a world-class strategic CFO at a high-growth company. 
Current Date: ${currentDate}

Your task is to synthesize multiple specialized financial agent reports into a single, cohesive, professional executive report in response to the user's query.

CORE PRINCIPLES:
1. PROFESSIONAL TONE: Write like a seasoned CFO speaking to a CEO/Founder. Be authoritative yet objective.
2. INTEGRATION: Don't just list what agents said. Connect the dots. If the Analytics agent reports a variance, explain how that links to the Treasury agent's runway calculations.
3. STRATEGIC DEPTH: Go beyond the numbers. Provide "Better than CFO" level reasoning. Identify implicit risks and opportunities.
4. FORMATTING: Use clean Markdown with clear headers (H2, H3), bolding for emphasis, and tables for data where it adds clarity.
5. DATA CITATION: Explicitly use the provided calculations (Revenue, Burn, Runway, EBITDA) in your narrative.
6. COMPREHENSIVENESS: A short report is a failed report. Provide deep, thorough analysis of at least 1500 words if necessary to be exhaustive.

Structure your response with:
- CFO EXECUTIVE SUMMARY (High-level takeaways)
- FINANCIAL HEALTH ASSESSMENT (Integrated numbers analysis)
- STRATEGIC INSIGHTS & DRIVERS (The "Why" behind the numbers)
- ACTIONABLE RECOMMENDATIONS (Prioritized list)
- RISK & SENSITIVITY ANALYSIS (What could go wrong)`;

        const userPrompt = `
User Query: "${query}"

AGENT OUTPUTS:
${agentOutputs.join('\n\n---\n\n')}

FINANCIAL CALCULATIONS:
${JSON.stringify(calculations, null, 2)}

Provide a synthesized, integrated CFO report. BE EXHAUSTIVE AND STRATEGIC.`;

        try {
            const outputsCombined = agentOutputs.join('\n\n---\n\n');
            console.info(`[LlmService] Starting synthesis for query: ${query.substring(0, 30)}... Input length: ${outputsCombined.length} chars`);
            const startTime = Date.now();
            const result = await this.complete(systemPrompt, userPrompt);
            console.info(`[LlmService] Synthesis complete in ${Date.now() - startTime}ms. Output length: ${result.length} chars`);
            return result;
        } catch (error: any) {
            console.warn(`[LlmService] Synthesis error for query "${query.substring(0, 30)}...": ${error.message}`);
            // Robust Fallback: if LLM fails, use basic synthesis
            return `### 📊 AI CFO Analysis Report (Fallback)\n\n${agentOutputs.join('\n\n---\n\n')}`;
        }
    }
}

export const llmService = new LlmService();
