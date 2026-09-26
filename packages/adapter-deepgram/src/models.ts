// ============================================================
// Catalogue type des modeles, voix et fournisseurs Deepgram
// Listes `as const` : autocompletion + catalogue runtime (getCapabilities).
// `(string & {})` garde l'ouverture aux identifiants non encore repertories
// (nouveaux modeles/voix publies par Deepgram avant mise a jour du catalogue).
// Verifie par rapport a la documentation officielle Deepgram le
// DEEPGRAM_CATALOG_VERIFIED_AT ci-dessous ; a re-verifier au debut de chaque lot.
// ============================================================

/** Date (ISO) de la derniere verification du catalogue par rapport a la documentation Deepgram. */
export const DEEPGRAM_CATALOG_VERIFIED_AT = '2026-09-26';

// ------------------------------------------------------------
// Modeles Nova (transcription batch, `/v1/listen`)
// ------------------------------------------------------------

/** Modeles Nova-3 et Nova-2 (transcription batch et pre-enregistree). */
export const DEEPGRAM_NOVA_MODELS = [
  'nova-3',
  'nova-3-general',
  'nova-3-medical',
  'nova-3-pharma',
  'nova-2',
  'nova-2-general',
  'nova-2-meeting',
  'nova-2-phonecall',
  'nova-2-finance',
  'nova-2-conversationalai',
  'nova-2-voicemail',
  'nova-2-video',
  'nova-2-medical',
  'nova-2-drivethru',
  'nova-2-automotive',
  'nova-2-atc',
] as const;

// ------------------------------------------------------------
// Modeles Flux (transcription streaming, conversationnelle, `/v2/listen`)
// ------------------------------------------------------------

/** Modeles Flux (streaming, turn-aware). */
export const DEEPGRAM_FLUX_MODELS = ['flux-general-en', 'flux-general-multi'] as const;

/** Bouquet de langues couvert par flux-general-multi (recherche R9). */
const MULTILINGUAL_BUNDLE = ['en', 'es', 'fr', 'de', 'hi', 'ru', 'pt', 'ja', 'it', 'nl'] as const;

/**
 * Langues supportees par les modeles Nova-3/Nova-3-general : liste exacte et
 * complete (128 codes) verifiee contre developers.deepgram.com/docs/models-languages-overview.md
 * le DEEPGRAM_CATALOG_VERIFIED_AT ci-dessus (DG-1 re-verification).
 */
const NOVA_3_LANGUAGES = [
  'multi',
  'af',
  'af-ZA',
  'ar',
  'ar-AE',
  'ar-SA',
  'ar-QA',
  'ar-KW',
  'ar-SY',
  'ar-LB',
  'ar-PS',
  'ar-JO',
  'ar-EG',
  'ar-SD',
  'ar-TD',
  'ar-MA',
  'ar-DZ',
  'ar-TN',
  'ar-IQ',
  'ar-IR',
  'hy',
  'as',
  'as-IN',
  'be',
  'bn',
  'bs',
  'bg',
  'ca',
  'zh-HK',
  'zh',
  'zh-CN',
  'zh-Hans',
  'zh-TW',
  'zh-Hant',
  'hr',
  'cs',
  'cs-CZ',
  'da',
  'da-DK',
  'nl',
  'en',
  'en-US',
  'en-AU',
  'en-GB',
  'en-IN',
  'en-NZ',
  'et',
  'fi',
  'nl-BE',
  'fr',
  'fr-CA',
  'ka',
  'ka-GE',
  'de',
  'de-CH',
  'el',
  'gu',
  'gu-IN',
  'he',
  'hi',
  'hu',
  'id',
  'it',
  'ja',
  'kn',
  'kk',
  'kk-KZ',
  'ko',
  'ko-KR',
  'lv',
  'lt',
  'mk',
  'ms',
  'mr',
  'mn',
  'ne',
  'no',
  'ps',
  'ps-AF',
  'fa',
  'pl',
  'pt',
  'pt-BR',
  'pt-PT',
  'pa',
  'pa-IN',
  'ro',
  'ru',
  'sr',
  'sk',
  'sl',
  'es',
  'es-419',
  'sv',
  'sv-SE',
  'tl',
  'ta',
  'te',
  'th',
  'th-TH',
  'tr',
  'tr-TR',
  'uk',
  'ur',
  'vi',
] as const;

/** Langues supportees par Nova-3-medical et Nova-3-pharma (anglais uniquement, plusieurs regions). */
const NOVA_3_DOMAIN_ENGLISH_LANGUAGES = ['en', 'en-US', 'en-AU', 'en-CA', 'en-GB', 'en-IE', 'en-IN', 'en-NZ'] as const;

