import { describe, it, expect } from 'vitest';
import { assertModelSupportsLanguage, normalizeLanguageCode, resolveLanguageDefaults } from '../src/language.js';

describe('normalizeLanguageCode', () => {
  it('maps a regional tag to its primary language subtag', () => {
    expect(normalizeLanguageCode('fr-FR')).toBe('fr');
    expect(normalizeLanguageCode('en-US')).toBe('en');
  });

  it('lowercases and passes through an already-short code', () => {
    expect(normalizeLanguageCode('FR')).toBe('fr');
    expect(normalizeLanguageCode('en')).toBe('en');
  });

  it('handles underscore-separated tags the same way as hyphenated ones', () => {
    expect(normalizeLanguageCode('pt_BR')).toBe('pt');
  });
});

describe('assertModelSupportsLanguage', () => {
  it('rejects French on the English-only Flux model (S13)', () => {
    expect(() => assertModelSupportsLanguage('flux-general-en', 'fr')).toThrowError(
      expect.objectContaining({ code: 'UNSUPPORTED_LANGUAGE' }),
    );
  });

  it('accepts French on the multilingual Flux model', () => {
    expect(() => assertModelSupportsLanguage('flux-general-multi', 'fr')).not.toThrow();
  });

  it('accepts English on the English-only Flux model', () => {
    expect(() => assertModelSupportsLanguage('flux-general-en', 'en')).not.toThrow();
  });

  it('accepts a regional variant of a supported language (fr-FR against flux-general-multi)', () => {
    expect(() => assertModelSupportsLanguage('flux-general-multi', 'fr-FR')).not.toThrow();
  });

  it('rejects an unsupported language on a domain-specific English-only Nova model', () => {
    expect(() => assertModelSupportsLanguage('nova-3-medical', 'fr')).toThrowError(
      expect.objectContaining({ code: 'UNSUPPORTED_LANGUAGE' }),
    );
  });

  it('accepts a language for an Aura-2 voice matching that voice language group', () => {
    expect(() => assertModelSupportsLanguage('aura-2-agathe-fr', 'fr')).not.toThrow();
  });

  it('rejects a language for an Aura-2 voice outside that voice language group', () => {
    expect(() => assertModelSupportsLanguage('aura-2-agathe-fr', 'en')).toThrowError(
      expect.objectContaining({ code: 'UNSUPPORTED_LANGUAGE' }),
    );
  });

  it('passes an unlisted identifier through without a local check', () => {
    expect(() => assertModelSupportsLanguage('some-future-model-id', 'zz')).not.toThrow();
  });

  it('reports the deepgram provider and no other provider name on rejection', () => {
    try {
      assertModelSupportsLanguage('flux-general-en', 'fr');
      throw new Error('expected assertModelSupportsLanguage to throw');
    } catch (error) {
      expect((error as { provider?: string }).provider).toBe('deepgram');
    }
  });
});

describe('resolveLanguageDefaults', () => {
  it('defaults English sessions to flux-general-en, nova-3, and aura-2-thalia-en, with no language hints', () => {
    const defaults = resolveLanguageDefaults('en');
    expect(defaults).toEqual({
      language: 'en',
      novaModel: 'nova-3',
      fluxModel: 'flux-general-en',
      auraVoice: 'aura-2-thalia-en',
    });
  });

  it('defaults French sessions to flux-general-multi with a language hint and aura-2-agathe-fr', () => {
    const defaults = resolveLanguageDefaults('fr-FR');
    expect(defaults.language).toBe('fr');
    expect(defaults.fluxModel).toBe('flux-general-multi');
    expect(defaults.languageHints).toEqual(['fr']);
    expect(defaults.auraVoice).toBe('aura-2-agathe-fr');
  });

  it('defaults an unnamed en/fr catalog language (e.g. Japanese) to its first listed Aura-2 voice', () => {
    const defaults = resolveLanguageDefaults('ja');
    expect(defaults.auraVoice).toBe('aura-2-ama-ja');
  });

  it('throws UNSUPPORTED_LANGUAGE when no Aura-2 voice exists for the session language', () => {
    expect(() => resolveLanguageDefaults('zz')).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_LANGUAGE' }));
  });

  it('falls back to French when no session language is given', () => {
    const defaults = resolveLanguageDefaults('');
    expect(defaults.language).toBe('fr');
  });
});
