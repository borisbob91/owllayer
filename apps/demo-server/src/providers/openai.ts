import {
  OpenAIAdapter,
  OpenAILiveAdapter,
  OPENAI_DEFAULT_CHAT_MODEL,
  OPENAI_DEFAULT_REALTIME_MODEL,
  OPENAI_DEFAULT_REALTIME_VOICE,
} from '@owllayer/adapter-openai';
import { createLogger, type LLMAdapter, type LiveAdapter } from '@owllayer/core';
import { demoLanguage, isMissing } from '../shared/env.js';

const log = createLogger('Demo:OpenAI');

// Variables : .env.openai (voir .env.openai.example)

function apiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (isMissing(key)) log.warn('Missing OPENAI_API_KEY: add it in apps/demo-server/.env.openai');
  return key || '';
}

/** OpenAI text model (OPENAI_MODEL, catalog default otherwise). */
export function createOpenAIText(): LLMAdapter {
  const { language, i18n } = demoLanguage();
  return new OpenAIAdapter({
    model: process.env.OPENAI_MODEL || OPENAI_DEFAULT_CHAT_MODEL,
    apiKey: apiKey() || 'dummy_key_to_prevent_crash',
    timeout: Number.parseInt(process.env.LLM_TIMEOUT_MS || '90000', 10),
    systemPrompt: i18n.systemPrompt,
    language,
  });
}

/** OpenAI Realtime voice (OPENAI_REALTIME_MODEL, OPENAI_REALTIME_VOICE). */
export function createOpenAILive(): LiveAdapter | undefined {
  const key = apiKey();
  if (!key) return undefined;
  return new OpenAILiveAdapter({
    apiKey: key,
    model: process.env.OPENAI_REALTIME_MODEL || OPENAI_DEFAULT_REALTIME_MODEL,
    voice: process.env.OPENAI_REALTIME_VOICE || OPENAI_DEFAULT_REALTIME_VOICE,
    systemPrompt: demoLanguage().i18n.livePrompt,
  });
}
