// ============================================================
// Settings et Options Deepgram (donnees-modele §2)
// `*Settings` : serialisable, editable depuis le Studio, valide par un
// schema Zod strict exporte (champs inconnus rejetes).
// `*Options` = `*Settings & { apiKey: string }` : entree de constructeur.
// La cle n'apparait jamais dans un `*Settings` (recherche R19, FR-016).
// ============================================================

import { z } from 'zod';
import { SpeechServiceError } from '@owllayer/core';
import { assertModelSupportsLanguage } from './language.js';
import {
  DEEPGRAM_SPEAK_PROVIDERS,
  DEEPGRAM_THINK_MODELS,
  DEEPGRAM_THINK_PROVIDERS,
  type DeepgramProviderCredentialPolicy,
  type DeepgramSpeakProvider,
  type DeepgramThinkProvider,
} from './models.js';

/** Cles du catalogue, castees en tuple litteral pour `z.enum` (une seule source de verite). */
const DEEPGRAM_THINK_PROVIDER_KEYS = Object.keys(DEEPGRAM_THINK_PROVIDERS) as [DeepgramThinkProvider, ...DeepgramThinkProvider[]];
const DEEPGRAM_SPEAK_PROVIDER_KEYS = Object.keys(DEEPGRAM_SPEAK_PROVIDERS) as [DeepgramSpeakProvider, ...DeepgramSpeakProvider[]];

/**
 * Credential tiers du fournisseur think/speak, fourni separement des
 * `*Settings` (jamais persiste, jamais serialise) — recherche R6.
 */
export type DeepgramProviderCredential =
  | { kind: 'api-key'; apiKey: string }
  | { kind: 'aws'; region: string; accessKeyId: string; secretAccessKey: string; sessionToken?: string };

// ------------------------------------------------------------
// Limites de connexion (donnees-modele §6)
// ------------------------------------------------------------

export const deepgramConnectionLimitsSchema = z
  .object({
    openTimeoutMs: z.number().int().positive().default(10000),
    handshakeTimeoutMs: z.number().int().positive().default(5000),
    acknowledgementTimeoutMs: z.number().int().positive().default(5000),
    maxQueuedAudioMs: z.number().int().positive().default(2000),
    maxQueuedTextSegments: z.number().int().positive().default(8),
    keepAliveIntervalMs: z.number().int().positive().default(8000),
    maxHistoryMessages: z.number().int().positive().default(50),
  })
  .strict();

export type DeepgramConnectionLimits = z.infer<typeof deepgramConnectionLimitsSchema>;

// ------------------------------------------------------------
// Nova (STT batch) — donnees-modele §2.1
// ------------------------------------------------------------

export const deepgramNovaSTTSettingsSchema = z
  .object({
    model: z.string().min(1).optional(),
    language: z.string().min(1).optional(),
    smartFormat: z.boolean().default(true),
    keyterms: z.array(z.string().min(1)).max(100).default([]),
    mipOptOut: z.boolean().default(false),
    tags: z.array(z.string().min(1)).default([]),
    requestTimeoutMs: z.number().positive().default(30000),
  })
  .strict();

export type DeepgramNovaSTTSettings = z.infer<typeof deepgramNovaSTTSettingsSchema>;
export type DeepgramNovaSTTOptions = DeepgramNovaSTTSettings & { apiKey: string };

// ------------------------------------------------------------
// Flux (STT streaming) — donnees-modele §2.2
// ------------------------------------------------------------

const deepgramFluxTurnDetectionSchema = z
  .object({
    endOfTurnThreshold: z.number().min(0.5).max(1.0).default(0.7),
    tentativeEndOfTurnThreshold: z.number().min(0.3).max(0.9).optional(),
    endOfTurnTimeoutMs: z.number().min(500).max(60000).default(5000),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.tentativeEndOfTurnThreshold !== undefined && value.tentativeEndOfTurnThreshold > value.endOfTurnThreshold) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tentativeEndOfTurnThreshold'],
        message: 'tentativeEndOfTurnThreshold must be less than or equal to endOfTurnThreshold',
      });
    }
  });

