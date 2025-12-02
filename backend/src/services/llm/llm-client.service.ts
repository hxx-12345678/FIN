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
 * Google Gemini client
 */
async function callGemini(request: LLMRequest, config: LLMConfig): Promise<LLMResponse> {
  if (!config.apiKey) {
    throw new ValidationError('Gemini API key not configured');
  }

  const model = config.model || 'gemini-2.0-flash-exp';
  const url = config.baseUrl || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

  try {
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
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText })) as { error?: { message?: string }; message?: string };
      const errorMessage = error.error?.message || error.message || response.statusText;
      
      // Handle rate limiting gracefully
      if (response.status === 429) {
        console.warn('Gemini API rate limit exceeded, will use fallback');
        throw new ValidationError('Gemini API rate limit exceeded - using fallback');
      }
      
      // Handle invalid API key (401) or quota exceeded (403)
      if (response.status === 401) {
        console.warn('Gemini API key invalid or expired, will use fallback');
        throw new ValidationError('Gemini API key invalid - using fallback');
      }
      
      if (response.status === 403) {
        console.warn('Gemini API quota exceeded or access denied, will use fallback');
        throw new ValidationError('Gemini API quota exceeded - using fallback');
      }
      
      throw new Error(`Gemini API error: ${errorMessage}`);
    }

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
    // Re-throw ValidationError (rate limits, invalid keys) to trigger fallback
    if (error instanceof ValidationError) {
      throw error;
    }
    // For other errors, wrap and throw
    throw new Error(`Gemini API call failed: ${error.message}`);
  }
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

    if (llmConfig.provider === 'fallback' || !llmConfig.apiKey) {
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

