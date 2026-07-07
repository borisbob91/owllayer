import type { LLMAdapterCapabilities, VoiceInfo } from '@domos/core';

export const DEFAULT_GEMINI_LIVE_MODEL =
  'gemini-2.5-flash-native-audio-preview-12-2025';
export const DEFAULT_GEMINI_LIVE_VERTEX_MODEL = 'gemini-live-2.5-flash-native-audio';
export const DEFAULT_GEMINI_LIVE_VOICE = 'Puck';

export const GEMINI_LIVE_VOICES: VoiceInfo[] = [
  { id: 'Puck', name: 'Puck', gender: 'neutral', language: 'multilingual' },
  { id: 'Charon', name: 'Charon', gender: 'male', language: 'multilingual' },
  { id: 'Kore', name: 'Kore', gender: 'female', language: 'multilingual' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'male', language: 'multilingual' },
  { id: 'Aoede', name: 'Aoede', gender: 'female', language: 'multilingual' },
  { id: 'Leda', name: 'Leda', gender: 'female', language: 'multilingual' },
  { id: 'Orus', name: 'Orus', gender: 'male', language: 'multilingual' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'neutral', language: 'multilingual' },
];

export function buildGeminiLiveCapabilities(
  currentModel = DEFAULT_GEMINI_LIVE_MODEL,
  currentVoice = DEFAULT_GEMINI_LIVE_VOICE
): LLMAdapterCapabilities {
  return {
    provider: 'livekit-gemini',
    providerName: 'LiveKit Gemini Live',
    currentModel,
    currentVoice,
    models: [
      {
        id: DEFAULT_GEMINI_LIVE_MODEL,
        name: 'Gemini 2.5 Flash Native Audio via LiveKit',
        supportsAudio: true,
        supportsTools: true,
        supportsStreaming: true,
        description:
          'Realtime audio/text with function calling. LiveKit Gemini currently requires a new session for mid-session tool list changes.',
      },
      {
        id: DEFAULT_GEMINI_LIVE_VERTEX_MODEL,
        name: 'Gemini Live 2.5 Flash Native Audio via Vertex AI',
        supportsAudio: true,
        supportsTools: true,
        supportsStreaming: true,
        description:
          'Vertex AI Gemini Live model. Requires project/location credentials on the server.',
      },
      {
        id: 'gemini-3.1-live-preview',
        name: 'Gemini 3.1 Live Preview',
        supportsAudio: true,
        supportsTools: true,
        supportsStreaming: true,
        description:
          'Preview model with limited mid-session chat, instruction and tool update support in LiveKit Agents 1.5.',
      },
    ],
    voices: GEMINI_LIVE_VOICES.map((voice) => ({ ...voice })),
  };
}
