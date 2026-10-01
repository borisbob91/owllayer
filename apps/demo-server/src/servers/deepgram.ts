// Serveur de demo Deepgram : la voix par Deepgram (VOICE_MODE), le texte par DEEPGRAM_TEXT_PROVIDER
// pnpm --filter @owllayer/demo-server dev:deepgram   (variables : .env.deepgram, .env.<texte>, puis .env)
import type { LLMAdapter } from '@owllayer/core';
import { loadDemoEnv } from '../shared/env.js';
import { startDemoServer } from '../shared/startDemoServer.js';
import { createDeepgramVoice } from '../providers/deepgram.js';
import { createDeepSeekText } from '../providers/deepseek.js';
import { createGoogleText } from '../providers/google.js';
import { createOpenAIText } from '../providers/openai.js';

const TEXT_PROVIDERS = ['deepseek', 'openai', 'google'] as const;
type TextProvider = typeof TEXT_PROVIDERS[number];

// Le fichier du LLM texte (.env.deepseek, .env.openai ou .env.google) est charge aussi
loadDemoEnv('deepgram', () => process.env.DEEPGRAM_TEXT_PROVIDER || 'deepseek');

const textProvider = (process.env.DEEPGRAM_TEXT_PROVIDER || 'deepseek').toLowerCase() as TextProvider;
if (!TEXT_PROVIDERS.includes(textProvider)) {
  console.error(`Unknown DEEPGRAM_TEXT_PROVIDER "${textProvider}". Expected one of: ${TEXT_PROVIDERS.join(', ')}.`);
  process.exit(1);
}

// Texte tape dans le chat (et raisonnement des modes pipeline)
const createText: Record<TextProvider, () => LLMAdapter> = {
  deepseek: createDeepSeekText,
  openai: createOpenAIText,
  google: createGoogleText,
};
const llm = createText[textProvider]();
const voice = createDeepgramVoice(llm);

startDemoServer({
  label: `deepgram ${voice.mode} + ${textProvider} text`,
  llm,
  live: voice.live,
  stt: voice.stt,
  tts: voice.tts,
});
