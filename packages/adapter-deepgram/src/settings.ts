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
import { DEEPGRAM_THINK_MODELS, DEEPGRAM_THINK_PROVIDERS, type DeepgramThinkProvider } from './models.js';

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

const deepgramVoiceAgentThinkSchema = z
  .object({
    // Le fournisseur reste une chaine ouverte au niveau du schema : un
    // fournisseur non couvert par la cle Deepgram doit produire le code
    // `UNSUPPORTED_PROVIDER` explicite (FR-015a), pas une erreur d'enum Zod.
    provider: z.string().min(1).default('open_ai'),
    model: z.string().min(1).default('gpt-5.4-mini'),
    temperature: z.number().min(0).max(2).optional(),
  })
  .strict();

const deepgramVoiceAgentSpeakSchema = z
  .object({
    voice: z.string().min(1).optional(),
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
export type DeepgramVoiceAgentOptions = DeepgramVoiceAgentSettings & { apiKey: string };

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
 * Valide un `DeepgramVoiceAgentSettings` serialise : structure (Zod), puis
 * coherence fournisseur/modele de raisonnement et langue d'ecoute/parole.
 * Un fournisseur non couvert par la seule cle Deepgram leve
 * `UNSUPPORTED_PROVIDER` (FR-015a, S14) avant toute connexion.
 */
export function parseDeepgramVoiceAgentSettings(input: unknown = {}): DeepgramVoiceAgentSettings {
  const settings = parseWithSpeechError(deepgramVoiceAgentSettingsSchema, input);

  const provider = settings.think.provider;
  if (!(DEEPGRAM_THINK_PROVIDERS as readonly string[]).includes(provider)) {
    throw new SpeechServiceError(
      `Deepgram Voice Agent reasoning provider "${provider}" is not covered by the Deepgram key alone.`,
      'deepgram',
      'UNSUPPORTED_PROVIDER',
    );
  }

  const model = settings.think.model;
  const listedForProvider = DEEPGRAM_THINK_MODELS[provider as DeepgramThinkProvider].some((entry) => entry.id === model);
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

  if (settings.language) {
    if (settings.listen.model) {
      assertModelSupportsLanguage(settings.listen.model, settings.language);
    }
    if (settings.speak.voice) {
      assertModelSupportsLanguage(settings.speak.voice, settings.language);
    }
  }

  return settings;
}
