// ============================================================
// Verification de langue et de voix Gemini (Live + TTS via LiveKit), a
// travers les catalogues live/capabilities.ts et tts/geminiVoices.ts.
// Fichier separe pour eviter un cycle d'imports entre les deux catalogues
// (meme structure que @owllayer/adapter-google, FR-005/FR-014 ; aucun import
// croise entre paquets @owllayer/adapter-*).
// ============================================================

import { GEMINI_LIVE_MODELS, GEMINI_LIVE_VOICES } from './capabilities.js';
import { GEMINI_TTS_MODELS, GEMINI_TTS_VOICES } from '../tts/geminiVoices.js';

/** Langues supportees : toutes les entrees Gemini (Live et TTS) sont multilingues. */
export const GEMINI_LANGUAGES = ['multilingual'] as const;

export type LanguageSupport = { supported: true } | { supported: false; supportedLanguages: readonly string[] };

const KNOWN_LIVE_MODEL_IDS = new Set<string>(GEMINI_LIVE_MODELS.map((m) => m.id));
const KNOWN_TTS_MODEL_IDS = new Set<string>(GEMINI_TTS_MODELS.map((m) => m.id));
const KNOWN_VOICE_IDS = new Set<string>([
  ...GEMINI_LIVE_VOICES.map((v) => v.id),
  ...GEMINI_TTS_VOICES.map((v) => v.id),
]);

/** Verifie qu'un identifiant de modele Gemini (Live ou TTS) est repertorie (FR-005 : ne leve jamais). */
export function isKnownGeminiModel(id: string, role: 'live' | 'tts' = 'live'): boolean {
  return role === 'live' ? KNOWN_LIVE_MODEL_IDS.has(id) : KNOWN_TTS_MODEL_IDS.has(id);
}

/** Verifie qu'un identifiant de voix Gemini (Live ou TTS) est repertorie (FR-005 : ne leve jamais). */
export function isKnownGeminiVoice(id: string): boolean {
  return KNOWN_VOICE_IDS.has(id);
}

/** Toutes les entrees Gemini (Live et TTS) etant multilingues, toute langue est supportee (FR-005/edge case multilingue). */
export function geminiSupportsLanguage(_id: string, _language: string): LanguageSupport {
  return { supported: true };
}
