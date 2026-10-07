import { OpenAIAdapter } from '@owllayer/adapter-openai';
import { createLogger, type LLMAdapter } from '@owllayer/core';
import { demoLanguage, isMissing } from '../shared/env.js';

const log = createLogger('Demo:DeepSeek');

// Variables : .env.deepseek (voir .env.deepseek.example)

/** DeepSeek text model through its OpenAI-compatible API (text only). */
export function createDeepSeekText(): LLMAdapter {
  const { language, i18n } = demoLanguage();
  const key = process.env.DEEPSEEK_API_KEY;
  if (isMissing(key)) log.warn('Missing DEEPSEEK_API_KEY: add it in apps/demo-server/.env.deepseek');
  return new OpenAIAdapter({
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    apiKey: key || 'dummy_key_to_prevent_crash',
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    timeout: Number.parseInt(process.env.LLM_TIMEOUT_MS || '90000', 10),
    thinking: process.env.DEEPSEEK_THINKING === 'true',
    systemPrompt: i18n.systemPrompt,
    language,
  });
}