export const deepgramFluxSTTSettingsSchema = z
  .object({
    model: z.string().min(1).optional(),
    language: z.string().min(1).optional(),
    languageHints: z.array(z.string().min(1)).optional(),
    turnDetection: deepgramFluxTurnDetectionSchema.default({}),
    keyterms: z.array(z.string().min(1)).max(100).default([]),
    mipOptOut: z.boolean().default(false),
    tags: z.array(z.string().min(1)).default([]),
    limits: deepgramConnectionLimitsSchema.default({}),
  })
  .strict();

export type DeepgramFluxSTTSettings = z.infer<typeof deepgramFluxSTTSettingsSchema>;
export type DeepgramFluxSTTOptions = DeepgramFluxSTTSettings & { apiKey: string };

// ------------------------------------------------------------
// Aura (TTS batch + streaming) — donnees-modele §2.3
// ------------------------------------------------------------

/**
 * Limite de caracteres par requete REST `/v1/speak` (Aura-2 et Aura-1),
 * verifiee sur developers.deepgram.com/docs/text-to-speech le
 * DEEPGRAM_CATALOG_VERIFIED_AT de models.ts : au-dela, le fournisseur
 * repond 413 "Input Text Exceeded Character Limit". Verifie localement
 * avant tout appel reseau (DeepgramAuraTTS.synthesize).
 */
export const DEEPGRAM_AURA_MAX_TEXT_LENGTH = 2000;

export const deepgramAuraTTSSettingsSchema = z
  .object({
    voice: z.string().min(1).optional(),
    language: z.string().min(1).optional(),
    batchOutputFormat: z.enum(['pcm', 'mp3', 'opus', 'flac', 'aac', 'wav']).default('pcm'),
    sampleRate: z.union([z.literal(8000), z.literal(16000), z.literal(24000), z.literal(32000), z.literal(48000)]).default(24000),
    speed: z.number().min(0.7).max(1.5).default(1),
    mipOptOut: z.boolean().default(false),
    limits: deepgramConnectionLimitsSchema.default({}),
  })
  .strict();

export type DeepgramAuraTTSSettings = z.infer<typeof deepgramAuraTTSSettingsSchema>;
export type DeepgramAuraTTSOptions = DeepgramAuraTTSSettings & { apiKey: string };

// ------------------------------------------------------------
// Voice Agent (realtime) — donnees-modele §2.4
// ------------------------------------------------------------

const deepgramVoiceAgentListenSchema = z
  .object({
    model: z.string().min(1).optional(),
    keyterms: z.array(z.string().min(1)).max(100).default([]),
  })
  .strict();

/** URL `https://` uniquement (endpoint personnalise think/speak). */
const httpsUrlSchema = z
  .string()
  .url()
  .refine((url) => url.startsWith('https://'), { message: 'endpointUrl must start with "https://"' });

const deepgramVoiceAgentThinkSchema = z
  .object({
    // Liste fermee (recherche R6 revisee) : un fournisseur absent du
    // catalogue doit echouer ici (`safeParse`), traduit en
    // `UNSUPPORTED_PROVIDER` explicite par `parseDeepgramVoiceAgentSettings`.
    provider: z.enum(DEEPGRAM_THINK_PROVIDER_KEYS).default('open_ai'),
    model: z.string().min(1).default('gpt-5.4-mini'),
    temperature: z.number().min(0).max(2).optional(),
    endpointUrl: httpsUrlSchema.optional(),
  })
  .strict();

const deepgramVoiceAgentSpeakSchema = z
  .object({
    provider: z.enum(DEEPGRAM_SPEAK_PROVIDER_KEYS).default('deepgram'),
    voice: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    endpointUrl: httpsUrlSchema.optional(),
  })
  .strict();

