import { StreamingPipelineLiveAdapter, validateVoiceRuntimeDefinition } from '@owllayer/server';
import {
  DeepgramNovaSTT,
  DeepgramAuraTTS,
  DeepgramFluxSTT,
  DeepgramVoiceAgentAdapter,
  type DeepgramVoiceAgentOptions,
} from '@owllayer/adapter-deepgram';
import { createLogger, type LLMAdapter, type LiveAdapter, type STTService, type TTSService } from '@owllayer/core';
import { demoLanguage, isMissing } from '../shared/env.js';

const log = createLogger('Demo:Deepgram');

// Variables : .env.deepgram (voir .env.deepgram.example)

/** Deepgram voice modes, one at a time (VOICE_MODE). */
export const DEEPGRAM_VOICE_MODES = ['realtime', 'pipeline-streaming', 'pipeline-batch'] as const;
export type DeepgramVoiceMode = typeof DEEPGRAM_VOICE_MODES[number];

export interface DeepgramVoice {
  mode: DeepgramVoiceMode;
  live?: LiveAdapter;
  stt?: STTService;
  tts?: TTSService;
}

/**
 * Deepgram voice for the demo:
 * - realtime (default): Deepgram Voice Agent, listening, reasoning and voice all billed by Deepgram;
 * - pipeline-streaming: Flux STT + the text LLM + Aura streaming, through the `live` slot;
 * - pipeline-batch: Nova STT + the text LLM + Aura, through the server STT/TTS pipeline.
 */
export function createDeepgramVoice(llm: LLMAdapter): DeepgramVoice {
  const apiKey = process.env.DEEPGRAM_API_KEY || '';
  if (isMissing(apiKey)) {
    log.error('Missing DEEPGRAM_API_KEY: add it in apps/demo-server/.env.deepgram');
    process.exit(1);
  }
  const mode = (process.env.VOICE_MODE || 'realtime').toLowerCase() as DeepgramVoiceMode;
  if (!DEEPGRAM_VOICE_MODES.includes(mode)) {
    log.error(`Unknown VOICE_MODE "${mode}". Expected one of: ${DEEPGRAM_VOICE_MODES.join(', ')}.`);
    process.exit(1);
  }
  const language = demoLanguage().language;

  if (mode === 'realtime') {
    // Raisonnement du Voice Agent gere par Deepgram : aucune autre cle
    const provider = process.env.DEEPGRAM_THINK_PROVIDER;
    const model = process.env.DEEPGRAM_THINK_MODEL;
    const think = provider
      ? { provider: provider as NonNullable<DeepgramVoiceAgentOptions['think']>['provider'], ...(model ? { model } : {}) }
      : undefined;
    const live = new DeepgramVoiceAgentAdapter({ apiKey, language, ...(think ? { think } : {}) });
    assertVoiceDefinition({ mode: 'realtime', live });
    return { mode, live };
  }

  if (mode === 'pipeline-streaming') {
    const stt = new DeepgramFluxSTT({ apiKey, language });
    const tts = new DeepgramAuraTTS({ apiKey, language });
    assertVoiceDefinition({ mode: 'pipeline', stt, tts });
    return { mode, live: new StreamingPipelineLiveAdapter({ stt, llm, tts }) };
  }

  return {
    mode,
    stt: new DeepgramNovaSTT({ apiKey, language }),
    tts: new DeepgramAuraTTS({ apiKey, language }),
  };
}

/** Stops the demo on an inconsistent voice definition (one mode, all its parts). */
function assertVoiceDefinition(definition: Parameters<typeof validateVoiceRuntimeDefinition>[0]): void {
  const validation = validateVoiceRuntimeDefinition(definition);
  if (!validation.valid) {
    log.error(`Invalid Deepgram voice definition: ${validation.code}${validation.missing ? ` (missing: ${validation.missing.join(', ')})` : ''}.`);
    process.exit(1);
  }
}
