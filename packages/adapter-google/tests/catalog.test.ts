import { describe, it, expect } from 'vitest';
import {
  GOOGLE_CATALOG_VERIFIED_AT,
  GOOGLE_TEXT_MODELS,
  GOOGLE_LIVE_MODELS,
  GOOGLE_STT_MODELS,
  GOOGLE_TTS_MODELS,
  GOOGLE_DEFAULT_TEXT_MODEL,
  GOOGLE_DEFAULT_LIVE_MODEL,
  GOOGLE_DEPRECATED_MODELS,
  GEMINI_VOICES,
  isKnownGoogleModel,
  getGoogleDeprecatedModel,
  type GoogleAdapterOptions,
} from '../src/index.js';
import { GOOGLE_TTS_VOICES, getGoogleDefaultTTSVoice } from '../src/googleTtsVoices.js';
import { googleSupportsLanguage, isKnownGoogleVoice } from '../src/language.js';

// ---- US1 : listes actives non vides, ids uniques, role/status presents ----

describe('catalogue Google — modeles actifs (US1)', () => {
  const allModelLists = [GOOGLE_TEXT_MODELS, GOOGLE_LIVE_MODELS, GOOGLE_STT_MODELS, GOOGLE_TTS_MODELS];

  it('chaque liste active est non vide, avec ids uniques et role/status definis', () => {
    for (const list of allModelLists) {
      expect(list.length).toBeGreaterThan(0);
      const ids = list.map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const entry of list) {
        expect(entry.role).toBeTruthy();
        expect(['stable', 'preview']).toContain(entry.status);
      }
    }
  });

  it('GOOGLE_CATALOG_VERIFIED_AT est une date ISO', () => {
    expect(GOOGLE_CATALOG_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('les types d\'options acceptent une chaine libre (test au niveau du type)', () => {
    const options = {
      apiKey: 'test',
      model: 'my-custom-model',
    } satisfies GoogleAdapterOptions;
    expect(options.model).toBe('my-custom-model');
  });

  it('aucun modele actif n\'est un id deprecie', () => {
    const deprecatedIds = new Set(GOOGLE_DEPRECATED_MODELS.map((m) => m.id));
    for (const list of allModelLists) {
      for (const entry of list) {
        expect(deprecatedIds.has(entry.id)).toBe(false);
      }
    }
  });
});

// ---- US2 : voix par genre et langue ----

/** Table de reference (Chirp 3 HD) reutilisee cote adapter-livekit (FR-009). */
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

describe('catalogue Google — voix Gemini (US2)', () => {
  it('GEMINI_VOICES contient exactement les 30 voix documentees', () => {
    expect(GEMINI_VOICES.length).toBe(30);
    const ids = new Set(GEMINI_VOICES.map((v) => v.id));
    expect(ids.size).toBe(30);
  });

  it('les genres Chirp 3 HD de la fixture correspondent au catalogue', () => {
    for (const [id, gender] of Object.entries(CHIRP3_HD_GENDER_FIXTURE)) {
      const voice = GEMINI_VOICES.find((v) => v.id === id);
      expect(voice, `voix ${id} attendue dans GEMINI_VOICES`).toBeDefined();
      expect(voice?.gender).toBe(gender);
    }
  });

  it('toutes les voix Gemini sont multilingues', () => {
    for (const voice of GEMINI_VOICES) {
      expect(voice.languages).toEqual(['multilingual']);
    }
  });

  it('GOOGLE_TTS_VOICES couvre les 9 locales declarees', () => {
    const locales = ['fr-FR', 'en-US', 'en-GB', 'es-ES', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN'];
    for (const locale of locales) {
      const voicesForLocale = GOOGLE_TTS_VOICES.filter((v) => v.languages.includes(locale));
      expect(voicesForLocale.length, `voix attendues pour ${locale}`).toBeGreaterThan(0);
    }
  });

  it('getGoogleDefaultTTSVoice("fr-FR") retourne une voix fr-FR', () => {
    const voiceId = getGoogleDefaultTTSVoice('fr-FR');
    expect(voiceId).toBeDefined();
    const voice = GOOGLE_TTS_VOICES.find((v) => v.id === voiceId);
    expect(voice?.languages).toContain('fr-FR');
  });

  it('getGoogleDefaultTTSVoice retourne undefined pour une langue non cataloguee', () => {
    expect(getGoogleDefaultTTSVoice('xx-XX')).toBeUndefined();
  });
});

// ---- US3 : validation et deprecations ----

describe('catalogue Google — validation et langues (US3)', () => {
  it('isKnownGoogleModel distingue id connu / inconnu, sans jamais lever', () => {
    expect(isKnownGoogleModel(GOOGLE_DEFAULT_TEXT_MODEL)).toBe(true);
    expect(isKnownGoogleModel('totally-unknown-model')).toBe(false);
    expect(isKnownGoogleModel(GOOGLE_DEFAULT_LIVE_MODEL, 'live')).toBe(true);
    expect(isKnownGoogleModel(GOOGLE_DEFAULT_LIVE_MODEL, 'stt')).toBe(false);
  });

  it('isKnownGoogleVoice distingue voix connue / inconnue', () => {
    expect(isKnownGoogleVoice('Fenrir')).toBe(true);
    expect(isKnownGoogleVoice('Orbit')).toBe(false);
  });

  it('googleSupportsLanguage : correspondance exacte, sous-tag primaire, non-correspondance, jamais de levee', () => {
    expect(googleSupportsLanguage('fr-FR-Neural2-F', 'fr-FR')).toEqual({ supported: true });
    expect(googleSupportsLanguage('fr-FR-Neural2-F', 'fr')).toEqual({ supported: true });
    expect(googleSupportsLanguage('fr-FR-Neural2-F', 'en-US')).toEqual({
      supported: false,
      supportedLanguages: ['fr-FR'],
    });
    expect(() => googleSupportsLanguage('unknown-id', 'zz-ZZ')).not.toThrow();
    expect(googleSupportsLanguage('unknown-id', 'zz-ZZ')).toEqual({ supported: true });
  });

  it('googleSupportsLanguage : les entrees multilingues supportent toute langue', () => {
    expect(googleSupportsLanguage('Fenrir', 'zz-ZZ')).toEqual({ supported: true });
  });

  it('getGoogleDeprecatedModel("gemini-2.0-flash") est retire au 2026-06-01 avec remplacant', () => {
    const entry = getGoogleDeprecatedModel('gemini-2.0-flash');
    expect(entry).toBeDefined();
    expect(entry?.status).toBe('retired');
    expect(entry?.shutdownDate).toBe('2026-06-01');
    expect(entry?.replacement).toBe('gemini-3.6-flash');
  });

  it('getGoogleDeprecatedModel retourne undefined pour un id non deprecie', () => {
    expect(getGoogleDeprecatedModel(GOOGLE_DEFAULT_TEXT_MODEL)).toBeUndefined();
  });

  it('aucun defaut n\'est dans le catalogue deprecie (FR-017)', () => {
    const deprecatedIds = new Set(GOOGLE_DEPRECATED_MODELS.map((m) => m.id));
    expect(deprecatedIds.has(GOOGLE_DEFAULT_TEXT_MODEL)).toBe(false);
    expect(deprecatedIds.has(GOOGLE_DEFAULT_LIVE_MODEL)).toBe(false);
  });

  it('gemini-2.0-flash n\'est plus le defaut (FR-017)', () => {
    expect(GOOGLE_DEFAULT_TEXT_MODEL).not.toBe('gemini-2.0-flash');
  });
});

describe('catalogue Google — correctifs d\'audit', () => {
  it('GOOGLE_STT_MODELS ne propose que des modeles Cloud Speech-to-Text ; Gemini transcribe est a part', async () => {
    const { GEMINI_TRANSCRIBE_MODELS } = await import('../src/index.js');
    expect(GOOGLE_STT_MODELS.some((m) => m.id.startsWith('gemini-'))).toBe(false);
    expect(GEMINI_TRANSCRIBE_MODELS.map((m) => m.id)).toEqual(['gemini-3.5-transcribe', 'gemini-3.5-transcribe-live']);
    expect(isKnownGoogleModel('gemini-3.5-transcribe', 'stt')).toBe(true);
    expect(isKnownGoogleModel('latest_long', 'stt')).toBe(true);
  });

  it('Gemini 3.8 Flash TTS est au catalogue TTS', () => {
    expect(GOOGLE_TTS_MODELS.map((m) => m.id)).toContain('gemini-3.8-flash-tts');
  });
});
