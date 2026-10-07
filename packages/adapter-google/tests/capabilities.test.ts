import { describe, it, expect } from 'vitest';
import { GoogleAdapter } from '../src/GoogleAdapter.js';
import { GoogleLiveAdapter } from '../src/GoogleLiveAdapter.js';
import { GoogleSTT } from '../src/GoogleSTT.js';
import { GoogleTTS } from '../src/GoogleTTS.js';
import {
  GOOGLE_TEXT_MODELS,
  GOOGLE_LIVE_MODELS,
  GOOGLE_STT_MODELS,
  GOOGLE_DEPRECATED_MODELS,
  GEMINI_VOICES,
  GOOGLE_DEFAULT_TEXT_MODEL,
} from '../src/catalog.js';

describe('getCapabilities() construites depuis le catalogue (US4)', () => {
  it('GoogleAdapter.getCapabilities() ne contient que des modeles du catalogue texte', () => {
    const adapter = new GoogleAdapter({ apiKey: 'test-key' });
    const caps = adapter.getCapabilities();
    const catalogIds = new Set(GOOGLE_TEXT_MODELS.map((m) => m.id));
    for (const model of caps.models) {
      expect(catalogIds.has(model.id)).toBe(true);
    }
    expect(caps.currentModel).toBe(GOOGLE_DEFAULT_TEXT_MODEL);
  });

  it('GoogleAdapter.getCapabilities() ne contient jamais de modele deprecie', () => {
    const adapter = new GoogleAdapter({ apiKey: 'test-key' });
    const caps = adapter.getCapabilities();
    const deprecatedIds = new Set(GOOGLE_DEPRECATED_MODELS.map((m) => m.id));
    for (const model of caps.models) {
      expect(deprecatedIds.has(model.id)).toBe(false);
    }
  });

  it('GoogleLiveAdapter.getCapabilities() ne contient que des modeles/voix du catalogue', () => {
    const live = new GoogleLiveAdapter({ apiKey: 'test-key' });
    const caps = live.getCapabilities();
    const catalogModelIds = new Set(GOOGLE_LIVE_MODELS.map((m) => m.id));
    const catalogVoiceIds = new Set(GEMINI_VOICES.map((v) => v.id));
    for (const model of caps.models) {
      expect(catalogModelIds.has(model.id)).toBe(true);
    }
    for (const voice of caps.voices ?? []) {
      expect(catalogVoiceIds.has(voice.id)).toBe(true);
      expect(['male', 'female', 'neutral', undefined]).toContain(voice.gender);
    }
  });

  it('GoogleSTT.getCapabilities() ne contient que des modeles du catalogue stt', () => {
    const stt = new GoogleSTT({ apiKey: 'test-key' });
    const caps = stt.getCapabilities();
    const catalogIds = new Set(GOOGLE_STT_MODELS.map((m) => m.id));
    for (const model of caps.models ?? []) {
      expect(catalogIds.has(model.id)).toBe(true);
    }
  });

  it('GoogleTTS.getCapabilities() ne contient que des voix du catalogue', () => {
    const tts = new GoogleTTS({ apiKey: 'test-key' });
    const caps = tts.getCapabilities();
    expect((caps.voices ?? []).length).toBeGreaterThan(0);
    for (const voice of caps.voices ?? []) {
      expect(voice.gender === undefined || ['male', 'female', 'neutral'].includes(voice.gender)).toBe(true);
    }
  });
});

describe('capacites Google — correctifs d\'audit', () => {
  it('GoogleSTT.getCapabilities() liste exactement les modeles Cloud Speech-to-Text', () => {
    const stt = new GoogleSTT({ apiKey: 'test-key' });
    expect((stt.getCapabilities().models ?? []).map((m) => m.id)).toEqual(GOOGLE_STT_MODELS.map((m) => m.id));
  });

  it('GoogleTTS.getCapabilities() donne le genre documente de chaque voix', () => {
    const voices = new GoogleTTS({ apiKey: 'test-key' }).getCapabilities().voices ?? [];
    expect(voices.find((v) => v.id === 'fr-FR-Chirp3-HD-Puck')?.gender).toBe('male');
    expect(voices.find((v) => v.id === 'fr-FR-Chirp3-HD-Kore')?.gender).toBe('female');
  });
});
