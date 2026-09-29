// ============================================================
// Catalogue type des modeles et voix Google (Gemini + Cloud Speech)
// Listes `as const` : autocompletion + catalogue runtime (getCapabilities).
// `(string & {})` garde l'ouverture aux identifiants non encore repertories.
// Verifie par rapport a la documentation officielle Google le
// GOOGLE_CATALOG_VERIFIED_AT ci-dessous ; a re-verifier au debut de chaque lot.
// Sources (2026-09-28) : ai.google.dev/gemini-api/docs/models, /deprecations,
// /speech-generation, /live-guide ; docs.cloud.google.com/text-to-speech/docs/chirp3-hd.
// ============================================================

/** Date (ISO) de la derniere verification du catalogue par rapport a la documentation Google. */
export const GOOGLE_CATALOG_VERIFIED_AT = '2026-09-28';

/** Role d'une entree de catalogue de modeles. */
export type GoogleCatalogRole = 'text' | 'live' | 'stt' | 'tts';

/** Statut d'une entree active du catalogue (les modeles retires/deprecies sont dans GOOGLE_DEPRECATED_MODELS). */
export type GoogleCatalogStatus = 'stable' | 'preview';

/** Entree de modele du catalogue Google (data-model.md CatalogModel). */
export interface GoogleCatalogModel {
  id: string;
  name: string;
  role: GoogleCatalogRole;
  status: GoogleCatalogStatus;
  languages?: readonly string[];
  description?: string;
}

/** Entree de voix du catalogue Google (data-model.md CatalogVoice). */
export interface GoogleCatalogVoice {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'neutral';
  languages: readonly string[];
  family?: string;
  models?: readonly string[];
}

/** Statut d'un modele du catalogue deprecie. */
export type GoogleDeprecatedStatus = 'deprecated' | 'retired';

/** Entree du catalogue deprecie Google (data-model.md DeprecatedModel). */
export interface GoogleDeprecatedModel {
  id: string;
  role: GoogleCatalogRole;
  status: GoogleDeprecatedStatus;
  shutdownDate?: string;
  replacement?: string;
  source: string;
}

/** Resultat des helpers de support de langue (data-model.md). */
export type LanguageSupport = { supported: true } | { supported: false; supportedLanguages: readonly string[] };

// ------------------------------------------------------------
// Modeles texte (Gemini, role 'text')
// ------------------------------------------------------------

/** Modeles Gemini texte actuellement documentes comme stables ou preview (ai.google.dev/gemini-api/docs/models). */
export const GOOGLE_TEXT_MODELS = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', role: 'text', status: 'stable', description: 'Modele Flash le plus intelligent, ingenierie logicielle long-horizon' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', role: 'text', status: 'stable', description: 'Generation Flash precedente pour du code complexe' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', role: 'text', status: 'stable', description: 'Equilibre vitesse et capacites multimodales' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', role: 'text', status: 'stable', description: 'Modele historique pour charges de travail routinieres a fort debit' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', role: 'text', status: 'stable', description: 'Variante 3.5 la plus rapide et economique' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', role: 'text', status: 'stable', description: 'Performance frontier a moindre cout' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Preview)', role: 'text', status: 'preview', description: 'Intelligence avancee pour problemes complexes' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)', role: 'text', status: 'preview', description: 'Performance frontier' },
] as const satisfies readonly GoogleCatalogModel[];

/** Modele texte par defaut : remplacant documente de `gemini-2.0-flash` (retire le 2026-06-01, FR-017). */
export const GOOGLE_DEFAULT_TEXT_MODEL = 'gemini-3.6-flash';

// ------------------------------------------------------------
// Modeles Live (Gemini Live, role 'live')
// ------------------------------------------------------------

/** Modeles Gemini Live documentes (ai.google.dev/gemini-api/docs/live-guide). */
export const GOOGLE_LIVE_MODELS = [
  { id: 'gemini-3.8-live', name: 'Gemini 3.8 Live', role: 'live', status: 'stable', languages: ['multilingual'], description: 'Modele Live par defaut pour les agents vocaux a faible latence' },
  { id: 'gemini-3.8-live-extended-thinking', name: 'Gemini 3.8 Live Extended Thinking', role: 'live', status: 'stable', languages: ['multilingual'], description: 'Raisonnement renforce pour les interactions vocales' },
  { id: 'gemini-3.1-flash-live-preview', name: 'Gemini 3.1 Flash Live (Preview)', role: 'live', status: 'preview', languages: ['multilingual'], description: 'Modele Live legacy, mise a jour recommandee vers Gemini 3.8 Live' },
] as const satisfies readonly GoogleCatalogModel[];

