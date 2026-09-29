// ============================================================
// Catalogue des voix Google Cloud Text-to-Speech (par locale, familles
// courantes). Source : docs.cloud.google.com/text-to-speech/docs/chirp3-hd
// et /list-voices-and-types, verifie le GOOGLE_CATALOG_VERIFIED_AT de
// catalog.ts (2026-09-28). Chirp3-HD reutilise les 30 noms/genres de
// GEMINI_VOICES (meme page source, FR-009 pour le pendant adapter-livekit).
//
// Limite connue et assumee (voir research.md "Verified data" et le
// rapport de lot) : les familles Neural2/Standard/WaveNet/Studio pour
// zh-CN n'ont pas pu etre lues sur la page officielle (contenu tronque a
// chaque tentative le 2026-09-28) ; seule la famille Chirp3-HD est
// repertoriee pour cette locale, aucun identifiant n'a ete invente.
// ============================================================

import { GEMINI_VOICES, type GoogleCatalogVoice } from './catalog.js';

const CHIRP3_HD_LOCALES = ['fr-FR', 'en-US', 'en-GB', 'es-ES', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN'] as const;

/** Genere les 30 voix Chirp3-HD pour une locale donnee, a partir de GEMINI_VOICES (meme noms/genres, FR-009). */
function chirp3HdVoicesFor(locale: string): GoogleCatalogVoice[] {
  return GEMINI_VOICES.map((voice) => ({
    id: `${locale}-Chirp3-HD-${voice.id}`,
    name: `Chirp3-HD ${voice.id} (${locale})`,
    gender: voice.gender,
    languages: [locale],
    family: 'Chirp3-HD',
  }));
}

/** Voix additionnelles (Neural2, Standard, WaveNet, Studio, Chirp-HD, Polyglot, News, Casual) lues par locale. */
const ADDITIONAL_VOICES_BY_LOCALE: Record<string, readonly GoogleCatalogVoice[]> = {
  'fr-FR': [
    { id: 'fr-FR-Neural2-F', name: 'Neural2-F (fr-FR)', gender: 'female', languages: ['fr-FR'], family: 'Neural2' },
    { id: 'fr-FR-Neural2-G', name: 'Neural2-G (fr-FR)', gender: 'male', languages: ['fr-FR'], family: 'Neural2' },
    { id: 'fr-FR-Standard-F', name: 'Standard-F (fr-FR)', gender: 'female', languages: ['fr-FR'], family: 'Standard' },
    { id: 'fr-FR-Standard-G', name: 'Standard-G (fr-FR)', gender: 'male', languages: ['fr-FR'], family: 'Standard' },
    { id: 'fr-FR-Wavenet-F', name: 'Wavenet-F (fr-FR)', gender: 'female', languages: ['fr-FR'], family: 'WaveNet' },
    { id: 'fr-FR-Wavenet-G', name: 'Wavenet-G (fr-FR)', gender: 'male', languages: ['fr-FR'], family: 'WaveNet' },
    { id: 'fr-FR-Studio-A', name: 'Studio-A (fr-FR)', gender: 'female', languages: ['fr-FR'], family: 'Studio' },
    { id: 'fr-FR-Studio-D', name: 'Studio-D (fr-FR)', gender: 'male', languages: ['fr-FR'], family: 'Studio' },
    { id: 'fr-FR-Polyglot-1', name: 'Polyglot-1 (fr-FR)', gender: 'male', languages: ['fr-FR'], family: 'Polyglot' },
  ],
  'en-US': [
    { id: 'en-US-Neural2-A', name: 'Neural2-A (en-US)', gender: 'male', languages: ['en-US'], family: 'Neural2' },
    { id: 'en-US-Neural2-C', name: 'Neural2-C (en-US)', gender: 'female', languages: ['en-US'], family: 'Neural2' },
    { id: 'en-US-Neural2-D', name: 'Neural2-D (en-US)', gender: 'male', languages: ['en-US'], family: 'Neural2' },
    { id: 'en-US-Neural2-E', name: 'Neural2-E (en-US)', gender: 'female', languages: ['en-US'], family: 'Neural2' },
    { id: 'en-US-Neural2-F', name: 'Neural2-F (en-US)', gender: 'female', languages: ['en-US'], family: 'Neural2' },
    { id: 'en-US-Neural2-G', name: 'Neural2-G (en-US)', gender: 'female', languages: ['en-US'], family: 'Neural2' },
    { id: 'en-US-Neural2-H', name: 'Neural2-H (en-US)', gender: 'female', languages: ['en-US'], family: 'Neural2' },
    { id: 'en-US-Neural2-I', name: 'Neural2-I (en-US)', gender: 'male', languages: ['en-US'], family: 'Neural2' },
    { id: 'en-US-Neural2-J', name: 'Neural2-J (en-US)', gender: 'male', languages: ['en-US'], family: 'Neural2' },
    { id: 'en-US-Standard-A', name: 'Standard-A (en-US)', gender: 'male', languages: ['en-US'], family: 'Standard' },
    { id: 'en-US-Standard-B', name: 'Standard-B (en-US)', gender: 'male', languages: ['en-US'], family: 'Standard' },
    { id: 'en-US-Standard-C', name: 'Standard-C (en-US)', gender: 'female', languages: ['en-US'], family: 'Standard' },
    { id: 'en-US-Standard-D', name: 'Standard-D (en-US)', gender: 'male', languages: ['en-US'], family: 'Standard' },
    { id: 'en-US-Standard-E', name: 'Standard-E (en-US)', gender: 'female', languages: ['en-US'], family: 'Standard' },
    { id: 'en-US-Standard-F', name: 'Standard-F (en-US)', gender: 'female', languages: ['en-US'], family: 'Standard' },
    { id: 'en-US-Standard-G', name: 'Standard-G (en-US)', gender: 'female', languages: ['en-US'], family: 'Standard' },
    { id: 'en-US-Standard-H', name: 'Standard-H (en-US)', gender: 'female', languages: ['en-US'], family: 'Standard' },
    { id: 'en-US-Standard-I', name: 'Standard-I (en-US)', gender: 'male', languages: ['en-US'], family: 'Standard' },
    { id: 'en-US-Standard-J', name: 'Standard-J (en-US)', gender: 'male', languages: ['en-US'], family: 'Standard' },
    { id: 'en-US-Wavenet-A', name: 'Wavenet-A (en-US)', gender: 'male', languages: ['en-US'], family: 'WaveNet' },
    { id: 'en-US-Wavenet-B', name: 'Wavenet-B (en-US)', gender: 'male', languages: ['en-US'], family: 'WaveNet' },
    { id: 'en-US-Wavenet-C', name: 'Wavenet-C (en-US)', gender: 'female', languages: ['en-US'], family: 'WaveNet' },
    { id: 'en-US-Wavenet-D', name: 'Wavenet-D (en-US)', gender: 'male', languages: ['en-US'], family: 'WaveNet' },
    { id: 'en-US-Wavenet-E', name: 'Wavenet-E (en-US)', gender: 'female', languages: ['en-US'], family: 'WaveNet' },
    { id: 'en-US-Wavenet-F', name: 'Wavenet-F (en-US)', gender: 'female', languages: ['en-US'], family: 'WaveNet' },
    { id: 'en-US-Wavenet-G', name: 'Wavenet-G (en-US)', gender: 'female', languages: ['en-US'], family: 'WaveNet' },
    { id: 'en-US-Wavenet-H', name: 'Wavenet-H (en-US)', gender: 'female', languages: ['en-US'], family: 'WaveNet' },
    { id: 'en-US-Wavenet-I', name: 'Wavenet-I (en-US)', gender: 'male', languages: ['en-US'], family: 'WaveNet' },
    { id: 'en-US-Wavenet-J', name: 'Wavenet-J (en-US)', gender: 'male', languages: ['en-US'], family: 'WaveNet' },
    { id: 'en-US-Studio-O', name: 'Studio-O (en-US)', gender: 'female', languages: ['en-US'], family: 'Studio' },
    { id: 'en-US-Studio-Q', name: 'Studio-Q (en-US)', gender: 'male', languages: ['en-US'], family: 'Studio' },
    { id: 'en-US-Polyglot-1', name: 'Polyglot-1 (en-US)', gender: 'male', languages: ['en-US'], family: 'Polyglot' },
  ],
  'en-GB': [
    { id: 'en-GB-Neural2-A', name: 'Neural2-A (en-GB)', gender: 'female', languages: ['en-GB'], family: 'Neural2' },
    { id: 'en-GB-Neural2-B', name: 'Neural2-B (en-GB)', gender: 'male', languages: ['en-GB'], family: 'Neural2' },
    { id: 'en-GB-Neural2-C', name: 'Neural2-C (en-GB)', gender: 'female', languages: ['en-GB'], family: 'Neural2' },
    { id: 'en-GB-Neural2-D', name: 'Neural2-D (en-GB)', gender: 'male', languages: ['en-GB'], family: 'Neural2' },
    { id: 'en-GB-Neural2-F', name: 'Neural2-F (en-GB)', gender: 'female', languages: ['en-GB'], family: 'Neural2' },
    { id: 'en-GB-Neural2-N', name: 'Neural2-N (en-GB)', gender: 'female', languages: ['en-GB'], family: 'Neural2' },
    { id: 'en-GB-Neural2-O', name: 'Neural2-O (en-GB)', gender: 'male', languages: ['en-GB'], family: 'Neural2' },
    { id: 'en-GB-Standard-A', name: 'Standard-A (en-GB)', gender: 'female', languages: ['en-GB'], family: 'Standard' },
    { id: 'en-GB-Standard-B', name: 'Standard-B (en-GB)', gender: 'male', languages: ['en-GB'], family: 'Standard' },
    { id: 'en-GB-Standard-C', name: 'Standard-C (en-GB)', gender: 'female', languages: ['en-GB'], family: 'Standard' },
    { id: 'en-GB-Standard-D', name: 'Standard-D (en-GB)', gender: 'male', languages: ['en-GB'], family: 'Standard' },
    { id: 'en-GB-Wavenet-A', name: 'Wavenet-A (en-GB)', gender: 'female', languages: ['en-GB'], family: 'WaveNet' },
    { id: 'en-GB-Wavenet-B', name: 'Wavenet-B (en-GB)', gender: 'male', languages: ['en-GB'], family: 'WaveNet' },
    { id: 'en-GB-Wavenet-C', name: 'Wavenet-C (en-GB)', gender: 'female', languages: ['en-GB'], family: 'WaveNet' },
    { id: 'en-GB-Wavenet-D', name: 'Wavenet-D (en-GB)', gender: 'male', languages: ['en-GB'], family: 'WaveNet' },
    { id: 'en-GB-Studio-B', name: 'Studio-B (en-GB)', gender: 'male', languages: ['en-GB'], family: 'Studio' },
    { id: 'en-GB-Studio-C', name: 'Studio-C (en-GB)', gender: 'female', languages: ['en-GB'], family: 'Studio' },
  ],
  'es-ES': [
    { id: 'es-ES-Neural2-A', name: 'Neural2-A (es-ES)', gender: 'female', languages: ['es-ES'], family: 'Neural2' },
    { id: 'es-ES-Neural2-B', name: 'Neural2-B (es-ES)', gender: 'male', languages: ['es-ES'], family: 'Neural2' },
    { id: 'es-ES-Neural2-C', name: 'Neural2-C (es-ES)', gender: 'female', languages: ['es-ES'], family: 'Neural2' },
    { id: 'es-ES-Neural2-D', name: 'Neural2-D (es-ES)', gender: 'male', languages: ['es-ES'], family: 'Neural2' },
    { id: 'es-ES-Standard-A', name: 'Standard-A (es-ES)', gender: 'female', languages: ['es-ES'], family: 'Standard' },
    { id: 'es-ES-Standard-B', name: 'Standard-B (es-ES)', gender: 'male', languages: ['es-ES'], family: 'Standard' },
    { id: 'es-ES-Wavenet-B', name: 'Wavenet-B (es-ES)', gender: 'male', languages: ['es-ES'], family: 'WaveNet' },
    { id: 'es-ES-Wavenet-C', name: 'Wavenet-C (es-ES)', gender: 'female', languages: ['es-ES'], family: 'WaveNet' },
  ],
  'de-DE': [
    { id: 'de-DE-Chirp-HD-D', name: 'Chirp-HD-D (de-DE)', gender: 'male', languages: ['de-DE'], family: 'Chirp-HD' },
    { id: 'de-DE-Chirp-HD-F', name: 'Chirp-HD-F (de-DE)', gender: 'female', languages: ['de-DE'], family: 'Chirp-HD' },
    { id: 'de-DE-Chirp-HD-O', name: 'Chirp-HD-O (de-DE)', gender: 'female', languages: ['de-DE'], family: 'Chirp-HD' },
    { id: 'de-DE-Neural2-D', name: 'Neural2-D (de-DE)', gender: 'female', languages: ['de-DE'], family: 'Neural2' },
    { id: 'de-DE-Neural2-E', name: 'Neural2-E (de-DE)', gender: 'male', languages: ['de-DE'], family: 'Neural2' },
    { id: 'de-DE-Neural2-F', name: 'Neural2-F (de-DE)', gender: 'female', languages: ['de-DE'], family: 'Neural2' },
    { id: 'de-DE-Standard-B', name: 'Standard-B (de-DE)', gender: 'female', languages: ['de-DE'], family: 'Standard' },
    { id: 'de-DE-Standard-C', name: 'Standard-C (de-DE)', gender: 'male', languages: ['de-DE'], family: 'Standard' },
    { id: 'de-DE-Standard-F', name: 'Standard-F (de-DE)', gender: 'female', languages: ['de-DE'], family: 'Standard' },
    { id: 'de-DE-Wavenet-B', name: 'Wavenet-B (de-DE)', gender: 'female', languages: ['de-DE'], family: 'WaveNet' },
    { id: 'de-DE-Wavenet-C', name: 'Wavenet-C (de-DE)', gender: 'male', languages: ['de-DE'], family: 'WaveNet' },
    { id: 'de-DE-Wavenet-F', name: 'Wavenet-F (de-DE)', gender: 'female', languages: ['de-DE'], family: 'WaveNet' },
    { id: 'de-DE-Studio-A', name: 'Studio-A (de-DE)', gender: 'female', languages: ['de-DE'], family: 'Studio' },
    { id: 'de-DE-Studio-D', name: 'Studio-D (de-DE)', gender: 'male', languages: ['de-DE'], family: 'Studio' },
    { id: 'de-DE-Polyglot-1', name: 'Polyglot-1 (de-DE)', gender: 'male', languages: ['de-DE'], family: 'Polyglot' },
  ],
  'it-IT': [
    { id: 'it-IT-Neural2-A', name: 'Neural2-A (it-IT)', gender: 'female', languages: ['it-IT'], family: 'Neural2' },
    { id: 'it-IT-Neural2-B', name: 'Neural2-B (it-IT)', gender: 'male', languages: ['it-IT'], family: 'Neural2' },
    { id: 'it-IT-Neural2-C', name: 'Neural2-C (it-IT)', gender: 'female', languages: ['it-IT'], family: 'Neural2' },
    { id: 'it-IT-Neural2-D', name: 'Neural2-D (it-IT)', gender: 'male', languages: ['it-IT'], family: 'Neural2' },
    { id: 'it-IT-Standard-A', name: 'Standard-A (it-IT)', gender: 'female', languages: ['it-IT'], family: 'Standard' },
    { id: 'it-IT-Standard-B', name: 'Standard-B (it-IT)', gender: 'male', languages: ['it-IT'], family: 'Standard' },
    { id: 'it-IT-Standard-C', name: 'Standard-C (it-IT)', gender: 'female', languages: ['it-IT'], family: 'Standard' },
    { id: 'it-IT-Standard-D', name: 'Standard-D (it-IT)', gender: 'male', languages: ['it-IT'], family: 'Standard' },
    { id: 'it-IT-Wavenet-A', name: 'Wavenet-A (it-IT)', gender: 'female', languages: ['it-IT'], family: 'WaveNet' },
    { id: 'it-IT-Wavenet-B', name: 'Wavenet-B (it-IT)', gender: 'male', languages: ['it-IT'], family: 'WaveNet' },
    { id: 'it-IT-Wavenet-C', name: 'Wavenet-C (it-IT)', gender: 'female', languages: ['it-IT'], family: 'WaveNet' },
    { id: 'it-IT-Wavenet-D', name: 'Wavenet-D (it-IT)', gender: 'male', languages: ['it-IT'], family: 'WaveNet' },
  ],
  'pt-BR': [
    { id: 'pt-BR-Neural2-A', name: 'Neural2-A (pt-BR)', gender: 'female', languages: ['pt-BR'], family: 'Neural2' },
    { id: 'pt-BR-Neural2-B', name: 'Neural2-B (pt-BR)', gender: 'male', languages: ['pt-BR'], family: 'Neural2' },
    { id: 'pt-BR-Neural2-C', name: 'Neural2-C (pt-BR)', gender: 'male', languages: ['pt-BR'], family: 'Neural2' },
    { id: 'pt-BR-Neural2-D', name: 'Neural2-D (pt-BR)', gender: 'female', languages: ['pt-BR'], family: 'Neural2' },
    { id: 'pt-BR-Standard-A', name: 'Standard-A (pt-BR)', gender: 'female', languages: ['pt-BR'], family: 'Standard' },
    { id: 'pt-BR-Standard-B', name: 'Standard-B (pt-BR)', gender: 'male', languages: ['pt-BR'], family: 'Standard' },
    { id: 'pt-BR-Wavenet-A', name: 'Wavenet-A (pt-BR)', gender: 'female', languages: ['pt-BR'], family: 'WaveNet' },
    { id: 'pt-BR-Wavenet-B', name: 'Wavenet-B (pt-BR)', gender: 'male', languages: ['pt-BR'], family: 'WaveNet' },
    { id: 'pt-BR-Wavenet-C', name: 'Wavenet-C (pt-BR)', gender: 'male', languages: ['pt-BR'], family: 'WaveNet' },
    { id: 'pt-BR-Wavenet-D', name: 'Wavenet-D (pt-BR)', gender: 'female', languages: ['pt-BR'], family: 'WaveNet' },
  ],
  'ja-JP': [
    { id: 'ja-JP-Standard-A', name: 'Standard-A (ja-JP)', gender: 'female', languages: ['ja-JP'], family: 'Standard' },
    { id: 'ja-JP-Standard-B', name: 'Standard-B (ja-JP)', gender: 'male', languages: ['ja-JP'], family: 'Standard' },
    { id: 'ja-JP-Standard-C', name: 'Standard-C (ja-JP)', gender: 'female', languages: ['ja-JP'], family: 'Standard' },
    { id: 'ja-JP-Standard-D', name: 'Standard-D (ja-JP)', gender: 'male', languages: ['ja-JP'], family: 'Standard' },
    { id: 'ja-JP-Wavenet-A', name: 'Wavenet-A (ja-JP)', gender: 'female', languages: ['ja-JP'], family: 'WaveNet' },
    { id: 'ja-JP-Wavenet-B', name: 'Wavenet-B (ja-JP)', gender: 'male', languages: ['ja-JP'], family: 'WaveNet' },
    { id: 'ja-JP-Wavenet-C', name: 'Wavenet-C (ja-JP)', gender: 'female', languages: ['ja-JP'], family: 'WaveNet' },
    { id: 'ja-JP-Wavenet-D', name: 'Wavenet-D (ja-JP)', gender: 'male', languages: ['ja-JP'], family: 'WaveNet' },
    { id: 'ja-JP-Neural2-B', name: 'Neural2-B (ja-JP)', gender: 'male', languages: ['ja-JP'], family: 'Neural2' },
    { id: 'ja-JP-Neural2-C', name: 'Neural2-C (ja-JP)', gender: 'female', languages: ['ja-JP'], family: 'Neural2' },
    { id: 'ja-JP-Neural2-D', name: 'Neural2-D (ja-JP)', gender: 'male', languages: ['ja-JP'], family: 'Neural2' },
    { id: 'ja-JP-Neural2-F', name: 'Neural2-F (ja-JP)', gender: 'female', languages: ['ja-JP'], family: 'Neural2' },
  ],
  // zh-CN : seule la famille Chirp3-HD a pu etre verifiee (voir en-tete de fichier).
  'zh-CN': [],
};

/**
 * Catalogue des voix Google Cloud Text-to-Speech pour les 9 locales
 * declarees par l'adaptateur (FR-013) : Chirp3-HD (30 voix, toutes locales)
 * + les familles verifiees par locale ci-dessus.
 */
export const GOOGLE_TTS_VOICES: readonly GoogleCatalogVoice[] = CHIRP3_HD_LOCALES.flatMap((locale) => [
  ...chirp3HdVoicesFor(locale),
  ...(ADDITIONAL_VOICES_BY_LOCALE[locale] ?? []),
]);

export type GoogleTTSVoice = (typeof GOOGLE_TTS_VOICES)[number]['id'] | (string & {});

/** Voix Cloud TTS par defaut pour chaque locale declaree (premiere voix Neural2/Standard feminine documentee, sinon la premiere Chirp3-HD). */
export const GOOGLE_DEFAULT_TTS_VOICE_BY_LANGUAGE: Readonly<Record<string, string>> = {
  'fr-FR': 'fr-FR-Chirp3-HD-Kore',
  'en-US': 'en-US-Chirp3-HD-Kore',
  'en-GB': 'en-GB-Chirp3-HD-Kore',
  'es-ES': 'es-ES-Chirp3-HD-Kore',
  'de-DE': 'de-DE-Chirp3-HD-Kore',
  'it-IT': 'it-IT-Chirp3-HD-Kore',
  'pt-BR': 'pt-BR-Chirp3-HD-Kore',
  'ja-JP': 'ja-JP-Chirp3-HD-Kore',
  'zh-CN': 'zh-CN-Chirp3-HD-Kore',
};

/** Retourne la voix Cloud TTS par defaut pour une langue declaree, ou `undefined` si aucune n'est catalogee (FR-005, ne leve jamais). */
export function getGoogleDefaultTTSVoice(language: string): string | undefined {
  return GOOGLE_DEFAULT_TTS_VOICE_BY_LANGUAGE[language];
}