export const deepgramVoiceAgentSettingsSchema = z
  .object({
    language: z.string().min(1).optional(),
    listen: deepgramVoiceAgentListenSchema.default({}),
    think: deepgramVoiceAgentThinkSchema.default({}),
    speak: deepgramVoiceAgentSpeakSchema.default({}),
    greeting: z.string().max(1000).optional(),
    limits: deepgramConnectionLimitsSchema.default({}),
  })
  .strict();

export type DeepgramVoiceAgentSettings = z.infer<typeof deepgramVoiceAgentSettingsSchema>;
export type DeepgramVoiceAgentOptions = DeepgramVoiceAgentSettings & {
  apiKey: string;
  /** Credential du fournisseur think, requis/facultatif selon la politique du catalogue. Jamais persiste. */
  thinkProviderCredential?: DeepgramProviderCredential;
  /** Credential du fournisseur speak, requis/facultatif selon la politique du catalogue. Jamais persiste. */
  speakProviderCredential?: DeepgramProviderCredential;
};

// ------------------------------------------------------------
// Analyse avec traduction en `SpeechServiceError`
// ------------------------------------------------------------

function parseWithSpeechError<TSchema extends z.ZodTypeAny>(schema: TSchema, input: unknown): z.infer<TSchema> {
  const result = schema.safeParse(input ?? {});
  if (!result.success) {
    const [firstIssue] = result.error.issues;
    const path = firstIssue.path.join('.') || '(root)';
    throw new SpeechServiceError(
      `Invalid Deepgram settings at "${path}": ${firstIssue.message}`,
      'deepgram',
      'INVALID_SETTINGS',
    );
  }
  return result.data;
}

/** Valide un `DeepgramNovaSTTSettings` serialise, en rejetant les champs inconnus et les valeurs hors bornes. */
export function parseDeepgramNovaSTTSettings(input: unknown = {}): DeepgramNovaSTTSettings {
  return parseWithSpeechError(deepgramNovaSTTSettingsSchema, input);
}

/** Valide un `DeepgramFluxSTTSettings` serialise (ordre des seuils de detection de tour inclus). */
export function parseDeepgramFluxSTTSettings(input: unknown = {}): DeepgramFluxSTTSettings {
  return parseWithSpeechError(deepgramFluxSTTSettingsSchema, input);
}

/** Valide un `DeepgramAuraTTSSettings` serialise. */
export function parseDeepgramAuraTTSSettings(input: unknown = {}): DeepgramAuraTTSSettings {
  return parseWithSpeechError(deepgramAuraTTSSettingsSchema, input);
}

/**
 * Valide un `DeepgramVoiceAgentSettings` serialise : structure (Zod — les
 * fournisseurs think/speak sont des listes fermees, un fournisseur absent
 * du catalogue echoue ici et est traduit en `UNSUPPORTED_PROVIDER`), puis
 * coherence modele de raisonnement/fournisseur et langue d'ecoute/parole.
 * Ne valide PAS les credentials fournisseur (options, jamais persistees) —
 * voir `validateDeepgramVoiceAgentOptions`.
 */