/** Modele Live par defaut (research R5/T004 : `gemini-2.5-flash-native-audio-preview-12-2025` absent des pages courantes). */
export const GOOGLE_DEFAULT_LIVE_MODEL = 'gemini-3.8-live';

/** Voix Live par defaut (voix Gemini courante, inchangee). */
export const GOOGLE_DEFAULT_LIVE_VOICE = 'Fenrir';

// ------------------------------------------------------------
// Modeles Cloud Speech-to-Text (role 'stt') utilises par GoogleSTT (API v1 REST)
// + modeles Gemini API de transcription (informationnels, voir README/rapport :
// GoogleSTT n'appelle pas encore l'API Gemini pour la transcription).
// ------------------------------------------------------------

/** Modeles Cloud Speech-to-Text v1 acceptes par `GoogleSTTOptions.model` (deja appeles par le code). */
export const GOOGLE_STT_MODELS = [
  { id: 'latest_long', name: 'Latest Long', role: 'stt', status: 'stable', description: 'Meilleur pour audio long (>1 min)' },
  { id: 'latest_short', name: 'Latest Short', role: 'stt', status: 'stable', description: 'Meilleur pour audio court (<1 min)' },
  { id: 'telephony', name: 'Telephony', role: 'stt', status: 'stable', description: 'Optimise pour appels telephoniques' },
  { id: 'medical_dictation', name: 'Medical Dictation', role: 'stt', status: 'stable', description: 'Terminologie medicale - dictee' },
  { id: 'medical_conversation', name: 'Medical Conversation', role: 'stt', status: 'stable', description: 'Terminologie medicale - dialogue' },
] as const satisfies readonly GoogleCatalogModel[];

/**
 * Modeles Gemini API de transcription (role 'stt'), documentes mais non selectionnables
 * via `GoogleSTTOptions.model` : GoogleSTT appelle Cloud Speech-to-Text v1. Listes a
 * part pour que `GoogleSTTModel` ne propose que des identifiants utilisables.
 */
export const GEMINI_TRANSCRIBE_MODELS = [
  {
    id: 'gemini-3.5-transcribe',
    name: 'Gemini 3.5 Transcribe',
    role: 'stt',
    status: 'stable',
    languages: ['multilingual'],
    description: 'Modele Gemini API de transcription (detection de langue par enonce) ; non selectionnable via GoogleSTTOptions.model aujourd\'hui (GoogleSTT appelle Cloud Speech-to-Text v1)',
  },
  {
    id: 'gemini-3.5-transcribe-live',
    name: 'Gemini 3.5 Transcribe Live',
    role: 'stt',
    status: 'stable',
    languages: ['multilingual'],
    description: 'Variante temps reel de gemini-3.5-transcribe (Gemini API) ; non selectionnable via GoogleSTTOptions.model aujourd\'hui',
  },
] as const satisfies readonly GoogleCatalogModel[];

