import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  GEMINI_LIVE_VOICES,
  GEMINI_LIVE_MODELS,
  GEMINI_CATALOG_VERIFIED_AT,
  GEMINI_DEPRECATED_MODELS,
  DEFAULT_GEMINI_LIVE_MODEL,
  DEFAULT_GEMINI_LIVE_VOICE,
  getGeminiDeprecatedModel,
  buildGeminiLiveCapabilities,
} from '../src/live/capabilities.js';
import {
  GEMINI_TTS_VOICES,
  GEMINI_TTS_VOICE_INFOS,
  GEMINI_TTS_MODELS,
  DEFAULT_GEMINI_TTS_MODEL,
  buildGeminiTTSCapabilities,
} from '../src/tts/geminiVoices.js';
import { GEMINI_LANGUAGES, isKnownGeminiModel, isKnownGeminiVoice, geminiSupportsLanguage } from '../src/live/geminiLanguage.js';
import { GeminiLiveAdapter } from '../src/live/GeminiLiveAdapter.js';
import { GeminiTTSService } from '../src/tts/GeminiTTSService.js';

/** Fixture identique a packages/adapter-google/tests/catalog.test.ts (FR-009). */
const CHIRP3_HD_GENDER_FIXTURE: Record<string, 'male' | 'female'> = {
  Puck: 'male',
  Zephyr: 'female',
  Kore: 'female',
  Charon: 'male',
  Fenrir: 'male',
  Aoede: 'female',
  Achernar: 'female',
  Achird: 'male',
};

describe('catalogue LiveKit Gemini — voix (US2, FR-009)', () => {
  it('GEMINI_LIVE_VOICES et GEMINI_TTS_VOICES ont les 30 voix documentees', () => {
    expect(GEMINI_LIVE_VOICES.length).toBe(30);
    expect(GEMINI_TTS_VOICES.length).toBe(30);
    expect(new Set(GEMINI_LIVE_VOICES.map((v) => v.id)).size).toBe(30);
  });

  it('les genres correspondent a la fixture Chirp 3 HD, identique a adapter-google', () => {
    for (const [id, gender] of Object.entries(CHIRP3_HD_GENDER_FIXTURE)) {
      const liveVoice = GEMINI_LIVE_VOICES.find((v) => v.id === id);
      const ttsVoice = GEMINI_TTS_VOICE_INFOS.find((v) => v.id === id);
      expect(liveVoice?.gender, `Live voice ${id}`).toBe(gender);
      expect(ttsVoice?.gender, `TTS voice ${id}`).toBe(gender);
    }
  });

  it('export names et types inchanges (FR-012) : GEMINI_LIVE_VOICES, GEMINI_TTS_VOICES, GEMINI_TTS_VOICE_INFOS, GEMINI_TTS_MODELS', () => {
    expect(Array.isArray(GEMINI_LIVE_VOICES)).toBe(true);
    expect(Array.isArray(GEMINI_TTS_VOICES)).toBe(true);
    expect(Array.isArray(GEMINI_TTS_VOICE_INFOS)).toBe(true);
    expect(GEMINI_TTS_MODELS.length).toBeGreaterThan(0);
  });
});

