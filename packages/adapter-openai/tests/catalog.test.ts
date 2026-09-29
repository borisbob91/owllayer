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

describe('catalogue OpenAI — modeles deprecies sur la page officielle (audit)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('les modeles marques deprecies sortent du catalogue actif et vont au catalogue deprecie', () => {
    const activeIds = new Set(OPENAI_MODEL_CATALOG.map((m) => m.id));
    for (const id of ['gpt-5', 'gpt-5.1', 'gpt-5.2', 'o3', 'o4-mini', 'gpt-4.1-nano', 'gpt-realtime', 'gpt-realtime-mini']) {
      expect(activeIds.has(id)).toBe(false);
      expect(getOpenAIDeprecatedModel(id)).toBeDefined();
    }
    expect(getOpenAIDeprecatedModel('o4-mini')).toMatchObject({ shutdownDate: '2026-10-23', replacement: 'gpt-5.6-terra' });
    expect(getOpenAIDeprecatedModel('gpt-realtime')).toMatchObject({ role: 'live', replacement: 'gpt-realtime-2.1' });
  });

  it('les modeles actuels sont listes, y compris les remplacants documentes', () => {
    for (const id of ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-4o', 'gpt-4.1']) {
      expect(isKnownOpenAIModel(id, 'text')).toBe(true);
    }
    expect(isKnownOpenAIModel('gpt-live-1', 'live')).toBe(true);
    expect(isKnownOpenAIModel('gpt-realtime-whisper', 'stt')).toBe(true);
    for (const entry of OPENAI_DEPRECATED_MODELS) {
      if (entry.replacement) expect(isKnownOpenAIModel(entry.replacement)).toBe(true);
    }
  });

  it('OpenAIAdapter avertit pour o4-mini avec la date et le remplacant', () => {
    new OpenAIAdapter({ apiKey: 'k', model: 'o4-mini' });
    const message = warnSpy.mock.calls.map((c) => c.join(' ')).find((m) => m.includes('o4-mini'));
    expect(message).toContain('2026-10-23');
    expect(message).toContain('gpt-5.6-terra');
  });

  it('OpenAILiveAdapter avertit aussi pour un modele de transcription deprecie', () => {
    new OpenAILiveAdapter({ apiKey: 'k', inputTranscriptionModel: 'whisper-1' });
    expect(warnSpy.mock.calls.some((c) => c.join(' ').includes('whisper-1'))).toBe(true);
  });

  it('isKnownOpenAIVoice(id, "live") ne retient que les voix Realtime', () => {
    expect(isKnownOpenAIVoice('onyx')).toBe(true);
    expect(isKnownOpenAIVoice('onyx', 'live')).toBe(false);
    expect(isKnownOpenAIVoice('marin', 'live')).toBe(true);
  });
});