/** Langues Cloud Speech-to-Text declarees par l'adaptateur (inchangees). */
export const GOOGLE_STT_LANGUAGES = ['fr-FR', 'en-US', 'en-GB', 'es-ES', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN', 'ar-SA'] as const;

/** Modele Cloud Speech-to-Text par defaut (inchange : non deprecie sur les pages officielles a la date de verification). */
export const GOOGLE_DEFAULT_STT_MODEL = 'latest_long';

// ------------------------------------------------------------
// Modeles Gemini API de synthese vocale (role 'tts'), informationnels :
// GoogleTTS appelle Cloud Text-to-Speech (voix nommees, pas de parametre modele) ;
// ajoutes sur demande du mainteneur (Gemini 3.8 Flash TTS).
// ------------------------------------------------------------

/** Modeles Gemini API de text-to-speech documentes (ai.google.dev/gemini-api/docs/speech-generation). */
export const GOOGLE_TTS_MODELS = [
  { id: 'gemini-3.8-flash-tts', name: 'Gemini 3.8 Flash TTS', role: 'tts', status: 'stable', languages: ['multilingual'], description: 'Modele TTS Gemini phare, 130+ langues ; non selectionnable via GoogleTTSOptions aujourd\'hui (GoogleTTS appelle Cloud Text-to-Speech)' },
  { id: 'gemini-3.8-flash-lite-tts', name: 'Gemini 3.8 Flash-Lite TTS', role: 'tts', status: 'stable', languages: ['multilingual'], description: 'Modele TTS rapide et economique, 101 langues' },
  { id: 'gemini-3.1-flash-tts-preview', name: 'Gemini 3.1 Flash TTS (Preview)', role: 'tts', status: 'preview', languages: ['multilingual'], description: 'Modele TTS legacy, mise a jour recommandee' },
] as const satisfies readonly GoogleCatalogModel[];

/** Langues Cloud Text-to-Speech declarees par l'adaptateur (FR-013, inchangees). */
export const GOOGLE_TTS_LANGUAGES = ['fr-FR', 'en-US', 'en-GB', 'es-ES', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN'] as const;

// ------------------------------------------------------------
// Voix Gemini (Live + Gemini API TTS), 30 voix prebuilt documentees
// (ai.google.dev/gemini-api/docs/speech-generation), genre depuis
// docs.cloud.google.com/text-to-speech/docs/chirp3-hd. Meme liste que
// adapter-livekit (FR-009).
// ------------------------------------------------------------

/** Les 30 voix Gemini prebuilt documentees, genre depuis la page Chirp 3 HD, multilingues. */
export const GEMINI_VOICES = [
  { id: 'Zephyr', name: 'Zephyr', gender: 'female', languages: ['multilingual'] },
  { id: 'Puck', name: 'Puck', gender: 'male', languages: ['multilingual'] },
  { id: 'Charon', name: 'Charon', gender: 'male', languages: ['multilingual'] },
  { id: 'Kore', name: 'Kore', gender: 'female', languages: ['multilingual'] },
  { id: 'Fenrir', name: 'Fenrir', gender: 'male', languages: ['multilingual'] },
  { id: 'Leda', name: 'Leda', gender: 'female', languages: ['multilingual'] },
  { id: 'Orus', name: 'Orus', gender: 'male', languages: ['multilingual'] },
  { id: 'Aoede', name: 'Aoede', gender: 'female', languages: ['multilingual'] },
  { id: 'Callirrhoe', name: 'Callirrhoe', gender: 'female', languages: ['multilingual'] },
  { id: 'Autonoe', name: 'Autonoe', gender: 'female', languages: ['multilingual'] },
  { id: 'Enceladus', name: 'Enceladus', gender: 'male', languages: ['multilingual'] },
  { id: 'Iapetus', name: 'Iapetus', gender: 'male', languages: ['multilingual'] },
  { id: 'Umbriel', name: 'Umbriel', gender: 'male', languages: ['multilingual'] },
  { id: 'Algieba', name: 'Algieba', gender: 'male', languages: ['multilingual'] },
  { id: 'Despina', name: 'Despina', gender: 'female', languages: ['multilingual'] },
  { id: 'Erinome', name: 'Erinome', gender: 'female', languages: ['multilingual'] },
  { id: 'Algenib', name: 'Algenib', gender: 'male', languages: ['multilingual'] },
  { id: 'Rasalgethi', name: 'Rasalgethi', gender: 'male', languages: ['multilingual'] },
  { id: 'Laomedeia', name: 'Laomedeia', gender: 'female', languages: ['multilingual'] },
  { id: 'Achernar', name: 'Achernar', gender: 'female', languages: ['multilingual'] },
  { id: 'Alnilam', name: 'Alnilam', gender: 'male', languages: ['multilingual'] },
  { id: 'Schedar', name: 'Schedar', gender: 'male', languages: ['multilingual'] },
  { id: 'Gacrux', name: 'Gacrux', gender: 'female', languages: ['multilingual'] },
  { id: 'Pulcherrima', name: 'Pulcherrima', gender: 'female', languages: ['multilingual'] },
  { id: 'Achird', name: 'Achird', gender: 'male', languages: ['multilingual'] },
  { id: 'Zubenelgenubi', name: 'Zubenelgenubi', gender: 'male', languages: ['multilingual'] },
  { id: 'Vindemiatrix', name: 'Vindemiatrix', gender: 'female', languages: ['multilingual'] },
  { id: 'Sadachbia', name: 'Sadachbia', gender: 'male', languages: ['multilingual'] },
  { id: 'Sadaltager', name: 'Sadaltager', gender: 'male', languages: ['multilingual'] },
  { id: 'Sulafat', name: 'Sulafat', gender: 'female', languages: ['multilingual'] },
] as const satisfies readonly GoogleCatalogVoice[];

// ------------------------------------------------------------
// Types ouverts (autocompletion + identifiants non repertories)
// ------------------------------------------------------------

export type GoogleTextModel = (typeof GOOGLE_TEXT_MODELS)[number]['id'] | (string & {});
export type GoogleLiveModel = (typeof GOOGLE_LIVE_MODELS)[number]['id'] | (string & {});
export type GoogleSTTModel = (typeof GOOGLE_STT_MODELS)[number]['id'] | (string & {});
export type GeminiVoice = (typeof GEMINI_VOICES)[number]['id'] | (string & {});

// ------------------------------------------------------------
// Catalogue deprecie Google (FR-016, FR-017, FR-018)
// ------------------------------------------------------------

/**
 * Modeles Google deprecies ou retires : identifiants toujours acceptes en
 * entree (constante ou chaine libre), mais qui declenchent un avertissement
 * a la construction de l'adaptateur (FR-016). Jamais utilises comme defaut.
 */
export const GOOGLE_DEPRECATED_MODELS = [
  {
    id: 'gemini-2.0-flash',
    role: 'text',
    status: 'retired',
    shutdownDate: '2026-06-01',
    replacement: 'gemini-3.6-flash',
    source: 'ai.google.dev/gemini-api/docs/deprecations',
  },
  {
    id: 'gemini-2.0-flash-001',
    role: 'text',
    status: 'retired',
    shutdownDate: '2026-06-01',
    replacement: 'gemini-3.6-flash',
    source: 'ai.google.dev/gemini-api/docs/deprecations',
  },
  {
    id: 'gemini-2.0-flash-lite',
    role: 'text',
    status: 'retired',
    shutdownDate: '2026-06-01',
    replacement: 'gemini-3.1-flash-lite',
    source: 'ai.google.dev/gemini-api/docs/deprecations',
  },
  {
    id: 'gemini-2.0-flash-lite-001',
    role: 'text',
    status: 'retired',
    shutdownDate: '2026-06-01',
    replacement: 'gemini-3.1-flash-lite',
    source: 'ai.google.dev/gemini-api/docs/deprecations',
  },
  {
    id: 'gemini-2.0-flash-lite-preview',
    role: 'text',
    status: 'retired',
    shutdownDate: '2025-12-09',
    replacement: 'gemini-2.5-flash-lite',
    source: 'ai.google.dev/gemini-api/docs/deprecations',
  },
  {
    id: 'gemini-2.0-flash-lite-preview-02-05',
    role: 'text',
    status: 'retired',
    shutdownDate: '2025-12-09',
    replacement: 'gemini-2.5-flash-lite',
    source: 'ai.google.dev/gemini-api/docs/deprecations',
  },
  {
    id: 'gemini-1.5-pro',
    role: 'text',
    status: 'deprecated',
    replacement: undefined,
    source: 'ai.google.dev/gemini-api/docs/models (absent, FR-018)',
  },
  {
    id: 'gemini-2.5-flash-native-audio-preview-12-2025',
    role: 'live',
    status: 'deprecated',
    replacement: 'gemini-3.8-live',
    source: 'ai.google.dev/gemini-api/docs/live-guide (absent, FR-018)',
  },
  {
    id: 'gemini-2.5-flash-native-audio-preview',
    role: 'live',
    status: 'deprecated',
    replacement: 'gemini-3.8-live',
    source: 'ai.google.dev/gemini-api/docs/live-guide (absent, FR-018)',
  },
] as const satisfies readonly GoogleDeprecatedModel[];

// ------------------------------------------------------------
// Defaults par langue et helpers (FR-003, FR-005)
// ------------------------------------------------------------

/** Table des identifiants de modeles Google connus par role. */
const KNOWN_MODEL_IDS_BY_ROLE: Record<GoogleCatalogRole, Set<string>> = {
  text: new Set(GOOGLE_TEXT_MODELS.map((m) => m.id)),
  live: new Set(GOOGLE_LIVE_MODELS.map((m) => m.id)),
  stt: new Set([...GOOGLE_STT_MODELS, ...GEMINI_TRANSCRIBE_MODELS].map((m) => m.id)),
  tts: new Set(GOOGLE_TTS_MODELS.map((m) => m.id)),
};

/** Table de recherche du catalogue deprecie par identifiant. */
const DEPRECATED_MODELS_BY_ID: Map<string, GoogleDeprecatedModel> = new Map(
  GOOGLE_DEPRECATED_MODELS.map((entry) => [entry.id, entry]),
);

/** Verifie qu'un identifiant de modele est repertorie (FR-005 : ne leve jamais). */
export function isKnownGoogleModel(id: string, role?: GoogleCatalogRole): boolean {
  if (role) {
    return KNOWN_MODEL_IDS_BY_ROLE[role].has(id);
  }
  return Object.values(KNOWN_MODEL_IDS_BY_ROLE).some((set) => set.has(id));
}

/** Retourne l'entree du catalogue deprecie pour un identifiant, ou `undefined` (FR-016, ne leve jamais). */
export function getGoogleDeprecatedModel(id: string): GoogleDeprecatedModel | undefined {
  return DEPRECATED_MODELS_BY_ID.get(id);
}

/** Sous-tag primaire d'un code de langue (`fr-FR` -> `fr`), en minuscules ; utilise par language.ts. */
export function primarySubtag(language: string): string {
  const [primary] = language.trim().split(/[-_]/);
  return primary.toLowerCase();
}
