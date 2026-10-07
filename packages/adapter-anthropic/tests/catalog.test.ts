import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ANTHROPIC_CATALOG_VERIFIED_AT,
  ANTHROPIC_MODELS,
  ANTHROPIC_DEFAULT_MODEL,
  ANTHROPIC_DEPRECATED_MODELS,
  ANTHROPIC_LANGUAGES,
  isKnownAnthropicModel,
  anthropicSupportsLanguage,
  getAnthropicDeprecatedModel,
  type AnthropicModel,
} from '../src/catalog.js';
import { AnthropicAdapter, type AnthropicAdapterOptions } from '../src/index.js';

describe('catalogue Anthropic — modeles (US1)', () => {
  it('ANTHROPIC_MODELS est non vide, ids uniques, role text et statut', () => {
    expect(ANTHROPIC_MODELS.length).toBeGreaterThan(0);
    const ids = ANTHROPIC_MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of ANTHROPIC_MODELS) {
      expect(entry.role).toBe('text');
      expect(entry.status).toBe('stable');
    }
  });

  it('ANTHROPIC_CATALOG_VERIFIED_AT est une date ISO', () => {
    expect(ANTHROPIC_CATALOG_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('ANTHROPIC_DEFAULT_MODEL est claude-sonnet-5 et n\'est pas deprecie', () => {
    expect(ANTHROPIC_DEFAULT_MODEL).toBe('claude-sonnet-5');
    expect(getAnthropicDeprecatedModel(ANTHROPIC_DEFAULT_MODEL)).toBeUndefined();
    const deprecatedIds = new Set(ANTHROPIC_DEPRECATED_MODELS.map((m) => m.id));
    expect(deprecatedIds.has(ANTHROPIC_DEFAULT_MODEL)).toBe(false);
  });

  it('AnthropicModel accepte une chaine libre (test au niveau du type)', () => {
    const options = { apiKey: 'test', model: 'my-custom-model' } satisfies AnthropicAdapterOptions;
    expect(options.model).toBe('my-custom-model');
    const value: AnthropicModel = 'another-custom-id';
    expect(value).toBe('another-custom-id');
  });

  it('isKnownAnthropicModel distingue connu / inconnu, sans jamais lever', () => {
    expect(isKnownAnthropicModel(ANTHROPIC_DEFAULT_MODEL)).toBe(true);
    expect(isKnownAnthropicModel('totally-unknown-model')).toBe(false);
    expect(() => isKnownAnthropicModel('anything')).not.toThrow();
  });

  it('anthropicSupportsLanguage : les modeles Anthropic sont multilingues (edge case)', () => {
    expect(anthropicSupportsLanguage(ANTHROPIC_DEFAULT_MODEL, 'fr-FR')).toEqual({ supported: true });
    expect(anthropicSupportsLanguage('unknown-id', 'zz-ZZ')).toEqual({ supported: true });
    expect(ANTHROPIC_LANGUAGES).toEqual(['multilingual']);
  });

  it('getAnthropicDeprecatedModel retourne les entrees du catalogue deprecie', () => {
    const entry = getAnthropicDeprecatedModel('claude-opus-4-1-20250805');
    expect(entry).toBeDefined();
    expect(entry?.status).toBe('retired');
    expect(entry?.shutdownDate).toBe('2026-08-05');
    expect(entry?.replacement).toBe('claude-opus-4-8');
    expect(getAnthropicDeprecatedModel('claude-sonnet-5')).toBeUndefined();
  });
});

describe('AnthropicAdapter — avertissement de depreciation (US3)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('avertit une fois pour un modele deprecie passe en chaine libre', () => {
    const adapter = new AnthropicAdapter({ apiKey: 'test-key', model: 'claude-opus-4-1-20250805' });
    const messages = warnSpy.mock.calls.map((call) => call.join(' '));
    const match = messages.find((m) => m.includes('claude-opus-4-1-20250805'));
    expect(match).toBeDefined();
    expect(match).toContain('retired');
    expect(match).toContain('claude-opus-4-8');
    expect((adapter as any).model).toBe('claude-opus-4-1-20250805');
  });

  it('n\'avertit pas pour un modele non repertorie', () => {
    new AnthropicAdapter({ apiKey: 'test-key', model: 'my-custom-model' });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('n\'avertit pas pour le modele par defaut', () => {
    new AnthropicAdapter({ apiKey: 'test-key' });
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('AnthropicAdapter.getCapabilities() (US4)', () => {
  it('correspond au catalogue et ne contient aucun modele deprecie', () => {
    const adapter = new AnthropicAdapter({ apiKey: 'test-key' });
    const caps = adapter.getCapabilities();
    const catalogIds = new Set(ANTHROPIC_MODELS.map((m) => m.id));
    const deprecatedIds = new Set(ANTHROPIC_DEPRECATED_MODELS.map((m) => m.id));
    expect(caps.models.map((m) => m.id)).toEqual(ANTHROPIC_MODELS.map((m) => m.id));
    for (const model of caps.models) {
      expect(catalogIds.has(model.id)).toBe(true);
      expect(deprecatedIds.has(model.id)).toBe(false);
    }
  });
});

describe('catalogue Anthropic — modeles actuels (audit)', () => {
  it('liste les quatre modeles actuels de la page officielle', () => {
    for (const id of ['claude-fable-5-1', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-4-5']) {
      expect(isKnownAnthropicModel(id)).toBe(true);
      expect(ANTHROPIC_MODELS.find((m) => m.id === id)?.status).toBe('stable');
    }
  });
});
