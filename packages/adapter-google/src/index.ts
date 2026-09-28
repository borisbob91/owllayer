// --- Mode Texte (requete/reponse) ---
export { GoogleAdapter } from './GoogleAdapter.js';
export type { GoogleAdapterOptions } from './GoogleAdapter.js';

// --- Mode Live Audio (streaming bidirectionnel) ---
export { GoogleLiveAdapter } from './GoogleLiveAdapter.js';
export type { GoogleLiveAdapterOptions } from './GoogleLiveAdapter.js';
export type { GoogleLiveSession } from './events.js';

// --- Speech Providers ---
export { GoogleSTT } from './GoogleSTT.js';
export type { GoogleSTTOptions } from './GoogleSTT.js';
export { GoogleTTS } from './GoogleTTS.js';
export type { GoogleTTSOptions } from './GoogleTTS.js';

// --- Utils ---
export { toGeminiFunctionDeclarations } from './toolConverter.js';

// --- Catalogue type des modeles et voix (Gemini + Cloud Speech) ---
export {
  GOOGLE_CATALOG_VERIFIED_AT,
  GOOGLE_TEXT_MODELS,
  GOOGLE_LIVE_MODELS,
  GOOGLE_STT_MODELS,
  GOOGLE_STT_LANGUAGES,
  GOOGLE_TTS_MODELS,
  GOOGLE_TTS_LANGUAGES,
  GOOGLE_DEFAULT_TEXT_MODEL,
  GOOGLE_DEFAULT_LIVE_MODEL,
  GOOGLE_DEFAULT_LIVE_VOICE,
  GOOGLE_DEFAULT_STT_MODEL,
  GEMINI_VOICES,
  GOOGLE_DEPRECATED_MODELS,
  isKnownGoogleModel,
  getGoogleDeprecatedModel,
} from './catalog.js';
export type {
  GoogleCatalogRole,
  GoogleCatalogStatus,
  GoogleCatalogModel,
  GoogleCatalogVoice,
  GoogleDeprecatedStatus,
  GoogleDeprecatedModel,
  LanguageSupport,
  GoogleTextModel,
  GoogleLiveModel,
  GoogleSTTModel,
  GeminiVoice,
} from './catalog.js';
export {
  GOOGLE_TTS_VOICES,
  GOOGLE_DEFAULT_TTS_VOICE_BY_LANGUAGE,
  getGoogleDefaultTTSVoice,
} from './googleTtsVoices.js';
export type { GoogleTTSVoice } from './googleTtsVoices.js';
export { isKnownGoogleVoice, googleSupportsLanguage } from './language.js';
export { warnIfDeprecatedGoogleModel, warnIfUnsupportedGoogleLanguage } from './warnings.js';
export type { WarnLogger } from './warnings.js';

// --- Event Contracts ---
export type {
	GoogleAdapterAnyEventListener,
	GoogleAdapterEvent,
	GoogleAdapterEventListener,
	GoogleAdapterEventMap,
	GoogleAdapterEventOf,
	GoogleAdapterEventType,
	GoogleLiveAnyEventListener,
	GoogleLiveEvent,
	GoogleLiveEventListener,
	GoogleLiveEventMap,
	GoogleLiveEventOf,
	GoogleLiveEventType,
	GoogleLiveSessionConfig,
} from './events.js';
