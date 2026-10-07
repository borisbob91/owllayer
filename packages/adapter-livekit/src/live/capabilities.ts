import type { LLMAdapterCapabilities, VoiceInfo } from '@owllayer/core';
import type { GeminiTTSVoiceName } from '../tts/geminiVoices.js';

// ============================================================
// Catalogue Gemini Live via LiveKit. Corrige (genres, modeles) par rapport a
// la documentation officielle Google (recherche R4/FR-009 : memes 30 voix et
// genres que @owllayer/adapter-google, verifies independamment par les tests
// des deux paquets contre les memes valeurs documentees ; aucun import
// croise entre paquets). Verifie le GEMINI_CATALOG_VERIFIED_AT ci-dessous.
// Sources (2026-09-28) : ai.google.dev/gemini-api/docs/{models,deprecations,
// live-guide,speech-generation}, docs.cloud.google.com/text-to-speech/docs/chirp3-hd.
// ============================================================

/** Date (ISO) de la derniere verification du catalogue Live par rapport a la documentation Google. */
export const GEMINI_CATALOG_VERIFIED_AT = '2026-09-28';

/**
 * Default Live model, the same as `@owllayer/adapter-google`. The LiveKit Google plugin applies
 * new tools by resuming the session with its handle: Gemini 2.5 takes them (verified on the live
 * API on 2026-10-07), Gemini 3.x Live keeps the tools of the opening.
 */
export const DEFAULT_GEMINI_LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
export const DEFAULT_GEMINI_LIVE_VERTEX_MODEL = 'gemini-live-2.5-flash-native-audio';
export const DEFAULT_GEMINI_LIVE_VOICE = 'Puck';

export type GeminiCatalogStatus = 'stable' | 'preview';

/** Entree de modele Gemini Live (data-model.md CatalogModel). */
export interface GeminiCatalogModel {
  id: string;
  name: string;
  role: 'live';
  status: GeminiCatalogStatus;
  languages?: readonly string[];
  description?: string;
}

/** Modeles Gemini Live documentes (ai.google.dev/gemini-api/docs/live-guide), memes ids que @owllayer/adapter-google. */
export const GEMINI_LIVE_MODELS = [
  {
    id: 'gemini-2.5-flash-native-audio-preview-12-2025',
    name: 'Gemini 2.5 Flash Native Audio (Preview)',
    role: 'live',
    status: 'preview',
    languages: ['multilingual'],
    description: 'Modele Live par defaut : prend les nouveaux tools a la reprise de session (navigation)',
  },
  {
    id: 'gemini-3.8-live',
    name: 'Gemini 3.8 Live',
    role: 'live',
    status: 'stable',
    languages: ['multilingual'],
    description: "Agents vocaux a faible latence ; garde les tools de l'ouverture de session",
  },
  {
    id: 'gemini-3.8-live-extended-thinking',
    name: 'Gemini 3.8 Live Extended Thinking',
    role: 'live',
    status: 'stable',
    languages: ['multilingual'],
    description: 'Raisonnement renforce pour les interactions vocales',
  },
  {
    id: 'gemini-3.1-flash-live-preview',
    name: 'Gemini 3.1 Flash Live (Preview)',
    role: 'live',
    status: 'preview',
    languages: ['multilingual'],
    description: 'Modele Live legacy, mise a jour recommandee vers Gemini 3.8 Live',
  },
] as const satisfies readonly GeminiCatalogModel[];

/** Identifiant de modele Gemini Live : id catalogue ou toute autre chaine (autocompletion + ouverture, FR-004). */
export type GeminiLiveModel = (typeof GEMINI_LIVE_MODELS)[number]['id'] | (string & {});

/** Identifiant de voix Gemini (Live ou TTS, memes 30 noms) : id catalogue ou toute autre chaine (FR-004). */
export type GeminiVoice = GeminiTTSVoiceName | (string & {});

/** Entree de voix Gemini (data-model.md CatalogVoice), memes ids/genres que GEMINI_VOICES de @owllayer/adapter-google (FR-009). */
export interface GeminiCatalogVoice {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'neutral';
  languages: readonly string[];
}

/**
 * Les 30 voix Gemini prebuilt documentees (ai.google.dev/gemini-api/docs/speech-generation),
 * genre depuis docs.cloud.google.com/text-to-speech/docs/chirp3-hd. Corrige
 * `Puck` (documente male, marque `neutral` auparavant) et complete les 22
 * voix manquantes de l'ancienne liste (8 voix).
 */
