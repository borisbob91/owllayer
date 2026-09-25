// ============================================================
// Catalogue type des modeles et voix OpenAI
// Listes `as const` : autocompletion + catalogue runtime (getCapabilities).
// `(string & {})` garde l'ouverture aux ids non listes (snapshots dates,
// fournisseurs compatibles OpenAI comme DeepSeek, deploiements Azure).
// ============================================================

/** Modeles Chat Completions (mode texte). */
export const OPENAI_CHAT_MODELS = [
  'gpt-5.5',
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5.4-nano',
  'gpt-5.2',
  'gpt-5.2-chat-latest',
  'gpt-5.1',
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano',
  'gpt-5-chat-latest',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4o',
  'gpt-4o-mini',
  'o4-mini',
  'o3',
] as const;

/**
 * Modeles Realtime (speech-to-speech, API GA).
 * gpt-realtime-2* raisonnent avant de parler ; gpt-realtime-1.5 est le modele
 * rapide sans raisonnement.
 */
export const OPENAI_REALTIME_MODELS = [
  'gpt-realtime-1.5',
  'gpt-realtime-2',
  'gpt-realtime-2.1',
  'gpt-realtime-2.1-mini',
  'gpt-realtime-mini',
  'gpt-realtime',
] as const;

/** Effort de raisonnement des modeles gpt-realtime-2*. */
export type OpenAIRealtimeReasoningEffort = 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

/** Modeles Text-to-Speech. `instructions` n'est supporte que par gpt-4o-mini-tts. */
export const OPENAI_TTS_MODELS = [
  'gpt-4o-mini-tts',
  'tts-1',
  'tts-1-hd',
] as const;

/** Modeles Speech-to-Text. Seul whisper-1 supporte verbose_json/srt/vtt. */
export const OPENAI_STT_MODELS = [
  'gpt-4o-transcribe',
  'gpt-4o-mini-transcribe',
  'whisper-1',
] as const;

/** Voix Text-to-Speech (API audio/speech). */
export const OPENAI_TTS_VOICES = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'onyx',
  'nova',
  'sage',
  'shimmer',
  'verse',
  'marin',
  'cedar',
] as const;

/** Voix Realtime (sous-ensemble : pas de fable, onyx, nova). */
export const OPENAI_REALTIME_VOICES = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
  'marin',
  'cedar',
] as const;

export type OpenAIChatModel = (typeof OPENAI_CHAT_MODELS)[number] | (string & {});
export type OpenAIRealtimeModel = (typeof OPENAI_REALTIME_MODELS)[number] | (string & {});
export type OpenAITTSModel = (typeof OPENAI_TTS_MODELS)[number] | (string & {});
export type OpenAISTTModel = (typeof OPENAI_STT_MODELS)[number] | (string & {});
export type OpenAITTSVoice = (typeof OPENAI_TTS_VOICES)[number] | (string & {});
export type OpenAIRealtimeVoice = (typeof OPENAI_REALTIME_VOICES)[number] | (string & {});

/** Modeles Realtime qui acceptent `reasoning.effort` (gpt-realtime-2*). */
export function isOpenAIRealtimeReasoningModel(model: string): boolean {
  return model.startsWith('gpt-realtime-2');
}

/**
 * Modeles de raisonnement (o-series, GPT-5+ hors variantes `chat`) :
 * ils rejettent un `temperature` different de la valeur par defaut.
 */
export function isOpenAIReasoningModel(model: string): boolean {
  return /^(o\d|gpt-5|gpt-6)/.test(model) && !model.includes('chat');
}