export function parseDeepgramVoiceAgentSettings(input: unknown = {}): DeepgramVoiceAgentSettings {
  const result = deepgramVoiceAgentSettingsSchema.safeParse(input ?? {});
  if (!result.success) {
    const [firstIssue] = result.error.issues;
    const path = firstIssue.path.join('.');
    if (path === 'think.provider' || path === 'speak.provider') {
      const step = path === 'think.provider' ? 'think' : 'speak';
      const rawValue = (input as { think?: { provider?: unknown }; speak?: { provider?: unknown } } | undefined)?.[step]
        ?.provider;
      throw new SpeechServiceError(
        `Deepgram Voice Agent ${step} provider "${String(rawValue)}" is not supported.`,
        'deepgram',
        'UNSUPPORTED_PROVIDER',
      );
    }
    throw new SpeechServiceError(
      `Invalid Deepgram settings at "${path || '(root)'}": ${firstIssue.message}`,
      'deepgram',
      'INVALID_SETTINGS',
    );
  }
  const settings = result.data;

  const provider = settings.think.provider;
  const managedModels = (DEEPGRAM_THINK_MODELS as Partial<Record<string, readonly { id: string }[]>>)[provider];
  if (managedModels) {
    const model = settings.think.model;
    const listedForProvider = managedModels.some((entry) => entry.id === model);
    const listedForAnyProvider = Object.values(DEEPGRAM_THINK_MODELS).some((entries) =>
      entries.some((entry) => entry.id === model),
    );
    if (listedForAnyProvider && !listedForProvider) {
      throw new SpeechServiceError(
        `Deepgram think model "${model}" does not belong to reasoning provider "${provider}".`,
        'deepgram',
        'INVALID_SETTINGS',
      );
    }
  }

  if (provider === 'groq' && !settings.think.endpointUrl) {
    throw new SpeechServiceError(
      'Deepgram Voice Agent think.endpointUrl is required for provider "groq".',
      'deepgram',
      'INVALID_SETTINGS',
    );
  }

  if (settings.speak.provider !== 'deepgram' && !settings.speak.endpointUrl) {
    throw new SpeechServiceError(
      `Deepgram Voice Agent speak.endpointUrl is required for provider "${settings.speak.provider}".`,
      'deepgram',
      'INVALID_SETTINGS',
    );
  }

  if (settings.language) {
    if (settings.listen.model) {
      assertModelSupportsLanguage(settings.listen.model, settings.language);
    }
    if (settings.speak.provider === 'deepgram' && settings.speak.voice) {
      assertModelSupportsLanguage(settings.speak.voice, settings.language);
    }
  }

  return settings;
}

function assertProviderCredentialPolicy(
  policy: DeepgramProviderCredentialPolicy,
  credential: DeepgramProviderCredential | undefined,
  step: 'think' | 'speak',
): void {
  if (policy.providerCredential === 'required' && !credential) {
    throw new SpeechServiceError(
      `A ${step} provider credential is required for this Deepgram Voice Agent provider.`,
      'deepgram',
      'PROVIDER_CREDENTIAL_REQUIRED',
    );
  }
  if (policy.providerCredential === 'none' && credential) {
    throw new SpeechServiceError(
      `No ${step} provider credential is accepted for this Deepgram Voice Agent provider.`,
      'deepgram',
      'INVALID_SETTINGS',
    );
  }
  if (credential && policy.credentialKind && credential.kind !== policy.credentialKind) {
    throw new SpeechServiceError(
      `Expected a "${policy.credentialKind}" ${step} provider credential, got "${credential.kind}".`,
      'deepgram',
      'INVALID_SETTINGS',
    );
  }
}

/**
 * Valide des `DeepgramVoiceAgentOptions` completes : structure/coherence
 * des settings (`parseDeepgramVoiceAgentSettings`), puis la politique de
 * credential du catalogue pour les fournisseurs think et speak choisis
 * (recherche R6). Credential requis et absent -> `PROVIDER_CREDENTIAL_REQUIRED` ;
 * credential fourni alors que la politique est `none`, ou de la mauvaise
 * nature (`kind`) -> `INVALID_SETTINGS`. Ne renvoie jamais les credentials.
 */
export function validateDeepgramVoiceAgentOptions(options: DeepgramVoiceAgentOptions): DeepgramVoiceAgentSettings {
  const { apiKey: _apiKey, thinkProviderCredential, speakProviderCredential, ...rawSettings } = options;
  const settings = parseDeepgramVoiceAgentSettings(rawSettings);

  assertProviderCredentialPolicy(DEEPGRAM_THINK_PROVIDERS[settings.think.provider], thinkProviderCredential, 'think');
  assertProviderCredentialPolicy(DEEPGRAM_SPEAK_PROVIDERS[settings.speak.provider], speakProviderCredential, 'speak');

  return settings;
}
