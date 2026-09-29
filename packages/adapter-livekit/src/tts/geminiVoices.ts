import type { SpeechCapabilities, Voice, VoiceInfo } from '@owllayer/core';

// ============================================================
// Catalogue Gemini TTS via LiveKit. Corrige (genres, modeles) par rapport a
// la documentation officielle Google (research R4/FR-009, memes 30 voix et
// genres que @owllayer/adapter-google). `gemini-2.5-flash-tts`,
// `gemini-2.5-flash-lite-preview-tts` et `gemini-2.5-pro-tts` n'apparaissent
// pas sur les pages officielles a la date de verification : deplaces vers
// GEMINI_DEPRECATED_MODELS (FR-018), remplaces par les ids verifies.
// ============================================================

export const DEFAULT_GEMINI_TTS_MODEL = 'gemini-3.1-flash-tts-preview';
export const DEFAULT_GEMINI_TTS_VOICE = 'Kore';

export const GEMINI_TTS_MODELS = [
  {
    id: 'gemini-3.1-flash-tts-preview',
    name: 'Gemini 3.1 Flash TTS Preview',
    description: 'Default Gemini TTS preview model exposed by LiveKit Google plugin 1.5.0.',
  },
  {
    id: 'gemini-3.8-flash-tts',
    name: 'Gemini 3.8 Flash TTS',
    description: 'Flagship Gemini TTS model, studio-grade voice fidelity across 130+ languages.',
  },
  {
    id: 'gemini-3.8-flash-lite-tts',
    name: 'Gemini 3.8 Flash-Lite TTS',
    description: 'Fast, cost-efficient Gemini TTS model across 101 languages.',
  },
] as const;

const GEMINI_VOICE_GENDERS = {
  Zephyr: 'female',
  Puck: 'male',
  Charon: 'male',
  Kore: 'female',
  Fenrir: 'male',
  Leda: 'female',
  Orus: 'male',
  Aoede: 'female',
  Callirrhoe: 'female',
  Autonoe: 'female',
  Enceladus: 'male',
  Iapetus: 'male',
  Umbriel: 'male',
  Algieba: 'male',
  Despina: 'female',
  Erinome: 'female',
  Algenib: 'male',
  Rasalgethi: 'male',
  Laomedeia: 'female',
  Achernar: 'female',
  Alnilam: 'male',
  Schedar: 'male',
  Gacrux: 'female',
  Pulcherrima: 'female',
  Achird: 'male',
  Zubenelgenubi: 'male',
  Vindemiatrix: 'female',
  Sadachbia: 'male',
  Sadaltager: 'male',
  Sulafat: 'female',
} as const satisfies Record<string, 'male' | 'female'>;

const GEMINI_VOICE_NAMES = Object.keys(GEMINI_VOICE_GENDERS) as (keyof typeof GEMINI_VOICE_GENDERS)[];

export type GeminiTTSVoiceName = (typeof GEMINI_VOICE_NAMES)[number];
export type GeminiTTSModelName = (typeof GEMINI_TTS_MODELS)[number]['id'];

export const GEMINI_TTS_VOICES: Voice[] = GEMINI_VOICE_NAMES.map((name) => ({
  id: name,
  name,
  gender: GEMINI_VOICE_GENDERS[name],
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
