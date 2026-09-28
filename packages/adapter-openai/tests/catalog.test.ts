import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  OPENAI_CHAT_MODELS,
  OPENAI_REALTIME_MODELS,
  OPENAI_TTS_MODELS,
  OPENAI_STT_MODELS,
  OPENAI_TTS_VOICES,
  OPENAI_REALTIME_VOICES,
  OPENAI_CATALOG_VERIFIED_AT,
  OPENAI_MODEL_CATALOG,
  OPENAI_VOICE_CATALOG,
  OPENAI_DEFAULT_CHAT_MODEL,
  OPENAI_DEFAULT_REALTIME_MODEL,
  OPENAI_DEFAULT_REALTIME_VOICE,
  OPENAI_DEFAULT_TTS_MODEL,
  OPENAI_DEFAULT_TTS_VOICE,
  OPENAI_DEFAULT_STT_MODEL,
  OPENAI_DEPRECATED_MODELS,
  isKnownOpenAIModel,
  isKnownOpenAIVoice,
  getOpenAIDeprecatedModel,
} from '../src/models.js';
import { OpenAIAdapter } from '../src/OpenAIAdapter.js';
import { OpenAILiveAdapter } from '../src/OpenAILiveAdapter.js';
import { OpenAITTS } from '../src/OpenAITTS.js';
import { WhisperSTT } from '../src/WhisperSTT.js';