/** Langues supportees par Nova-2/Nova-2-general (multilingue espagnol + anglais, puis liste individuelle documentee). */
const NOVA_2_LANGUAGES = [
  'multi',
  'en',
  'es',
  'bg',
  'ca',
  'zh',
  'cs',
  'da',
  'nl',
  'et',
  'fi',
  'fr',
  'de',
  'el',
  'hi',
  'hu',
  'id',
  'it',
  'ja',
  'ko',
  'lv',
  'lt',
  'ms',
  'no',
  'pl',
  'pt',
  'ro',
  'ru',
  'sk',
  'sv',
  'th',
  'tr',
  'uk',
  'vi',
] as const;

/** Modeles Nova-2 specialises : anglais uniquement. */
const NOVA_2_ENGLISH_ONLY_MODELS = [
  'nova-2-meeting',
  'nova-2-phonecall',
  'nova-2-finance',
  'nova-2-conversationalai',
  'nova-2-voicemail',
  'nova-2-video',
  'nova-2-medical',
  'nova-2-drivethru',
  'nova-2-automotive',
  'nova-2-atc',
] as const;

function withEnglishOnly(models: readonly string[]): Record<string, readonly string[]> {
  const table: Record<string, readonly string[]> = {};
  for (const model of models) {
    table[model] = ['en'];
  }
  return table;
}

/** Langues supportees par chaque modele Nova ou Flux repertorie. */
export const DEEPGRAM_STT_MODEL_LANGUAGES: Record<string, readonly string[]> = {
  'flux-general-en': ['en'],
  'flux-general-multi': [...MULTILINGUAL_BUNDLE],
  'nova-3': NOVA_3_LANGUAGES,
  'nova-3-general': NOVA_3_LANGUAGES,
  'nova-3-medical': NOVA_3_DOMAIN_ENGLISH_LANGUAGES,
  'nova-3-pharma': NOVA_3_DOMAIN_ENGLISH_LANGUAGES,
  'nova-2': NOVA_2_LANGUAGES,
  'nova-2-general': NOVA_2_LANGUAGES,
  ...withEnglishOnly(NOVA_2_ENGLISH_ONLY_MODELS),
};

// ------------------------------------------------------------
// Voix Aura-2 (synthese, `/v1/speak`), groupees par langue
// ------------------------------------------------------------

export type DeepgramVoiceGender = 'male' | 'female';

export interface DeepgramAuraVoiceEntry {
  id: string;
  gender: DeepgramVoiceGender;
}

