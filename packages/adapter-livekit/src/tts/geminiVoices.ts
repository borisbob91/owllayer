import type { SpeechCapabilities, Voice, VoiceInfo } from '@owllayer/core';

export const DEFAULT_GEMINI_TTS_MODEL = 'gemini-3.1-flash-tts-preview';
export const DEFAULT_GEMINI_TTS_VOICE = 'Kore';

export const GEMINI_TTS_MODELS = [
  {
    id: 'gemini-3.1-flash-tts-preview',
    name: 'Gemini 3.1 Flash TTS Preview',
    description: 'Default Gemini TTS preview model exposed by LiveKit Google plugin 1.5.0.',
  },
  {
    id: 'gemini-2.5-flash-tts',
    name: 'Gemini 2.5 Flash TTS',
    description: 'Fast Gemini TTS model.',
  },
  {
    id: 'gemini-2.5-flash-lite-preview-tts',
    name: 'Gemini 2.5 Flash Lite TTS Preview',
    description: 'Lower-cost preview Gemini TTS model.',
  },
  {
    id: 'gemini-2.5-pro-tts',
    name: 'Gemini 2.5 Pro TTS',
    description: 'Higher quality Gemini TTS model.',
  },
] as const;

const GEMINI_VOICE_NAMES = [
  'Zephyr',
  'Puck',
  'Charon',
  'Kore',
  'Fenrir',
  'Leda',
  'Orus',
  'Aoede',
  'Callirrhoe',
  'Autonoe',
  'Enceladus',
  'Iapetus',
  'Umbriel',
  'Algieba',
  'Despina',
  'Erinome',
  'Algenib',
  'Rasalgethi',
  'Laomedeia',
  'Achernar',
  'Alnilam',
  'Schedar',
  'Gacrux',
  'Pulcherrima',
  'Achird',
  'Zubenelgenubi',
  'Vindemiatrix',
  'Sadachbia',
  'Sadaltager',
  'Sulafat',
] as const;

export type GeminiTTSVoiceName = (typeof GEMINI_VOICE_NAMES)[number];
export type GeminiTTSModelName = (typeof GEMINI_TTS_MODELS)[number]['id'];

export const GEMINI_TTS_VOICES: Voice[] = GEMINI_VOICE_NAMES.map((name) => ({
  id: name,
  name,
  gender: 'neutral',
  languages: ['multilingual'],
  description: `Gemini TTS voice ${name}`,
  style: 'general',
}));

export const GEMINI_TTS_VOICE_INFOS: VoiceInfo[] = GEMINI_TTS_VOICES.map((voice) => ({
  id: voice.id,
  name: voice.name,
  gender: voice.gender,
  language: 'multilingual',
}));

export function buildGeminiTTSCapabilities(
  currentVoice: string,
  currentModel: string,
  currentLanguage?: string
): SpeechCapabilities {
  return {
    provider: 'gemini-tts',
    providerName: 'Gemini TTS via LiveKit',
    currentVoice,
    currentLanguage,
    models: GEMINI_TTS_MODELS.map((model) => ({ ...model })),
    voices: GEMINI_TTS_VOICE_INFOS.map((voice) => ({ ...voice })),
    languages: ['multilingual'],
  };
}