describe('catalogue OpenAI — compatibilite des exports existants (US1)', () => {
  it('les listes existantes gardent leurs entrees (superset autorise)', () => {
    for (const id of ['gpt-4o', 'gpt-5.5', 'gpt-4.1']) {
      expect(OPENAI_CHAT_MODELS as readonly string[]).toContain(id);
    }
    for (const id of ['gpt-realtime-1.5', 'gpt-realtime-2.1']) {
      expect(OPENAI_REALTIME_MODELS as readonly string[]).toContain(id);
    }
    expect(OPENAI_TTS_MODELS.length).toBeGreaterThan(0);
    expect(OPENAI_STT_MODELS.length).toBeGreaterThan(0);
  });

  it('OPENAI_MODEL_CATALOG donne role et statut pour chaque modele liste', () => {
    expect(OPENAI_MODEL_CATALOG.length).toBeGreaterThan(0);
    for (const entry of OPENAI_MODEL_CATALOG) {
      expect(['text', 'live', 'stt', 'tts']).toContain(entry.role);
      expect(['stable', 'preview']).toContain(entry.status);
    }
  });

  it('OPENAI_CATALOG_VERIFIED_AT est une date ISO', () => {
    expect(OPENAI_CATALOG_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('les defauts correspondent aux defauts de construction actuels (sauf STT deprecie)', () => {
    expect(OPENAI_DEFAULT_CHAT_MODEL).toBe('gpt-4o');
    expect(OPENAI_DEFAULT_REALTIME_MODEL).toBe('gpt-realtime-1.5');
    expect(OPENAI_DEFAULT_REALTIME_VOICE).toBe('alloy');
    expect(OPENAI_DEFAULT_TTS_MODEL).toBe('tts-1');
    expect(OPENAI_DEFAULT_TTS_VOICE).toBe('nova');
    // whisper-1 est deprecie (FR-010) : le defaut change vers son remplacant documente.
    expect(OPENAI_DEFAULT_STT_MODEL).toBe('gpt-transcribe');
  });

  it('aucun defaut n\'est dans le catalogue deprecie', () => {
    const deprecatedIds = new Set(OPENAI_DEPRECATED_MODELS.map((m) => m.id));
    expect(deprecatedIds.has(OPENAI_DEFAULT_CHAT_MODEL)).toBe(false);
    expect(deprecatedIds.has(OPENAI_DEFAULT_REALTIME_MODEL)).toBe(false);
    expect(deprecatedIds.has(OPENAI_DEFAULT_TTS_MODEL)).toBe(false);
    expect(deprecatedIds.has(OPENAI_DEFAULT_STT_MODEL)).toBe(false);
  });
});

describe('catalogue OpenAI — voix (US2)', () => {
  it('OPENAI_VOICE_CATALOG contient les 13 voix TTS, dont 10 aussi Realtime', () => {
    expect(OPENAI_VOICE_CATALOG.length).toBe(13);
    expect(OPENAI_TTS_VOICES.length).toBe(13);
    expect(OPENAI_REALTIME_VOICES.length).toBe(10);
    const realtimeCount = OPENAI_VOICE_CATALOG.filter((v) => v.realtime).length;
    expect(realtimeCount).toBe(10);
  });

  it('chaque voix est multilingue et sans genre documente', () => {
    for (const voice of OPENAI_VOICE_CATALOG) {
      expect(voice.languages).toEqual(['multilingual']);
      expect(voice.gender).toBeUndefined();
    }
  });
});

describe('catalogue OpenAI — validation et depreciations (US3)', () => {
  it('isKnownOpenAIModel / isKnownOpenAIVoice distinguent connu / inconnu, sans jamais lever', () => {
    expect(isKnownOpenAIModel(OPENAI_DEFAULT_CHAT_MODEL)).toBe(true);
    expect(isKnownOpenAIModel('deepseek-chat')).toBe(false);
    expect(isKnownOpenAIVoice('nova')).toBe(true);
    expect(isKnownOpenAIVoice('not-a-voice')).toBe(false);
  });

  it('getOpenAIDeprecatedModel retourne les entrees du catalogue deprecie', () => {
    const entry = getOpenAIDeprecatedModel('whisper-1');
    expect(entry).toBeDefined();
    expect(entry?.status).toBe('deprecated');
    expect(entry?.replacement).toBe('gpt-transcribe');
    expect(getOpenAIDeprecatedModel(OPENAI_DEFAULT_CHAT_MODEL)).toBeUndefined();
  });
});

describe('OpenAI — avertissement de depreciation a la construction (US3)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('OpenAIAdapter avertit pour un modele deprecie et n\'avertit pas pour un id inconnu (style DeepSeek)', () => {
    new OpenAIAdapter({ apiKey: 'k', model: 'gpt-5-chat-latest' });
    expect(warnSpy.mock.calls.some((c) => c.join(' ').includes('gpt-5-chat-latest'))).toBe(true);
    warnSpy.mockClear();
    new OpenAIAdapter({ apiKey: 'k', model: 'deepseek-chat' });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('OpenAILiveAdapter avertit pour un modele deprecie', () => {
    new OpenAILiveAdapter({ apiKey: 'k', model: 'gpt-5-chat-latest' as any });
    expect(warnSpy.mock.calls.some((c) => c.join(' ').includes('gpt-5-chat-latest'))).toBe(true);
  });

  it('OpenAITTS avertit pour un modele deprecie', () => {
    new OpenAITTS({ apiKey: 'k', model: 'gpt-5-chat-latest' as any });
    expect(warnSpy.mock.calls.some((c) => c.join(' ').includes('gpt-5-chat-latest'))).toBe(true);
  });

  it('WhisperSTT avertit une fois pour whisper-1 (deprecie) et garde la valeur', () => {
    const stt = new WhisperSTT({ apiKey: 'k', model: 'whisper-1' });
    const messages = warnSpy.mock.calls.map((c) => c.join(' '));
    const match = messages.find((m) => m.includes('whisper-1'));
    expect(match).toBeDefined();
    expect(match).toContain('deprecated');
    expect(match).toContain('gpt-transcribe');
    expect((stt as any).model).toBe('whisper-1');
  });

  it('WhisperSTT n\'avertit pas pour le nouveau defaut', () => {
    new WhisperSTT({ apiKey: 'k' });
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('getCapabilities() construites depuis le catalogue (US4)', () => {
  it('OpenAIAdapter.getCapabilities() ne contient que des modeles catalogues', () => {
    const adapter = new OpenAIAdapter({ apiKey: 'k' });
    const caps = adapter.getCapabilities();
    const textIds = new Set(OPENAI_MODEL_CATALOG.filter((m) => m.role === 'text').map((m) => m.id));
    for (const model of caps.models) {
      expect(textIds.has(model.id)).toBe(true);
    }
  });

  it('OpenAILiveAdapter.getCapabilities() ne contient que des modeles/voix catalogues', () => {
    const live = new OpenAILiveAdapter({ apiKey: 'k' });
    const caps = live.getCapabilities();
    const liveIds = new Set(OPENAI_MODEL_CATALOG.filter((m) => m.role === 'live').map((m) => m.id));
    for (const model of caps.models) {
      expect(liveIds.has(model.id)).toBe(true);
    }
    const voiceIds = new Set(OPENAI_VOICE_CATALOG.map((v) => v.id));
    for (const voice of caps.voices ?? []) {
      expect(voiceIds.has(voice.id)).toBe(true);
    }
  });

  it('OpenAITTS.getCapabilities() ne contient que des voix catalogues', () => {
    const tts = new OpenAITTS({ apiKey: 'k' });
    const caps = tts.getCapabilities();
    const voiceIds = new Set(OPENAI_VOICE_CATALOG.map((v) => v.id));
    for (const voice of caps.voices ?? []) {
      expect(voiceIds.has(voice.id)).toBe(true);
    }
  });
});