/** Voix Aura-2 par langue (identifiant + genre). Seules les langues Aura-2 actuellement publiees par Deepgram. */
export const DEEPGRAM_AURA_VOICES_BY_LANGUAGE: Record<string, readonly DeepgramAuraVoiceEntry[]> = {
  en: [
    { id: 'aura-2-amalthea-en', gender: 'female' },
    { id: 'aura-2-andromeda-en', gender: 'female' },
    { id: 'aura-2-asteria-en', gender: 'female' },
    { id: 'aura-2-athena-en', gender: 'female' },
    { id: 'aura-2-aurora-en', gender: 'female' },
    { id: 'aura-2-callista-en', gender: 'female' },
    { id: 'aura-2-cora-en', gender: 'female' },
    { id: 'aura-2-cordelia-en', gender: 'female' },
    { id: 'aura-2-delia-en', gender: 'female' },
    { id: 'aura-2-electra-en', gender: 'female' },
    { id: 'aura-2-harmonia-en', gender: 'female' },
    { id: 'aura-2-helena-en', gender: 'female' },
    { id: 'aura-2-hera-en', gender: 'female' },
    { id: 'aura-2-iris-en', gender: 'female' },
    { id: 'aura-2-janus-en', gender: 'female' },
    { id: 'aura-2-juno-en', gender: 'female' },
    { id: 'aura-2-luna-en', gender: 'female' },
    { id: 'aura-2-minerva-en', gender: 'female' },
    { id: 'aura-2-ophelia-en', gender: 'female' },
    { id: 'aura-2-pandora-en', gender: 'female' },
    { id: 'aura-2-phoebe-en', gender: 'female' },
    { id: 'aura-2-selene-en', gender: 'female' },
    { id: 'aura-2-thalia-en', gender: 'female' },
    { id: 'aura-2-theia-en', gender: 'female' },
    { id: 'aura-2-vesta-en', gender: 'female' },
    { id: 'aura-2-apollo-en', gender: 'male' },
    { id: 'aura-2-arcas-en', gender: 'male' },
    { id: 'aura-2-aries-en', gender: 'male' },
    { id: 'aura-2-atlas-en', gender: 'male' },
    { id: 'aura-2-draco-en', gender: 'male' },
    { id: 'aura-2-hermes-en', gender: 'male' },
    { id: 'aura-2-hyperion-en', gender: 'male' },
    { id: 'aura-2-jupiter-en', gender: 'male' },
    { id: 'aura-2-mars-en', gender: 'male' },
    { id: 'aura-2-neptune-en', gender: 'male' },
    { id: 'aura-2-odysseus-en', gender: 'male' },
    { id: 'aura-2-orion-en', gender: 'male' },
    { id: 'aura-2-orpheus-en', gender: 'male' },
    { id: 'aura-2-pluto-en', gender: 'male' },
    { id: 'aura-2-saturn-en', gender: 'male' },
    { id: 'aura-2-zeus-en', gender: 'male' },
  ],
  es: [
    { id: 'aura-2-agustina-es', gender: 'female' },
    { id: 'aura-2-antonia-es', gender: 'female' },
    { id: 'aura-2-carina-es', gender: 'female' },
    { id: 'aura-2-celeste-es', gender: 'female' },
    { id: 'aura-2-diana-es', gender: 'female' },
    { id: 'aura-2-estrella-es', gender: 'female' },
    { id: 'aura-2-gloria-es', gender: 'female' },
    { id: 'aura-2-olivia-es', gender: 'female' },
    { id: 'aura-2-selena-es', gender: 'female' },
    { id: 'aura-2-silvia-es', gender: 'female' },
    { id: 'aura-2-alvaro-es', gender: 'male' },
    { id: 'aura-2-aquila-es', gender: 'male' },
    { id: 'aura-2-javier-es', gender: 'male' },
    { id: 'aura-2-luciano-es', gender: 'male' },
    { id: 'aura-2-nestor-es', gender: 'male' },
    { id: 'aura-2-sirio-es', gender: 'male' },
    { id: 'aura-2-valerio-es', gender: 'male' },
  ],
  fr: [
    { id: 'aura-2-agathe-fr', gender: 'female' },
    { id: 'aura-2-hector-fr', gender: 'male' },
  ],
  de: [
    { id: 'aura-2-aurelia-de', gender: 'female' },
    { id: 'aura-2-elara-de', gender: 'female' },
    { id: 'aura-2-kara-de', gender: 'female' },
    { id: 'aura-2-lara-de', gender: 'female' },
    { id: 'aura-2-viktoria-de', gender: 'female' },
    { id: 'aura-2-fabian-de', gender: 'male' },
    { id: 'aura-2-julius-de', gender: 'male' },
  ],
  it: [
    { id: 'aura-2-cinzia-it', gender: 'female' },
    { id: 'aura-2-demetra-it', gender: 'female' },
    { id: 'aura-2-livia-it', gender: 'female' },
    { id: 'aura-2-maia-it', gender: 'female' },
    { id: 'aura-2-melia-it', gender: 'female' },
    { id: 'aura-2-cesare-it', gender: 'male' },
    { id: 'aura-2-dionisio-it', gender: 'male' },
    { id: 'aura-2-elio-it', gender: 'male' },
    { id: 'aura-2-flavio-it', gender: 'male' },
  ],
  nl: [
    { id: 'aura-2-beatrix-nl', gender: 'female' },
    { id: 'aura-2-cornelia-nl', gender: 'female' },
    { id: 'aura-2-daphne-nl', gender: 'female' },
    { id: 'aura-2-hestia-nl', gender: 'female' },
    { id: 'aura-2-leda-nl', gender: 'female' },
    { id: 'aura-2-rhea-nl', gender: 'female' },
    { id: 'aura-2-lars-nl', gender: 'male' },
    { id: 'aura-2-roman-nl', gender: 'male' },
    { id: 'aura-2-sander-nl', gender: 'male' },
  ],
  ja: [
    { id: 'aura-2-ama-ja', gender: 'female' },
    { id: 'aura-2-izanami-ja', gender: 'female' },
    { id: 'aura-2-uzume-ja', gender: 'female' },
    { id: 'aura-2-ebisu-ja', gender: 'male' },
    { id: 'aura-2-fujin-ja', gender: 'male' },
  ],
};

/** Identifiants de voix Aura-2 a plat, toutes langues confondues. */
export const DEEPGRAM_AURA_VOICES: readonly string[] = Object.values(DEEPGRAM_AURA_VOICES_BY_LANGUAGE).flatMap(
  (voices) => voices.map((voice) => voice.id),
);

