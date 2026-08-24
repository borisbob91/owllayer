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

// --- Utils ---
export { toOpenAITools, toOpenAIRealtimeTools } from './toolConverter.js';
