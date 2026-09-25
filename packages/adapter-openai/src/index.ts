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
} from './models.js';
export type {
	OpenAIChatModel,
	OpenAIRealtimeModel,
	OpenAITTSModel,
	OpenAISTTModel,
	OpenAITTSVoice,
	OpenAIRealtimeVoice,
	OpenAIRealtimeReasoningEffort,
} from './models.js';

// --- Utils ---
export { toOpenAITools, toOpenAIRealtimeTools } from './toolConverter.js';