/** Voix Aura-2 par defaut pour chaque langue catalogue (anglais/francais figes, autres = premiere voix listee). */
export const DEEPGRAM_DEFAULT_AURA_VOICE_BY_LANGUAGE: Record<string, string> = (() => {
  const defaults: Record<string, string> = {
    en: 'aura-2-thalia-en',
    fr: 'aura-2-agathe-fr',
  };
  for (const [language, voices] of Object.entries(DEEPGRAM_AURA_VOICES_BY_LANGUAGE)) {
    if (language !== 'en' && language !== 'fr') {
      defaults[language] = voices[0].id;
    }
  }
  return defaults;
})();

// ------------------------------------------------------------
// Fournisseurs et modeles de raisonnement geres par Deepgram (Voice Agent)
// ------------------------------------------------------------

/**
 * Fournisseurs de raisonnement couverts par la seule cle Deepgram (recherche R6).
 * NVIDIA est gere par Deepgram mais reste exclu jusqu'a confirmation de sa
 * valeur `type` de fournisseur au lot DG-7.
 */
export const DEEPGRAM_THINK_PROVIDERS = ['open_ai', 'anthropic', 'google'] as const;

export type DeepgramThinkTier = 'standard' | 'advanced';

export interface DeepgramThinkModelEntry {
  id: string;
  tier: DeepgramThinkTier;
}

const OPENAI_ADVANCED_THINK_MODELS = [
  'gpt-5.6-terra',
  'gpt-5.5',
  'gpt-5.4',
  'gpt-5.3-chat-latest',
  'gpt-5.2-chat-latest',
  'gpt-5.2',
  'gpt-5.1-chat-latest',
  'gpt-5.1',
  'gpt-5',
  'gpt-4.1',
  'gpt-4o',
] as const;

const OPENAI_STANDARD_THINK_MODELS = [
  'gpt-5.6-luna',
  'gpt-5.4-nano',
  'gpt-5.4-mini',
  'gpt-5-nano',
  'gpt-5-mini',
  'gpt-4.1-nano',
  'gpt-4.1-mini',
  'gpt-4o-mini',
] as const;

const ANTHROPIC_ADVANCED_THINK_MODELS = ['claude-sonnet-5', 'claude-sonnet-4-6', 'claude-sonnet-4-5'] as const;

const ANTHROPIC_STANDARD_THINK_MODELS = ['claude-haiku-4-5', 'claude-3-5-haiku-latest'] as const;

const GOOGLE_ADVANCED_THINK_MODELS = ['gemini-3-pro-preview'] as const;

const GOOGLE_STANDARD_THINK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
] as const;

/** Modeles de raisonnement geres par Deepgram pour le Voice Agent, par fournisseur, avec leur palier tarifaire. */
export const DEEPGRAM_THINK_MODELS: Record<(typeof DEEPGRAM_THINK_PROVIDERS)[number], readonly DeepgramThinkModelEntry[]> = {
  open_ai: [
    ...OPENAI_ADVANCED_THINK_MODELS.map((id) => ({ id, tier: 'advanced' as const })),
    ...OPENAI_STANDARD_THINK_MODELS.map((id) => ({ id, tier: 'standard' as const })),
  ],
  anthropic: [
    ...ANTHROPIC_ADVANCED_THINK_MODELS.map((id) => ({ id, tier: 'advanced' as const })),
    ...ANTHROPIC_STANDARD_THINK_MODELS.map((id) => ({ id, tier: 'standard' as const })),
  ],
  google: [
    ...GOOGLE_ADVANCED_THINK_MODELS.map((id) => ({ id, tier: 'advanced' as const })),
    ...GOOGLE_STANDARD_THINK_MODELS.map((id) => ({ id, tier: 'standard' as const })),
  ],
};

// ------------------------------------------------------------
// Types ouverts (autocompletion + identifiants non repertories)
// ------------------------------------------------------------

export type DeepgramNovaModel = (typeof DEEPGRAM_NOVA_MODELS)[number] | (string & {});
export type DeepgramFluxModel = (typeof DEEPGRAM_FLUX_MODELS)[number] | (string & {});
export type DeepgramAuraVoice = (typeof DEEPGRAM_AURA_VOICES)[number] | (string & {});
export type DeepgramThinkProvider = (typeof DEEPGRAM_THINK_PROVIDERS)[number];
export type DeepgramThinkModel =
  | (typeof OPENAI_ADVANCED_THINK_MODELS)[number]
  | (typeof OPENAI_STANDARD_THINK_MODELS)[number]
  | (typeof ANTHROPIC_ADVANCED_THINK_MODELS)[number]
  | (typeof ANTHROPIC_STANDARD_THINK_MODELS)[number]
  | (typeof GOOGLE_ADVANCED_THINK_MODELS)[number]
  | (typeof GOOGLE_STANDARD_THINK_MODELS)[number]
  | (string & {});
