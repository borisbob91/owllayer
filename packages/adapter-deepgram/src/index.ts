// ============================================================
// @owllayer/adapter-deepgram
// Fondations (DG-0) + classes fournisseur livrees lot par lot.
// DG-1 : DeepgramNovaSTT (STT batch). DG-2 : DeepgramAuraTTS (TTS batch).
// Les classes restantes (DeepgramFluxSTT, streaming Aura,
// DeepgramVoiceAgentAdapter) arrivent avec les lots DG-4 a DG-7.
// ============================================================

// --- Speech Providers ---
export { DeepgramNovaSTT } from './DeepgramNovaSTT.js';
export { DeepgramAuraTTS } from './DeepgramAuraTTS.js';

// --- Catalogue type des modeles, voix et fournisseurs ---
export {
  DEEPGRAM_CATALOG_VERIFIED_AT,
  DEEPGRAM_NOVA_MODELS,
  DEEPGRAM_FLUX_MODELS,
  DEEPGRAM_STT_MODEL_LANGUAGES,
  DEEPGRAM_AURA_VOICES_BY_LANGUAGE,
  DEEPGRAM_AURA_VOICES,
  DEEPGRAM_DEFAULT_AURA_VOICE_BY_LANGUAGE,
  DEEPGRAM_THINK_PROVIDERS,
  DEEPGRAM_THINK_MODELS,
} from './models.js';
export type {
  DeepgramNovaModel,
  DeepgramFluxModel,
  DeepgramAuraVoice,
  DeepgramVoiceGender,
  DeepgramAuraVoiceEntry,
  DeepgramThinkProvider,
  DeepgramThinkModel,
  DeepgramThinkTier,
  DeepgramThinkModelEntry,
} from './models.js';

// --- Langue ---
export { normalizeLanguageCode, assertModelSupportsLanguage, resolveLanguageDefaults } from './language.js';
export type { DeepgramLanguageDefaults } from './language.js';

// --- Audio ---
export { mimeTypeToDeepgramEncoding, createEvenByteAligner } from './audio.js';
export type { DeepgramAudioEncoding } from './audio.js';

// --- Erreurs ---
export { toSpeechServiceError, getDeepgramErrorDetails } from './errors.js';
export type { DeepgramErrorCode } from './errors.js';

// --- Capacites ---
export {
  getDeepgramNovaSTTCapabilities,
  getDeepgramFluxSTTCapabilities,
  getDeepgramAuraTTSCapabilities,
  getDeepgramVoiceAgentCapabilities,
} from './capabilities.js';
export type { DeepgramSpeechCapabilities, DeepgramLLMAdapterCapabilities } from './capabilities.js';

// --- Evenements (observabilite, sans transcription ni audio) ---
export type { DeepgramFluxEventMap, DeepgramAuraEventMap, DeepgramVoiceAgentEventMap } from './events.js';

// --- Settings et Options (Studio-ready) ---
export {
  deepgramConnectionLimitsSchema,
  deepgramNovaSTTSettingsSchema,
  deepgramFluxSTTSettingsSchema,
  deepgramAuraTTSSettingsSchema,
  deepgramVoiceAgentSettingsSchema,
  parseDeepgramNovaSTTSettings,
  parseDeepgramFluxSTTSettings,
  parseDeepgramAuraTTSSettings,
  parseDeepgramVoiceAgentSettings,
  DEEPGRAM_AURA_MAX_TEXT_LENGTH,
} from './settings.js';
export type {
  DeepgramConnectionLimits,
  DeepgramNovaSTTSettings,
  DeepgramNovaSTTOptions,
  DeepgramFluxSTTSettings,
  DeepgramFluxSTTOptions,
  DeepgramAuraTTSSettings,
  DeepgramAuraTTSOptions,
  DeepgramVoiceAgentSettings,
  DeepgramVoiceAgentOptions,
} from './settings.js';
