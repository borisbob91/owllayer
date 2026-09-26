import { describe, it, expect } from 'vitest';
import {
  DEEPGRAM_AURA_VOICES,
  DEEPGRAM_AURA_VOICES_BY_LANGUAGE,
  DEEPGRAM_DEFAULT_AURA_VOICE_BY_LANGUAGE,
  DEEPGRAM_FLUX_MODELS,
  DEEPGRAM_NOVA_MODELS,
  DEEPGRAM_STT_MODEL_LANGUAGES,
  DEEPGRAM_THINK_MODELS,
  DEEPGRAM_THINK_PROVIDERS,
  type DeepgramAuraVoice,
  type DeepgramFluxModel,
  type DeepgramNovaModel,
  type DeepgramThinkModel,
} from '../src/models.js';

describe('DEEPGRAM_NOVA_MODELS / DEEPGRAM_FLUX_MODELS', () => {
  it('has no duplicate model ids in either list', () => {
    expect(new Set(DEEPGRAM_NOVA_MODELS).size).toBe(DEEPGRAM_NOVA_MODELS.length);
    expect(new Set(DEEPGRAM_FLUX_MODELS).size).toBe(DEEPGRAM_FLUX_MODELS.length);
  });

  it('lists flux-general-en and flux-general-multi and no others', () => {
    expect(DEEPGRAM_FLUX_MODELS).toEqual(['flux-general-en', 'flux-general-multi']);
  });

  it('gives every listed Nova and Flux model a non-empty supported-language list', () => {
    for (const model of [...DEEPGRAM_NOVA_MODELS, ...DEEPGRAM_FLUX_MODELS]) {
      expect(DEEPGRAM_STT_MODEL_LANGUAGES[model], `missing languages for ${model}`).toBeDefined();
      expect(DEEPGRAM_STT_MODEL_LANGUAGES[model].length).toBeGreaterThan(0);
    }
  });

  it('accepts an unlisted model id at the type level (S15)', () => {
    const unlisted: DeepgramNovaModel = 'nova-4-not-yet-released';
    const unlistedFlux: DeepgramFluxModel = 'flux-future-model';
    expect(typeof unlisted).toBe('string');
    expect(typeof unlistedFlux).toBe('string');
  });
});

describe('DEEPGRAM_AURA_VOICES / DEEPGRAM_AURA_VOICES_BY_LANGUAGE', () => {
  it('has no duplicate voice ids across the flattened list', () => {
    expect(new Set(DEEPGRAM_AURA_VOICES).size).toBe(DEEPGRAM_AURA_VOICES.length);
  });

  it('every Aura-2 id follows aura-2-<name>-<lang> and belongs to its declared language group', () => {
    for (const [language, voices] of Object.entries(DEEPGRAM_AURA_VOICES_BY_LANGUAGE)) {
      for (const voice of voices) {
        expect(voice.id).toMatch(/^aura-2-[a-z]+-[a-z]{2}$/);
        expect(voice.id.endsWith(`-${language}`)).toBe(true);
        expect(['male', 'female']).toContain(voice.gender);
      }
    }
  });

  it('flattens to exactly the ids grouped by language, in the same total count', () => {
    const flattenedFromGroups = Object.values(DEEPGRAM_AURA_VOICES_BY_LANGUAGE).flatMap((voices) =>
      voices.map((voice) => voice.id),
    );
    expect(DEEPGRAM_AURA_VOICES.slice().sort()).toEqual(flattenedFromGroups.slice().sort());
  });

  it('has a default voice for every catalogued language', () => {
    for (const language of Object.keys(DEEPGRAM_AURA_VOICES_BY_LANGUAGE)) {
      expect(DEEPGRAM_DEFAULT_AURA_VOICE_BY_LANGUAGE[language]).toBeDefined();
      expect(DEEPGRAM_AURA_VOICES).toContain(DEEPGRAM_DEFAULT_AURA_VOICE_BY_LANGUAGE[language]);
    }
  });

  it('fixes the English default to aura-2-thalia-en and the French default to aura-2-agathe-fr', () => {
    expect(DEEPGRAM_DEFAULT_AURA_VOICE_BY_LANGUAGE.en).toBe('aura-2-thalia-en');
    expect(DEEPGRAM_DEFAULT_AURA_VOICE_BY_LANGUAGE.fr).toBe('aura-2-agathe-fr');
  });

  it('accepts an unlisted voice id at the type level (S15)', () => {
    const unlisted: DeepgramAuraVoice = 'aura-3-someone-xx';
    expect(typeof unlisted).toBe('string');
  });
});

describe('DEEPGRAM_THINK_PROVIDERS / DEEPGRAM_THINK_MODELS', () => {
  it('only lists open_ai, anthropic, and google (NVIDIA excluded until DG-7)', () => {
    expect(DEEPGRAM_THINK_PROVIDERS).toEqual(['open_ai', 'anthropic', 'google']);
  });

  it('groups every think model under its provider with a standard or advanced tier', () => {
    for (const provider of DEEPGRAM_THINK_PROVIDERS) {
      const models = DEEPGRAM_THINK_MODELS[provider];
      expect(models.length).toBeGreaterThan(0);
      for (const model of models) {
        expect(['standard', 'advanced']).toContain(model.tier);
      }
    }
  });

  it('has no duplicate model id within a single provider', () => {
    for (const provider of DEEPGRAM_THINK_PROVIDERS) {
      const ids = DEEPGRAM_THINK_MODELS[provider].map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('lists the default Voice Agent think model (gpt-5.4-mini) under open_ai at the standard tier', () => {
    const entry = DEEPGRAM_THINK_MODELS.open_ai.find((m) => m.id === 'gpt-5.4-mini');
    expect(entry).toEqual({ id: 'gpt-5.4-mini', tier: 'standard' });
  });

  it('accepts an unlisted think model id at the type level (S15)', () => {
    const unlisted: DeepgramThinkModel = 'gpt-6-not-yet-released';
    expect(typeof unlisted).toBe('string');
  });
});
