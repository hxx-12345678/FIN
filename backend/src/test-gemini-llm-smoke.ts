/**
 * Smoke test for Gemini LLM connectivity using backend/.env
 *
 * Usage:
 *   npx ts-node src/test-gemini-llm-smoke.ts
 */

import './config/env';
import { llmClient } from './services/llm/llm-client.service';

async function main() {
  const provider = (process.env.LLM_PROVIDER as any) || 'gemini';
  const model = process.env.GEMINI_MODEL || process.env.LLM_MODEL || 'gemini-2.0-flash-exp';

  console.log('Gemini smoke test:');
  console.log(`- provider: ${provider}`);
  console.log(`- model: ${model}`);
  console.log(`- has GEMINI_API_KEY_1: ${Boolean(process.env.GEMINI_API_KEY_1)}`);
  console.log(`- has GEMINI_API_KEY_2: ${Boolean(process.env.GEMINI_API_KEY_2)}`);
  console.log(`- has GEMINI_API_KEY: ${Boolean(process.env.GEMINI_API_KEY)}`);

  const res = await llmClient.call(
    {
      systemPrompt: 'You are a CFO. Return ONLY JSON.',
      prompt:
        'Return JSON: {"ok":true,"message":"hello","n":1} (no markdown, no extra text)',
      temperature: 0.0,
      maxTokens: 100,
    },
    {
      provider: 'gemini',
      model,
      // Do NOT pass apiKey here; allow llm-client to rotate across all env keys
    }
  );

  const text = res.content?.trim() || '';
  console.log('\n✅ LLM call succeeded');
  console.log(`- response model: ${res.model}`);
  console.log(`- response preview: ${text.substring(0, 120)}`);
}

main().catch((err) => {
  console.error('\n❌ LLM call failed');
  console.error(err?.message || err);
  process.exit(1);
});


