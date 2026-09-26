import { describe, it, expect } from 'vitest';
import {
  getDeepgramAuraTTSCapabilities,
  getDeepgramFluxSTTCapabilities,
  getDeepgramNovaSTTCapabilities,
  getDeepgramVoiceAgentCapabilities,
} from '../src/capabilities.js';
import { DEEPGRAM_AURA_VOICES, DEEPGRAM_CATALOG_VERIFIED_AT, DEEPGRAM_FLUX_MODELS, DEEPGRAM_NOVA_MODELS, DEEPGRAM_THINK_MODELS } from '../src/models.js';

describe('getDeepgramNovaSTTCapabilities', () => {
  it('lists exactly the catalogued Nova models and carries the catalog verification date', () => {
    const capabilities = getDeepgramNovaSTTCapabilities();
    expect(capabilities.provider).toBe('deepgram-nova');
    expect(capabilities.verifiedAt).toBe(DEEPGRAM_CATALOG_VERIFIED_AT);
    expect(capabilities.models?.map((m) => m.id).sort()).toEqual([...DEEPGRAM_NOVA_MODELS].sort());
  });

  it('reports the current model and language when given', () => {
    const capabilities = getDeepgramNovaSTTCapabilities({ model: 'nova-3', language: 'fr' });
    expect(capabilities.currentModel).toBe('nova-3');
    expect(capabilities.currentLanguage).toBe('fr');
  });
});

describe('getDeepgramFluxSTTCapabilities', () => {
  it('lists exactly the catalogued Flux models and carries the catalog verification date', () => {
    const capabilities = getDeepgramFluxSTTCapabilities();
    expect(capabilities.verifiedAt).toBe(DEEPGRAM_CATALOG_VERIFIED_AT);
    expect(capabilities.models?.map((m) => m.id).sort()).toEqual([...DEEPGRAM_FLUX_MODELS].sort());
  });
});

describe('getDeepgramAuraTTSCapabilities', () => {
  it('lists exactly the catalogued Aura-2 voices and carries the catalog verification date', () => {
    const capabilities = getDeepgramAuraTTSCapabilities();
    expect(capabilities.verifiedAt).toBe(DEEPGRAM_CATALOG_VERIFIED_AT);
    expect(capabilities.voices?.map((v) => v.id).sort()).toEqual([...DEEPGRAM_AURA_VOICES].sort());
  });

  it('reports the current voice and language when given', () => {
    const capabilities = getDeepgramAuraTTSCapabilities({ voice: 'aura-2-agathe-fr', language: 'fr' });
    expect(capabilities.currentVoice).toBe('aura-2-agathe-fr');
    expect(capabilities.currentLanguage).toBe('fr');
  });
});

describe('getDeepgramVoiceAgentCapabilities', () => {
  it('lists exactly the catalogued Deepgram-managed think models across the four managed providers', () => {
    const capabilities = getDeepgramVoiceAgentCapabilities();
    const managedProviders = Object.keys(DEEPGRAM_THINK_MODELS) as Array<keyof typeof DEEPGRAM_THINK_MODELS>;
    const expectedIds = managedProviders.flatMap((provider) => DEEPGRAM_THINK_MODELS[provider].map((m) => m.id));
    expect(capabilities.models.map((m) => m.id).sort()).toEqual(expectedIds.sort());
    expect(capabilities.verifiedAt).toBe(DEEPGRAM_CATALOG_VERIFIED_AT);
  });

  it('lists the NVIDIA model now that it is a Deepgram-managed provider (revised R6)', () => {
    const capabilities = getDeepgramVoiceAgentCapabilities();
    expect(capabilities.models.some((m) => m.id === 'nemotron-3-nano-30B-A3B' && m.description?.includes('nvidia'))).toBe(
      true,
    );
  });
});