describe('catalogue LiveKit Gemini — modeles et depreciations (US1/US3)', () => {
  it('GEMINI_LIVE_MODELS est non vide avec role/status, GEMINI_CATALOG_VERIFIED_AT est une date ISO', () => {
    expect(GEMINI_LIVE_MODELS.length).toBeGreaterThan(0);
    for (const entry of GEMINI_LIVE_MODELS) {
      expect(entry.role).toBe('live');
      expect(['stable', 'preview']).toContain(entry.status);
    }
    expect(GEMINI_CATALOG_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("le defaut Live est gemini-2.5-flash-native-audio-preview-12-2025 et n'est pas deprecie", () => {
    expect(DEFAULT_GEMINI_LIVE_MODEL).toBe('gemini-2.5-flash-native-audio-preview-12-2025');
    const deprecatedIds = new Set(GEMINI_DEPRECATED_MODELS.map((m) => m.id));
    expect(deprecatedIds.has(DEFAULT_GEMINI_LIVE_MODEL)).toBe(false);
    expect(deprecatedIds.has(DEFAULT_GEMINI_TTS_MODEL)).toBe(false);
  });

  it('isKnownGeminiModel / isKnownGeminiVoice distinguent connu / inconnu, sans jamais lever', () => {
    expect(isKnownGeminiModel(DEFAULT_GEMINI_LIVE_MODEL, 'live')).toBe(true);
    expect(isKnownGeminiModel('not-a-model', 'live')).toBe(false);
    expect(isKnownGeminiModel(DEFAULT_GEMINI_TTS_MODEL, 'tts')).toBe(true);
    expect(isKnownGeminiVoice('Fenrir')).toBe(true);
    expect(isKnownGeminiVoice('not-a-voice')).toBe(false);
  });

  it('geminiSupportsLanguage : tout est multilingue (edge case)', () => {
    expect(geminiSupportsLanguage(DEFAULT_GEMINI_LIVE_MODEL, 'fr-FR')).toEqual({ supported: true });
    expect(GEMINI_LANGUAGES).toEqual(['multilingual']);
  });

  it('getGeminiDeprecatedModel retourne les entrees du catalogue deprecie (ancien alias Live)', () => {
    const entry = getGeminiDeprecatedModel('gemini-2.5-flash-native-audio-preview');
    expect(entry).toBeDefined();
    expect(entry?.replacement).toBe('gemini-2.5-flash-native-audio-preview-12-2025');
    expect(getGeminiDeprecatedModel(DEFAULT_GEMINI_LIVE_MODEL)).toBeUndefined();
  });
});

describe('GeminiLiveAdapter / GeminiTTSService — avertissement de depreciation (US3)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('GeminiLiveAdapter avertit une fois pour un modele deprecie (chaine libre) et garde la valeur', () => {
    const adapter = new GeminiLiveAdapter({ apiKey: 'k', model: 'gemini-2.5-flash-native-audio-preview' });
    const messages = warnSpy.mock.calls.map((c) => c.join(' '));
    expect(messages.some((m) => m.includes('"gemini-2.5-flash-native-audio-preview"'))).toBe(true);
    expect((adapter as any).model).toBe('gemini-2.5-flash-native-audio-preview');
  });

  it('GeminiLiveAdapter n\'avertit pas pour le defaut ou un id non repertorie', () => {
    new GeminiLiveAdapter({ apiKey: 'k' });
    expect(warnSpy).not.toHaveBeenCalled();
    new GeminiLiveAdapter({ apiKey: 'k', model: 'my-custom-model' });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('GeminiTTSService avertit une fois pour un modele deprecie (chaine libre)', () => {
    new GeminiTTSService({ apiKey: 'k', model: 'gemini-2.5-flash-tts' });
    const messages = warnSpy.mock.calls.map((c) => c.join(' '));
    expect(messages.some((m) => m.includes('gemini-2.5-flash-tts'))).toBe(true);
  });

  it('GeminiTTSService n\'avertit pas pour le defaut', () => {
    new GeminiTTSService({ apiKey: 'k' });
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('getCapabilities() construites depuis le catalogue (US4)', () => {
  it('buildGeminiLiveCapabilities ne contient que des entrees du catalogue', () => {
    const caps = buildGeminiLiveCapabilities();
    const modelIds = new Set(GEMINI_LIVE_MODELS.map((m) => m.id));
    const voiceIds = new Set(GEMINI_LIVE_VOICES.map((v) => v.id));
    for (const model of caps.models) {
      expect(modelIds.has(model.id)).toBe(true);
    }
    for (const voice of caps.voices ?? []) {
      expect(voiceIds.has(voice.id)).toBe(true);
    }
  });

  it('buildGeminiTTSCapabilities ne contient que des entrees du catalogue', () => {
    const caps = buildGeminiTTSCapabilities('Kore', DEFAULT_GEMINI_TTS_MODEL);
    const voiceIds = new Set(GEMINI_TTS_VOICE_INFOS.map((v) => v.id));
    for (const voice of caps.voices ?? []) {
      expect(voiceIds.has(voice.id)).toBe(true);
    }
  });
});

describe('catalogue LiveKit Gemini — defaut de voix (audit)', () => {
  it('la voix Live par defaut reste Puck (voix documentee, non depreciee)', () => {
    expect(DEFAULT_GEMINI_LIVE_VOICE).toBe('Puck');
    expect(buildGeminiLiveCapabilities().currentVoice).toBe('Puck');
  });
});
