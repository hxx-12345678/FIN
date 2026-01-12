/**
 * LLM CLIENT SERVICE
 * Unified interface for multiple LLM providers
 * Supports OpenAI, Anthropic, Gemini with fallback
 */

import { ValidationError } from '../../utils/errors';

export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  finish_reason?: string;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'fallback';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

/**
 * OpenAI client
 */
async function callOpenAI(request: LLMRequest, config: LLMConfig): Promise<LLMResponse> {
  if (!config.apiKey) {
    throw new ValidationError('OpenAI API key not configured');
  }

  const model = config.model || 'gpt-4';
  const url = config.baseUrl || 'https://api.openai.com/v1/chat/completions';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt },
        ],
        temperature: request.temperature || 0.3,
        max_tokens: request.maxTokens || 1000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText })) as { message?: string };
      throw new Error(`OpenAI API error: ${error.message || response.statusText}`);
    }

    const data = await response.json() as {
      choices: Array<{ message?: { content?: string }; finish_reason?: string }>;
      model?: string;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };
    const content = data.choices[0]?.message?.content || '';

    return {
      content,
      model: data.model || model,
      usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      finish_reason: data.choices[0]?.finish_reason,
    };
  } catch (error: any) {
    throw new Error(`OpenAI API call failed: ${error.message}`);
  }
}

/**
 * Anthropic Claude client
 */
async function callAnthropic(request: LLMRequest, config: LLMConfig): Promise<LLMResponse> {
  if (!config.apiKey) {
    throw new ValidationError('Anthropic API key not configured');
  }

  const model = config.model || 'claude-3-5-sonnet-20241022';
  const url = config.baseUrl || 'https://api.anthropic.com/v1/messages';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.3,
        system: request.systemPrompt || '',
        messages: [
          { role: 'user', content: request.prompt },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText })) as { message?: string };
      throw new Error(`Anthropic API error: ${error.message || response.statusText}`);
    }

    const data = await response.json() as {
      content: Array<{ text?: string }>;
      model?: string;
      usage?: { input_tokens: number; output_tokens: number };
    };
    const content = data.content[0]?.text || '';

    return {
      content,
      model: data.model || model,
      usage: data.usage ? {
        input_tokens: data.usage.input_tokens || 0,
        output_tokens: data.usage.output_tokens || 0,
        prompt_tokens: data.usage.input_tokens || 0,
        completion_tokens: data.usage.output_tokens || 0,
        total_tokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
      } : undefined,
    };
  } catch (error: any) {
    throw new Error(`Anthropic API call failed: ${error.message}`);
  }
}

/**
 * Get Gemini API keys with fallback support
 */
function getGeminiApiKeys(): string[] {
  const keys: string[] = [];
  
  // Try multiple API keys
  if (process.env.GEMINI_API_KEY_1?.trim()) {
    keys.push(process.env.GEMINI_API_KEY_1.trim());
  }
  if (process.env.GEMINI_API_KEY_2?.trim()) {
    keys.push(process.env.GEMINI_API_KEY_2.trim());
  }
  if (process.env.GEMINI_API_KEY?.trim()) {
    keys.push(process.env.GEMINI_API_KEY.trim());
  }
  if (process.env.LLM_API_KEY?.trim()) {
    keys.push(process.env.LLM_API_KEY.trim());
  }
  
  return keys;
}

/**
 * Google Gemini client with multiple API key support and retry logic
 */
async function callGemini(request: LLMRequest, config: LLMConfig): Promise<LLMResponse> {
  // Get all available API keys (always include env keys so we can rotate even if caller passed apiKey)
  const apiKeys = Array.from(
    new Set([...(config.apiKey ? [config.apiKey] : []), ...getGeminiApiKeys()].filter(Boolean))
  );
  
  if (apiKeys.length === 0) {
    throw new ValidationError('Gemini API key not configured');
  }

  // Prefer stable, high-availability Gemini model by default
  const model = config.model || 'gemini-2.0-flash-exp';
  let lastError: Error | null = null;

  // Try each API key with retry logic
  for (const apiKey of apiKeys) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    // Reduced retries for speed (2 attempts instead of 4)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        // Reduced backoff for faster response
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${request.systemPrompt || ''}\n\n${request.prompt}`,
              }],
            }],
            generationConfig: {
              temperature: request.temperature || 0.3,
              maxOutputTokens: request.maxTokens || 1000,
              topP: request.topP,
              topK: request.topK,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: response.statusText })) as { error?: { message?: string }; message?: string };
          const errorMessage = error.error?.message || error.message || response.statusText;
          
          // Handle rate limiting - backoff and retry same key, then try next key
          if (response.status === 429) {
            lastError = new ValidationError('Gemini API rate limit exceeded');
            // Retry same key a few times with increasing backoff
            if (attempt < 3) {
              continue;
            }
            break; // move to next key
          }
          
          // Handle invalid API key - try next key
          if (response.status === 401) {
            lastError = new ValidationError('Gemini API key invalid');
            break; // Try next key
          }
          
          // Handle quota exceeded - try next key
          if (response.status === 403) {
            lastError = new ValidationError('Gemini API quota exceeded');
            break; // Try next key
          }
          
          // Other errors - retry same key
          lastError = new Error(`Gemini API error: ${errorMessage}`);
          continue; // Retry same key
        }

        // Success - parse and return
        const data = await response.json() as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          model?: string;
          usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
        };
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return {
          content,
          model: data.model || model,
          usage: data.usageMetadata ? {
            promptTokenCount: data.usageMetadata.promptTokenCount || 0,
            candidatesTokenCount: data.usageMetadata.candidatesTokenCount || 0,
            totalTokenCount: data.usageMetadata.totalTokenCount || 0,
            prompt_tokens: data.usageMetadata.promptTokenCount || 0,
            completion_tokens: data.usageMetadata.candidatesTokenCount || 0,
            total_tokens: data.usageMetadata.totalTokenCount || 0,
          } : undefined,
        };
      } catch (error: any) {
        lastError = error;
        // Continue to next attempt or next key
        continue;
      }
    }
  }

  // All API keys failed
  if (lastError) {
    // Re-throw ValidationError (rate limits, invalid keys) to trigger fallback
    if (lastError instanceof ValidationError) {
      throw lastError;
    }
    throw new Error(`All Gemini API keys failed. Last error: ${lastError.message}`);
  }
  
  throw new ValidationError('No valid Gemini API keys available');
}

export const llmClient = {
  /**
   * Call LLM with automatic provider selection
   */
  call: async (request: LLMRequest, config?: LLMConfig): Promise<LLMResponse> => {
    const llmConfig: LLMConfig = config || {
      provider: (process.env.LLM_PROVIDER as any) || 'fallback',
      apiKey: process.env.LLM_API_KEY,
      model: process.env.LLM_MODEL,
      baseUrl: process.env.LLM_BASE_URL,
    };

    if (llmConfig.provider === 'fallback') {
      throw new ValidationError('LLM not configured - using fallback');
    }
    // Gemini can source keys from GEMINI_API_KEY(_1/_2) even if apiKey isn't passed in config
    if (llmConfig.provider !== 'gemini' && !llmConfig.apiKey) {
      throw new ValidationError('LLM not configured - using fallback');
    }

    switch (llmConfig.provider) {
      case 'openai':
        return await callOpenAI(request, llmConfig);
      case 'anthropic':
        return await callAnthropic(request, llmConfig);
      case 'gemini':
        return await callGemini(request, llmConfig);
      default:
        throw new ValidationError(`Unsupported LLM provider: ${llmConfig.provider}`);
    }
  },
};

