import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleAdapter } from '../src/GoogleAdapter.js';
import { GoogleLiveAdapter } from '../src/GoogleLiveAdapter.js';
import { GoogleTTS } from '../src/GoogleTTS.js';

// Espionne console.warn : createLogger('...').warn() ecrit via console.warn (packages/core/src/utils/logger.ts).
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe('GoogleAdapter — avertissement de depreciation (FR-016)', () => {
  it('avertit une fois pour un modele deprecie passe en chaine libre, et garde la valeur', () => {
    const adapter = new GoogleAdapter({ apiKey: 'test-key', model: 'gemini-2.0-flash' });
    const messages = warnSpy.mock.calls.map((call) => call.join(' '));
    const match = messages.find((m) => m.includes('gemini-2.0-flash'));
    expect(match).toBeDefined();
    expect(match).toContain('retired');
    expect(match).toContain('2026-06-01');
    expect(match).toContain('gemini-3.6-flash');
    expect((adapter as any).model).toBe('gemini-2.0-flash');
  });

  it('n\'avertit pas pour un modele non repertorie', () => {
    new GoogleAdapter({ apiKey: 'test-key', model: 'my-custom-model' });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('n\'avertit pas pour le modele par defaut', () => {
    new GoogleAdapter({ apiKey: 'test-key' });
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('GoogleLiveAdapter — avertissement de depreciation', () => {
  it('avertit une fois a la construction avec un modele Live deprecie', () => {
    new GoogleLiveAdapter({ apiKey: 'test-key', model: 'gemini-2.5-flash-native-audio-preview-12-2025' });
    const messages = warnSpy.mock.calls.map((call) => call.join(' '));
    expect(messages.some((m) => m.includes('gemini-2.5-flash-native-audio-preview-12-2025'))).toBe(true);
  });

  it('n\'avertit pas pour le modele Live par defaut', () => {
    new GoogleLiveAdapter({ apiKey: 'test-key' });
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('GoogleTTS — avertissement de langue (FR-014)', () => {
  it('avertit une fois quand la voix repertoriee ne supporte pas defaultLanguage', () => {
    new GoogleTTS({ apiKey: 'test-key', voice: 'fr-FR-Neural2-F', defaultLanguage: 'en-US' });
    const messages = warnSpy.mock.calls.map((call) => call.join(' '));
    const match = messages.find((m) => m.includes('fr-FR-Neural2-F'));
    expect(match).toBeDefined();
    expect(match).toContain('en-US');
    expect(match).toContain('fr-FR');
  });

  it('n\'avertit pas pour une voix non repertoriee', () => {
    new GoogleTTS({ apiKey: 'test-key', voice: 'my-voice', defaultLanguage: 'en-US' });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('n\'avertit pas quand la voix repertoriee supporte la langue', () => {
    new GoogleTTS({ apiKey: 'test-key', voice: 'fr-FR-Neural2-F', defaultLanguage: 'fr-FR' });
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
