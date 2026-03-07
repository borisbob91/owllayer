// ============================================================
// Speech Services Index
// Export all speech-related types and services
// ============================================================

// Types
export * from './types.js';

// Constants (enums, voix, langues, presets)
export * from './constants.js';

// Base Services
export * from './STTService.js';
export * from './TTSService.js';

// Providers - OpenAI
export { WhisperSTT } from './providers/WhisperSTT.js';
export type { WhisperSTTOptions } from './providers/WhisperSTT.js';
export { OpenAITTS } from './providers/OpenAITTS.js';
export type { OpenAITTSOptions } from './providers/OpenAITTS.js';

// Providers - Google
export { GoogleSTT } from './providers/GoogleSTT.js';
export type { GoogleSTTOptions } from './providers/GoogleSTT.js';
export { GoogleTTS } from './providers/GoogleTTS.js';
export type { GoogleTTSOptions } from './providers/GoogleTTS.js';

// Providers - ElevenLabs
export { ElevenLabsTTS } from './providers/ElevenLabsTTS.js';
export type { ElevenLabsTTSOptions } from './providers/ElevenLabsTTS.js';
