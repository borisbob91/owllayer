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
