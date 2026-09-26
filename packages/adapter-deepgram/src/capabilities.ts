// ============================================================
// Capacites Deepgram (donnees-modele §3, FR-015)
// Construit les `SpeechCapabilities` / `LLMAdapterCapabilities` (core)
// exclusivement a partir des exports de `models.ts`, avec la date de
// derniere verification du catalogue.
// ============================================================

import type { LLMAdapterCapabilities, LLMModel, SpeechCapabilities, Voice, VoiceInfo } from '@owllayer/core';
import {
  DEEPGRAM_AURA_VOICES_BY_LANGUAGE,
  DEEPGRAM_CATALOG_VERIFIED_AT,
  DEEPGRAM_FLUX_MODELS,
  DEEPGRAM_NOVA_MODELS,
  DEEPGRAM_STT_MODEL_LANGUAGES,
  DEEPGRAM_THINK_MODELS,
  DEEPGRAM_THINK_PROVIDERS,
} from './models.js';

/**
 * `SpeechCapabilities` (core) etendues de la date de verification du
 * catalogue et du modele courant (le contrat core n'a pas de champ dedie
 * au modele STT/TTS actif, seulement a la voix).
 */
export type DeepgramSpeechCapabilities = SpeechCapabilities & { verifiedAt: string; currentModel?: string };

/** `LLMAdapterCapabilities` (core) etendues de la date de verification du catalogue. */
export type DeepgramLLMAdapterCapabilities = LLMAdapterCapabilities & { verifiedAt: string };

function allSttLanguages(models: readonly string[]): string[] {
  const languages = new Set<string>();
  for (const model of models) {
    for (const language of DEEPGRAM_STT_MODEL_LANGUAGES[model] ?? []) {
      languages.add(language);
    }
  }
  return [...languages];
}

/** Capacites de `DeepgramNovaSTT` (modeles Nova batch). */
export function getDeepgramNovaSTTCapabilities(current?: { model?: string; language?: string }): DeepgramSpeechCapabilities {
  return {
    provider: 'deepgram-nova',
    providerName: 'Deepgram Nova',
    verifiedAt: DEEPGRAM_CATALOG_VERIFIED_AT,
    languages: allSttLanguages(DEEPGRAM_NOVA_MODELS),
    models: DEEPGRAM_NOVA_MODELS.map((id) => ({ id, name: id })),
    currentModel: current?.model,
    currentLanguage: current?.language,
  };
}

/** Capacites de `DeepgramFluxSTT` (modeles Flux streaming). */
export function getDeepgramFluxSTTCapabilities(current?: { model?: string; language?: string }): DeepgramSpeechCapabilities {
  return {
    provider: 'deepgram-flux',
    providerName: 'Deepgram Flux',
    verifiedAt: DEEPGRAM_CATALOG_VERIFIED_AT,
    languages: allSttLanguages(DEEPGRAM_FLUX_MODELS),
    models: DEEPGRAM_FLUX_MODELS.map((id) => ({ id, name: id })),
    currentModel: current?.model,
    currentLanguage: current?.language,
  };
}

/** Capacites de `DeepgramAuraTTS` (voix Aura-2, batch et streaming). */
export function getDeepgramAuraTTSCapabilities(current?: { voice?: string; language?: string }): DeepgramSpeechCapabilities {
  const voices: Voice[] = Object.entries(DEEPGRAM_AURA_VOICES_BY_LANGUAGE).flatMap(([language, entries]) =>
    entries.map((entry) => ({
      id: entry.id,
      name: entry.id,
      gender: entry.gender,
      languages: [language],
    })),
  );

  return {
    provider: 'deepgram-aura',
    providerName: 'Deepgram Aura-2',
    verifiedAt: DEEPGRAM_CATALOG_VERIFIED_AT,
    languages: Object.keys(DEEPGRAM_AURA_VOICES_BY_LANGUAGE),
    voices: voices.map((voice) => ({ id: voice.id, name: voice.name, gender: voice.gender, language: voice.languages[0] })),
    currentVoice: current?.voice,
    currentLanguage: current?.language,
  };
}

/** Capacites du `DeepgramVoiceAgentAdapter` (modeles de raisonnement geres par Deepgram). */
export function getDeepgramVoiceAgentCapabilities(current?: { model?: string; voice?: string }): DeepgramLLMAdapterCapabilities {
  const models: LLMModel[] = DEEPGRAM_THINK_PROVIDERS.flatMap((provider) =>
    DEEPGRAM_THINK_MODELS[provider].map((entry) => ({
      id: entry.id,
      name: entry.id,
      supportsAudio: false,
      supportsTools: true,
      description: `${provider} - ${entry.tier}`,
    })),
  );

  const voices: VoiceInfo[] = Object.entries(DEEPGRAM_AURA_VOICES_BY_LANGUAGE).flatMap(([language, entries]) =>
    entries.map((entry) => ({ id: entry.id, name: entry.id, gender: entry.gender, language })),
  );

  return {
    provider: 'deepgram-voice-agent',
    providerName: 'Deepgram Voice Agent',
    verifiedAt: DEEPGRAM_CATALOG_VERIFIED_AT,
    models,
    voices,
    currentModel: current?.model,
    currentVoice: current?.voice,
  };
}