export const GEMINI_LIVE_VOICES: VoiceInfo[] = [
  { id: 'Zephyr', name: 'Zephyr', gender: 'female', language: 'multilingual' },
  { id: 'Puck', name: 'Puck', gender: 'male', language: 'multilingual' },
  { id: 'Charon', name: 'Charon', gender: 'male', language: 'multilingual' },
  { id: 'Kore', name: 'Kore', gender: 'female', language: 'multilingual' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'male', language: 'multilingual' },
  { id: 'Leda', name: 'Leda', gender: 'female', language: 'multilingual' },
  { id: 'Orus', name: 'Orus', gender: 'male', language: 'multilingual' },
  { id: 'Aoede', name: 'Aoede', gender: 'female', language: 'multilingual' },
  { id: 'Callirrhoe', name: 'Callirrhoe', gender: 'female', language: 'multilingual' },
  { id: 'Autonoe', name: 'Autonoe', gender: 'female', language: 'multilingual' },
  { id: 'Enceladus', name: 'Enceladus', gender: 'male', language: 'multilingual' },
  { id: 'Iapetus', name: 'Iapetus', gender: 'male', language: 'multilingual' },
  { id: 'Umbriel', name: 'Umbriel', gender: 'male', language: 'multilingual' },
  { id: 'Algieba', name: 'Algieba', gender: 'male', language: 'multilingual' },
  { id: 'Despina', name: 'Despina', gender: 'female', language: 'multilingual' },
  { id: 'Erinome', name: 'Erinome', gender: 'female', language: 'multilingual' },
  { id: 'Algenib', name: 'Algenib', gender: 'male', language: 'multilingual' },
  { id: 'Rasalgethi', name: 'Rasalgethi', gender: 'male', language: 'multilingual' },
  { id: 'Laomedeia', name: 'Laomedeia', gender: 'female', language: 'multilingual' },
  { id: 'Achernar', name: 'Achernar', gender: 'female', language: 'multilingual' },
  { id: 'Alnilam', name: 'Alnilam', gender: 'male', language: 'multilingual' },
  { id: 'Schedar', name: 'Schedar', gender: 'male', language: 'multilingual' },
  { id: 'Gacrux', name: 'Gacrux', gender: 'female', language: 'multilingual' },
  { id: 'Pulcherrima', name: 'Pulcherrima', gender: 'female', language: 'multilingual' },
  { id: 'Achird', name: 'Achird', gender: 'male', language: 'multilingual' },
  { id: 'Zubenelgenubi', name: 'Zubenelgenubi', gender: 'male', language: 'multilingual' },
  { id: 'Vindemiatrix', name: 'Vindemiatrix', gender: 'female', language: 'multilingual' },
  { id: 'Sadachbia', name: 'Sadachbia', gender: 'male', language: 'multilingual' },
  { id: 'Sadaltager', name: 'Sadaltager', gender: 'male', language: 'multilingual' },
  { id: 'Sulafat', name: 'Sulafat', gender: 'female', language: 'multilingual' },
];

export type GeminiDeprecatedStatus = 'deprecated' | 'retired';

/** Entree du catalogue deprecie Gemini (data-model.md DeprecatedModel), memes ids que @owllayer/adapter-google quand ils se recouvrent. */
export interface GeminiDeprecatedModel {
  id: string;
  role: 'live' | 'tts';
  status: GeminiDeprecatedStatus;
  shutdownDate?: string;
  replacement?: string;
  source: string;
}

/**
 * Modeles Gemini (Live et TTS) deprecies ou retires, ou presents dans le
 * code d'origine sans etre documentes aujourd'hui (FR-018). Toujours
 * acceptes en entree (constante ou chaine libre) mais declenchent un
 * avertissement a la construction (FR-016).
 */
export const GEMINI_DEPRECATED_MODELS = [
  {
    id: 'gemini-2.5-flash-native-audio-preview',
    role: 'live',
    status: 'deprecated',
    replacement: 'gemini-2.5-flash-native-audio-preview-12-2025',
    source: 'ai.google.dev/gemini-api/docs/live-guide (absent, FR-018)',
  },
  {
    id: 'gemini-3.1-live-preview',
    role: 'live',
    status: 'deprecated',
    replacement: 'gemini-3.1-flash-live-preview',
    source: 'ai.google.dev/gemini-api/docs/live-guide (identifiant absent ; le modele preview documente est gemini-3.1-flash-live-preview, FR-018)',
  },
  {
    id: 'gemini-2.5-flash-tts',
    role: 'tts',
    status: 'deprecated',
    replacement: 'gemini-3.8-flash-tts',
    source: 'ai.google.dev/gemini-api/docs/speech-generation (absent, FR-018)',
  },
  {
    id: 'gemini-2.5-flash-lite-preview-tts',
    role: 'tts',
    status: 'deprecated',
    replacement: 'gemini-3.8-flash-lite-tts',
    source: 'ai.google.dev/gemini-api/docs/speech-generation (absent, FR-018)',
  },
  {
    id: 'gemini-2.5-pro-tts',
    role: 'tts',
    status: 'deprecated',
    replacement: 'gemini-2.5-pro-preview-tts',
    source: 'ai.google.dev/gemini-api/docs/speech-generation (identifiant absent ; la variante documentee est gemini-2.5-pro-preview-tts, elle-meme absente des pages courantes, FR-018)',
  },
] as const satisfies readonly GeminiDeprecatedModel[];

const DEPRECATED_MODELS_BY_ID: Map<string, GeminiDeprecatedModel> = new Map(
  GEMINI_DEPRECATED_MODELS.map((entry) => [entry.id, entry]),
);

/** Retourne l'entree du catalogue deprecie pour un identifiant, ou `undefined` (FR-016, ne leve jamais). */
export function getGeminiDeprecatedModel(id: string): GeminiDeprecatedModel | undefined {
  return DEPRECATED_MODELS_BY_ID.get(id);
}

export function buildGeminiLiveCapabilities(
  currentModel = DEFAULT_GEMINI_LIVE_MODEL,
  currentVoice = DEFAULT_GEMINI_LIVE_VOICE
): LLMAdapterCapabilities {
  return {
    provider: 'livekit-gemini',
    providerName: 'LiveKit Gemini Live',
    currentModel,
    currentVoice,
    models: GEMINI_LIVE_MODELS.map((entry) => ({
      id: entry.id,
      name: entry.name,
      supportsAudio: true,
      supportsTools: true,
      supportsStreaming: true,
      description: entry.description,
    })),
    voices: GEMINI_LIVE_VOICES.map((voice) => ({ ...voice })),
  };
}
