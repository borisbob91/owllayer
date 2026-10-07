import {
  GoogleAdapter,
  GoogleLiveAdapter,
  GoogleSTT,
  GoogleTTS,
  GOOGLE_DEFAULT_TEXT_MODEL,
  GOOGLE_DEFAULT_LIVE_MODEL,
  GOOGLE_DEFAULT_LIVE_VOICE,
} from '@owllayer/adapter-google';
import { createLogger, type LLMAdapter, type LiveAdapter, type STTService, type TTSService } from '@owllayer/core';
import { demoLanguage, isMissing } from '../shared/env.js';

const log = createLogger('Demo:Google');

// Variables : .env.google (voir .env.google.example)

function apiKey(): string {
  const key = process.env.GOOGLE_API_KEY;
  if (isMissing(key)) log.warn('Missing GOOGLE_API_KEY: add it in apps/demo-server/.env.google');
  return key || '';
}

/** Gemini text model (GEMINI_MODEL, catalog default otherwise). */
export function createGoogleText(): LLMAdapter {
  const { language, i18n } = demoLanguage();
  return new GoogleAdapter({
    model: process.env.GEMINI_MODEL || GOOGLE_DEFAULT_TEXT_MODEL,
    apiKey: apiKey() || 'dummy_key_to_prevent_crash',
    systemPrompt: i18n.systemPrompt,
    language,
  });
}

/** Gemini Live: native bidirectional audio (GEMINI_LIVE_MODEL, GEMINI_LIVE_VOICE). */
export function createGoogleLive(): LiveAdapter | undefined {
  const key = apiKey();
  if (!key) return undefined;
  return new GoogleLiveAdapter({
    apiKey: key,
    model: process.env.GEMINI_LIVE_MODEL || GOOGLE_DEFAULT_LIVE_MODEL,
    voice: process.env.GEMINI_LIVE_VOICE || GOOGLE_DEFAULT_LIVE_VOICE,
    systemPrompt: demoLanguage().i18n.livePrompt,
  });
}

/** Google Cloud speech-to-text and text-to-speech, for the hybrid pipeline (audio USER_INPUT). */
export function createGoogleSpeech(): { stt?: STTService; tts?: TTSService } {
  const key = apiKey();
  if (!key) return {};
  const { i18n } = demoLanguage();
  return {
    stt: new GoogleSTT({
      apiKey: key,
      defaultLanguage: i18n.stt.languageCode,
      enableAutomaticPunctuation: true,
      model: 'latest_long',
      debug: true,
    }),
    tts: new GoogleTTS({
      apiKey: key,
      voice: i18n.tts.voice,
      defaultLanguage: i18n.tts.languageCode,
      voiceType: 'Neural2',
      debug: true,
    }),
  };
}
