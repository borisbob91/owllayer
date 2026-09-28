// ============================================================
// @owllayer/adapter-openai - OwlLayer Adapter pour OpenAI
// Mode Texte (Chat Completions) + Mode Live (Realtime API)
// ============================================================

// --- Mode Texte (requete/reponse) ---
export { OpenAIAdapter } from './OpenAIAdapter.js';
export type { OpenAIAdapterOptions } from './OpenAIAdapter.js';
export type {
	OpenAIAdapterAnyEventListener,
	OpenAIAdapterEvent,
	OpenAIAdapterEventListener,
	OpenAIAdapterEventMap,
	OpenAIAdapterEventType,
} from './events.js';

// --- Mode Live Audio (streaming bidirectionnel) ---
export { OpenAILiveAdapter } from './OpenAILiveAdapter.js';
export type { OpenAILiveAdapterOptions } from './OpenAILiveAdapter.js';
export type {
	OpenAILiveAnyEventListener,
	OpenAILiveEvent,
	OpenAILiveEventListener,
	OpenAILiveEventMap,
	OpenAILiveEventType,
	OpenAILiveSession,
	OpenAILiveSessionConfig,
} from './events.js';

// --- Speech Providers ---
export { WhisperSTT } from './WhisperSTT.js';
export type { WhisperSTTOptions } from './WhisperSTT.js';
export { OpenAITTS } from './OpenAITTS.js';
export type { OpenAITTSOptions } from './OpenAITTS.js';

// --- Catalogue type des modeles et voix ---
export {
	OPENAI_CHAT_MODELS,
	OPENAI_REALTIME_MODELS,
	OPENAI_TTS_MODELS,
	OPENAI_STT_MODELS,
	OPENAI_TTS_VOICES,
	OPENAI_REALTIME_VOICES,
	isOpenAIReasoningModel,
	isOpenAIRealtimeReasoningModel,
	OPENAI_CATALOG_VERIFIED_AT,
	OPENAI_MODEL_CATALOG,
	OPENAI_VOICE_CATALOG,
	OPENAI_LANGUAGES,
	OPENAI_DEFAULT_CHAT_MODEL,
	OPENAI_DEFAULT_REALTIME_MODEL,
	OPENAI_DEFAULT_REALTIME_VOICE,
	OPENAI_DEFAULT_TTS_MODEL,
	OPENAI_DEFAULT_TTS_VOICE,
	OPENAI_DEFAULT_STT_MODEL,
	OPENAI_DEPRECATED_MODELS,
	isKnownOpenAIModel,
	isKnownOpenAIVoice,
	openAISupportsLanguage,
	getOpenAIDeprecatedModel,
} from './models.js';
export type {
	OpenAIChatModel,
	OpenAIRealtimeModel,
	OpenAITTSModel,
	OpenAISTTModel,
	OpenAITTSVoice,
	OpenAIRealtimeVoice,
	OpenAIRealtimeReasoningEffort,
	OpenAICatalogRole,
	OpenAICatalogStatus,
	OpenAICatalogModel,
	OpenAICatalogVoice,
	OpenAIDeprecatedStatus,
	OpenAIDeprecatedModel,
	LanguageSupport,
} from './models.js';
export { warnIfDeprecatedOpenAIModel } from './warnings.js';
export type { WarnLogger } from './warnings.js';

// --- Utils ---
export { toOpenAITools, toOpenAIRealtimeTools } from './toolConverter.js';
