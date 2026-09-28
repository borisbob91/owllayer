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

// ============================================================
// Catalogue etendu (role, statut, langues, defauts, catalogue deprecie)
// Verifie par rapport a la documentation officielle OpenAI le
// OPENAI_CATALOG_VERIFIED_AT ci-dessous. Les listes `OPENAI_*_MODELS` /
// `OPENAI_*_VOICES` ci-dessus et leurs types restent inchanges (FR-012) ;
// ce catalogue ajoute des champs et des aides sans rien retirer.
// Sources (2026-09-28) : developers.openai.com/api/docs/{models,deprecations,
// guides/text-to-speech,guides/realtime}.
// ============================================================

/** Date (ISO) de la derniere verification du catalogue par rapport a la documentation OpenAI. */
export const OPENAI_CATALOG_VERIFIED_AT = '2026-09-28';

export type OpenAICatalogRole = 'text' | 'live' | 'stt' | 'tts';
export type OpenAICatalogStatus = 'stable' | 'preview';

/** Entree de modele du catalogue OpenAI (data-model.md CatalogModel). */
export interface OpenAICatalogModel {
  id: string;
  name: string;
  role: OpenAICatalogRole;
  status: OpenAICatalogStatus;
  languages?: readonly string[];
  description?: string;
}

/** Entree de voix du catalogue OpenAI (data-model.md CatalogVoice). Genre non documente par OpenAI. */
export interface OpenAICatalogVoice {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'neutral';
  languages: readonly string[];
  /** `true` si la voix est aussi utilisable en mode Realtime (OPENAI_REALTIME_VOICES). */
  realtime: boolean;
}

export type OpenAIDeprecatedStatus = 'deprecated' | 'retired';

/** Entree du catalogue deprecie OpenAI (data-model.md DeprecatedModel). */
export interface OpenAIDeprecatedModel {
  id: string;
  role: OpenAICatalogRole;
  status: OpenAIDeprecatedStatus;
  shutdownDate?: string;
  replacement?: string;
  source: string;
}

export type LanguageSupport = { supported: true } | { supported: false; supportedLanguages: readonly string[] };

/**
 * Catalogue de modeles actifs (role + statut), construit a partir des listes
 * existantes ci-dessus (chat, realtime, tts, stt) plus les identifiants
 * actifs confirmes sur les pages officielles a la date de verification.
 * `gpt-5-chat-latest` et `gpt-5.2-chat-latest` (dans OPENAI_CHAT_MODELS,
 * inchange par compatibilite) sont retires cote fournisseur : absents d'ici,
 * repertories dans OPENAI_DEPRECATED_MODELS. `whisper-1`, `gpt-4o-transcribe`
 * et `gpt-4o-mini-transcribe` (dans OPENAI_STT_MODELS, inchange) sont
 * depreciees (arret annonce 2027-02-26) : absents d'ici, remplacees par
 * `gpt-transcribe` / `gpt-live-transcribe`.
 */
export const OPENAI_MODEL_CATALOG: readonly OpenAICatalogModel[] = [
  ...OPENAI_CHAT_MODELS.filter((id) => id !== 'gpt-5-chat-latest' && id !== 'gpt-5.2-chat-latest').map((id) => ({
    id,
    name: id,
    role: 'text' as const,
    status: 'stable' as const,
  })),
  { id: 'gpt-6-astra', name: 'GPT-6 Astra', role: 'text' as const, status: 'stable' as const, description: 'Le plus capable pour le raisonnement complexe et le code' },
  { id: 'gpt-6-sol', name: 'GPT-6 Sol', role: 'text' as const, status: 'stable' as const, description: 'Equilibre intelligence et cout' },
  { id: 'gpt-6-luna', name: 'GPT-6 Luna', role: 'text' as const, status: 'stable' as const, description: 'Le plus economique pour un fort debit' },
  ...OPENAI_REALTIME_MODELS.map((id) => ({ id, name: id, role: 'live' as const, status: 'stable' as const })),
  ...OPENAI_TTS_MODELS.map((id) => ({ id, name: id, role: 'tts' as const, status: 'stable' as const })),
  { id: 'gpt-transcribe', name: 'GPT Transcribe', role: 'stt' as const, status: 'stable' as const, description: 'Transcription haute precision (fichier)' },
  { id: 'gpt-live-transcribe', name: 'GPT Live Transcribe', role: 'stt' as const, status: 'stable' as const, description: 'Transcription temps reel a faible latence' },
];

/** Voix TTS et Realtime (13 voix TTS, dont 10 aussi disponibles en Realtime). Genre non documente par OpenAI. */
export const OPENAI_VOICE_CATALOG: readonly OpenAICatalogVoice[] = OPENAI_TTS_VOICES.map((id) => ({
  id,
  name: id.charAt(0).toUpperCase() + id.slice(1),
  languages: ['multilingual'] as const,
  realtime: (OPENAI_REALTIME_VOICES as readonly string[]).includes(id),
}));

