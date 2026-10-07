// ============================================================
// Verification de langue et de voix Google, a travers les catalogues
// Gemini (catalog.ts) et Cloud Text-to-Speech (googleTtsVoices.ts).
// Fichier separe pour eviter un cycle d'imports entre les deux catalogues
// (research R7, FR-005, FR-014).
// ============================================================

import {
  GEMINI_TRANSCRIBE_MODELS,
  GEMINI_VOICES,
  GOOGLE_LIVE_MODELS,
  GOOGLE_STT_MODELS,
  GOOGLE_TEXT_MODELS,
  GOOGLE_TTS_MODELS,
  primarySubtag,
  type GoogleCatalogModel,
  type GoogleCatalogVoice,
  type LanguageSupport,
} from './catalog.js';
import { GOOGLE_TTS_VOICES } from './googleTtsVoices.js';

/** Tous les modeles Google, types largement (les entrees `as const` ont des champs optionnels heterogenes). */
const ALL_MODELS: readonly GoogleCatalogModel[] = [
  ...GOOGLE_TEXT_MODELS,
  ...GOOGLE_LIVE_MODELS,
  ...GOOGLE_STT_MODELS,
  ...GEMINI_TRANSCRIBE_MODELS,
  ...GOOGLE_TTS_MODELS,
];

/** Toutes les voix Google (Gemini + Cloud TTS), typees largement. */
const ALL_VOICES: readonly GoogleCatalogVoice[] = [...GEMINI_VOICES, ...GOOGLE_TTS_VOICES];

/** Verifie qu'un identifiant de voix (Gemini ou Cloud TTS) est repertorie (FR-005 : ne leve jamais). */
export function isKnownGoogleVoice(id: string): boolean {
  return ALL_VOICES.some((voice) => voice.id === id);
}

/**
 * Verifie qu'un modele ou une voix Google repertorie (Gemini texte/live/stt/tts
 * ou Cloud TTS) supporte la langue donnee (FR-005/FR-014). Un identifiant non
 * repertorie n'est pas verifiable localement : `{ supported: true }` (edge
 * case du spec, aucune levee). Les entrees multilingues supportent toute langue.
 */
export function googleSupportsLanguage(id: string, language: string): LanguageSupport {
  const entry: GoogleCatalogVoice | GoogleCatalogModel | undefined =
    ALL_VOICES.find((v) => v.id === id) ?? ALL_MODELS.find((m) => m.id === id);

  if (!entry || !entry.languages) {
    return { supported: true };
  }

  if (entry.languages.includes('multilingual')) {
    return { supported: true };
  }

  const normalized = primarySubtag(language);
  const matches = entry.languages.some(
    (code) => code.toLowerCase() === language.toLowerCase() || primarySubtag(code) === normalized,
  );

  return matches ? { supported: true } : { supported: false, supportedLanguages: entry.languages };
}
