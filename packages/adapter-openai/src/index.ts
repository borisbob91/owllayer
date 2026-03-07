// ============================================================
// @domos/adapter-openai - DomOS Adapter pour OpenAI
// Mode Texte (Chat Completions) + Mode Live (Realtime API)
// ============================================================

// --- Mode Texte (requete/reponse) ---
export { OpenAIAdapter } from './OpenAIAdapter.js';
export type { OpenAIAdapterOptions } from './OpenAIAdapter.js';

// --- Mode Live Audio (streaming bidirectionnel) ---
export { OpenAILiveAdapter } from './OpenAILiveAdapter.js';
export type { OpenAILiveAdapterOptions } from './OpenAILiveAdapter.js';

// --- Utils ---
export { toOpenAITools, toOpenAIRealtimeTools } from './toolConverter.js';