/** Langues declarees : OpenAI documente 50+ langues pour le TTS/Whisper mais pas de liste de codes par modele. */
export const OPENAI_LANGUAGES = ['multilingual'] as const;

/** Defauts inchanges (aucun n'est deprecie a la date de verification), sauf STT (FR-010). */
export const OPENAI_DEFAULT_CHAT_MODEL = 'gpt-4o';
export const OPENAI_DEFAULT_REALTIME_MODEL = 'gpt-realtime-1.5';
export const OPENAI_DEFAULT_REALTIME_VOICE = 'alloy';
export const OPENAI_DEFAULT_TTS_MODEL = 'tts-1';
export const OPENAI_DEFAULT_TTS_VOICE = 'nova';
/** `whisper-1` est deprecie (arret annonce 2027-02-26) : remplacant documente (FR-010). */
export const OPENAI_DEFAULT_STT_MODEL = 'gpt-transcribe';

/**
 * Modeles OpenAI deprecies ou retires (developers.openai.com/api/docs/deprecations).
 * Toujours acceptes en entree (constante ou chaine libre) mais declenchent un
 * avertissement a la construction (FR-016).
 */
export const OPENAI_DEPRECATED_MODELS = [
  {
    id: 'gpt-5-chat-latest',
    role: 'text',
    status: 'retired',
    shutdownDate: '2026-07-23',
    replacement: 'gpt-5.6-sol',
    source: 'developers.openai.com/api/docs/deprecations',
  },
  {
    id: 'gpt-5.2-chat-latest',
    role: 'text',
    status: 'retired',
    shutdownDate: '2026-08-10',
    replacement: 'gpt-5.6-sol',
    source: 'developers.openai.com/api/docs/deprecations',
  },
  {
    id: 'whisper-1',
    role: 'stt',
    status: 'deprecated',
    shutdownDate: '2027-02-26',
    replacement: 'gpt-transcribe',
    source: 'developers.openai.com/api/docs/deprecations',
  },
  {
    id: 'gpt-4o-transcribe',
    role: 'stt',
    status: 'deprecated',
    shutdownDate: '2027-02-26',
    replacement: 'gpt-transcribe',
    source: 'developers.openai.com/api/docs/deprecations',
  },
  {
    id: 'gpt-4o-mini-transcribe',
    role: 'stt',
    status: 'deprecated',
    shutdownDate: '2027-02-26',
    replacement: 'gpt-transcribe',
    source: 'developers.openai.com/api/docs/deprecations',
  },
] as const satisfies readonly OpenAIDeprecatedModel[];

const KNOWN_MODEL_IDS_BY_ROLE: Record<OpenAICatalogRole, Set<string>> = {
  text: new Set(OPENAI_MODEL_CATALOG.filter((m) => m.role === 'text').map((m) => m.id)),
  live: new Set(OPENAI_MODEL_CATALOG.filter((m) => m.role === 'live').map((m) => m.id)),
  stt: new Set(OPENAI_MODEL_CATALOG.filter((m) => m.role === 'stt').map((m) => m.id)),
  tts: new Set(OPENAI_MODEL_CATALOG.filter((m) => m.role === 'tts').map((m) => m.id)),
};
const KNOWN_VOICE_IDS = new Set<string>(OPENAI_VOICE_CATALOG.map((v) => v.id));
const DEPRECATED_MODELS_BY_ID: Map<string, OpenAIDeprecatedModel> = new Map(
  OPENAI_DEPRECATED_MODELS.map((entry) => [entry.id, entry]),
);

/** Verifie qu'un identifiant de modele est repertorie (FR-005 : ne leve jamais). */
export function isKnownOpenAIModel(id: string, role?: OpenAICatalogRole): boolean {
  if (role) {
    return KNOWN_MODEL_IDS_BY_ROLE[role].has(id);
  }
  return Object.values(KNOWN_MODEL_IDS_BY_ROLE).some((set) => set.has(id));
}

/** Verifie qu'un identifiant de voix est repertorie (FR-005 : ne leve jamais). Le parametre `role` est accepte pour la forme du contrat, non utilise (une seule liste de voix). */
export function isKnownOpenAIVoice(id: string, role?: 'tts' | 'live'): boolean {
  void role;
  return KNOWN_VOICE_IDS.has(id);
}

/** Toutes les entrees OpenAI sont multilingues : toute langue est supportee (FR-005/edge case multilingue). */
export function openAISupportsLanguage(_id: string, _language: string): LanguageSupport {
  return { supported: true };
}

/** Retourne l'entree du catalogue deprecie pour un identifiant, ou `undefined` (FR-016, ne leve jamais). */
export function getOpenAIDeprecatedModel(id: string): OpenAIDeprecatedModel | undefined {
  return DEPRECATED_MODELS_BY_ID.get(id);
}
