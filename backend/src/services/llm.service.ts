import 'dotenv/config';
import fetch from 'node-fetch';

/**
 * LLM Service for high-performance AI operations in Node.js
 * Used for intent classification, narrative synthesis, and strategic reasoning.
 */
class LlmService {
    private apiKeys: string[] = [];
    private model: string;

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
                // Using stable v1 API
                const url = `https://generativelanguage.googleapis.com/v1/models/${this.model}:generateContent?key=${key}`;
                console.debug(`[LlmService] Calling URL: ${url.replace(key, 'REDACTED')}`);

                const payload = {
                    contents: [{
                        parts: [{
                            text: `${systemPrompt}\n\nUser Request: ${userPrompt}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: 8192,
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

                if (content && content.parts) {
                    const text = content.parts.map((p: any) => p.text || '').join('');
                    if (text) return text;
                }

                if (data) {
                    lastError = `Gemini API response missing text content.`;
                }
            } catch (error: any) {
                lastError = error.message;
            }
        }

        throw new Error(`All LLM attempts failed. Last error: ${lastError}`);
    }

    async streamComplete(systemPrompt: string, userPrompt: string, onChunk: (chunk: string) => void): Promise<string> {
        if (this.apiKeys.length === 0) throw new Error('No Gemini API keys');
        let lastError: any = null;

        for (const key of this.apiKeys) {
            try {
                // Using stable v1 API for streaming
                const sseUrl = `https://generativelanguage.googleapis.com/v1/models/${this.model}:streamGenerateContent?alt=sse&key=${key}`;
                const payload = {
                    contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Request: ${userPrompt}` }] }],
                    generationConfig: { temperature: 0.1, topP: 0.95, topK: 40, maxOutputTokens: 8192 }
                };

                const sseResponse = await fetch(sseUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!sseResponse.ok) {
                    lastError = await sseResponse.text();
                    continue;
                }

                const reader = sseResponse.body!.getReader();
                const decoder = new TextDecoder("utf-8");
                let fullText = "";
                let buffer = "";

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || "";

                    for (const line of lines) {
                        if (line.startsWith("data: ") && line.trim() !== "data: [DONE]") {
                            try {
                                const data = JSON.parse(line.slice(6));
                                const textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (textChunk) {
                                    fullText += textChunk;
                                    onChunk(textChunk);
                                }
                            } catch (e) { }
                        }
                    }
                }
                return fullText;
            } catch (error: any) {
                lastError = error.message;
            }
        }
        throw new Error(`LLM stream failed: ${lastError}`);
    }

    async synthesizeCfoReport(
        query: string,
        agentOutputs: string[],
        calculations: Record<string, number>
    ): Promise<string> {
        const currentDate = new Date().toLocaleDateString();
        const systemPrompt = `You are a world-class strategic CFO. 
Current Date: ${currentDate}
Synthesize agent reports into a cohesive, professional executive report.
- Tone: Professional, authoritative.
- Depth: Exhaustive analysis (at least 1500 words if necessary).
- Format: Clean Markdown with clear headers.`;

        const userPrompt = `
User Query: "${query}"
AGENT OUTPUTS:
${agentOutputs.join('\n\n---\n\n')}
FINANCIAL CALCULATIONS:
${JSON.stringify(calculations, null, 2)}
Provide a synthesized CFO report.`;

        try {
            return await this.complete(systemPrompt, userPrompt);
        } catch (error: any) {
            return `### 📊 AI CFO Analysis Report (Fallback)\n\n${agentOutputs.join('\n\n---\n\n')}`;
        }
    }
}

export const llmService = new LlmService();
