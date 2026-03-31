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

// Providers - ElevenLabs
export { ElevenLabsTTS } from './providers/ElevenLabsTTS.js';
export type { ElevenLabsTTSOptions } from './providers/ElevenLabsTTS.js';
