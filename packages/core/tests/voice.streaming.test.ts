import { describe, it, expect } from 'vitest';
import { isStreamingSTTService, isStreamingTTSService } from '../src/index.js';
import type {
  LiveAdapter,
  LiveSession,
  LiveSessionConfig,
  STTAudioConfig,
  STTResult,
  STTService,
  StreamingSTTService,
  StreamingTTSService,
  TTSConfig,
  TTSResult,
  TTSService,
} from '../src/index.js';

// ------------------------------------------------------------
// (a) Verification de compilation : les contrats existants ne changent pas.
// Ces objets ne compilent que si STTService/TTSService/LiveAdapter et
// LiveSessionConfig restent satisfaisables tels quels (recherche R5).
// ------------------------------------------------------------

const existingSTTService: STTService = {
  name: 'legacy-stt',
  async transcribe(config: STTAudioConfig): Promise<STTResult> {
    return { text: `heard: ${config.mimeType}` };
  },
};

const existingTTSService: TTSService = {
  name: 'legacy-tts',
  async synthesize(config: TTSConfig): Promise<TTSResult> {
    return { audioBase64: '', mimeType: 'audio/mpeg', characterCount: config.text.length };
  },
};

const existingLiveAdapter: LiveAdapter = {
  name: 'legacy-live',
  async createSession(_config: LiveSessionConfig): Promise<LiveSession> {
    const session: LiveSession = {
      async sendAudio() {},
      async sendText() {},
      async sendToolResponse() {},
      close() {},
      isActive: true,
    };
    return session;
  },
};

// Un LiveSessionConfig sans les deux nouveaux champs optionnels type-check toujours.
const liveSessionConfigWithoutNewFields: LiveSessionConfig = {
  systemPrompt: 'Tu es un assistant vocal.',
  tools: [],
};

describe('compatibilite ascendante (contrats existants inchanges)', () => {
  it('un STTService existant (sans openTurnStream) reste valide', async () => {
    const result = await existingSTTService.transcribe({ mimeType: 'audio/pcm;rate=16000', audioBase64: 'AAAA' });
    expect(result.text).toBe('heard: audio/pcm;rate=16000');
  });

  it('un TTSService existant (sans openSpeechStream) reste valide', async () => {
    const result = await existingTTSService.synthesize({ text: 'bonjour' });
    expect(result.characterCount).toBe('bonjour'.length);
  });

  it('un LiveAdapter existant reste valide', async () => {
    const session = await existingLiveAdapter.createSession(liveSessionConfigWithoutNewFields);
    expect(session.isActive).toBe(true);
  });

  it('LiveSessionConfig omettant conversationHistory/onToolCallCancelled type-check toujours', () => {
    expect(liveSessionConfigWithoutNewFields.conversationHistory).toBeUndefined();
    expect(liveSessionConfigWithoutNewFields.onToolCallCancelled).toBeUndefined();
  });

  it('LiveSessionConfig accepte les deux nouveaux champs optionnels quand fournis', () => {
    const onToolCallCancelled = (_callIds: string[]) => {};
    const configWithNewFields: LiveSessionConfig = {
      systemPrompt: 'Tu es un assistant vocal.',
      tools: [],
      conversationHistory: [{ role: 'user', content: 'salut' }],
      onToolCallCancelled,
    };
    expect(configWithNewFields.conversationHistory).toHaveLength(1);
    expect(configWithNewFields.onToolCallCancelled).toBe(onToolCallCancelled);
  });
});

// ------------------------------------------------------------
// (b) Comportement runtime des gardes de type.
// ------------------------------------------------------------

const workingStreamingSTT: StreamingSTTService = {
  name: 'streaming-stt',
  async openTurnStream(options) {
    options.onEvent({ type: 'turn.started', turnIndex: 0 });
    return {
      state: 'ready',
      sendAudio() {},
      async endAudioTurn() {},
      async close() {},
    };
  },
};

const workingStreamingTTS: StreamingTTSService = {
  name: 'streaming-tts',
  async openSpeechStream(options) {
    options.onAudio('AAAA', 'audio/pcm;rate=24000');
    return {
      state: 'ready',
      appendText() {},
      async flush() {},
      async interrupt() {},
      async close() {},
    };
  },
};

describe('isStreamingSTTService', () => {
  it('reconnait un objet exposant openTurnStream comme fonction', () => {
    expect(isStreamingSTTService(workingStreamingSTT)).toBe(true);
  });

  it('reconnait un objet minimal exposant seulement openTurnStream comme fonction', () => {
    expect(isStreamingSTTService({ openTurnStream: () => {} })).toBe(true);
  });

  it('rejette un STTService batch classique (pas de openTurnStream)', () => {
    expect(isStreamingSTTService(existingSTTService)).toBe(false);
  });

  it('rejette null', () => {
    expect(isStreamingSTTService(null)).toBe(false);
  });

  it('rejette undefined', () => {
    expect(isStreamingSTTService(undefined)).toBe(false);
  });

  it.each([42, 'openTurnStream', true, Symbol('x')])('rejette une primitive (%s)', (primitive) => {
    expect(isStreamingSTTService(primitive)).toBe(false);
  });

  it('rejette un objet dont openTurnStream n est pas une fonction', () => {
    expect(isStreamingSTTService({ name: 'fake', openTurnStream: 'not-a-function' })).toBe(false);
  });

  it('rejette un objet sans openTurnStream du tout', () => {
    expect(isStreamingSTTService({ name: 'fake' })).toBe(false);
  });
});

describe('isStreamingTTSService', () => {
  it('reconnait un objet exposant openSpeechStream comme fonction', () => {
    expect(isStreamingTTSService(workingStreamingTTS)).toBe(true);
  });

  it('reconnait un objet minimal exposant seulement openSpeechStream comme fonction', () => {
    expect(isStreamingTTSService({ openSpeechStream: () => {} })).toBe(true);
  });

  it('rejette un TTSService batch classique (pas de openSpeechStream)', () => {
    expect(isStreamingTTSService(existingTTSService)).toBe(false);
  });

  it('rejette null', () => {
    expect(isStreamingTTSService(null)).toBe(false);
  });

  it('rejette undefined', () => {
    expect(isStreamingTTSService(undefined)).toBe(false);
  });

  it.each([42, 'openSpeechStream', true, Symbol('x')])('rejette une primitive (%s)', (primitive) => {
    expect(isStreamingTTSService(primitive)).toBe(false);
  });

  it('rejette un objet dont openSpeechStream n est pas une fonction', () => {
    expect(isStreamingTTSService({ name: 'fake', openSpeechStream: 'not-a-function' })).toBe(false);
  });

  it('rejette un objet sans openSpeechStream du tout', () => {
    expect(isStreamingTTSService({ name: 'fake' })).toBe(false);
  });
});

// ------------------------------------------------------------
// (c) Les nouveaux types/valeurs sont bien exportes depuis la racine du
// package (`@owllayer/core` -> src/index.ts -> voice/index.ts).
// ------------------------------------------------------------

describe('export depuis la racine du package', () => {
  it('isStreamingSTTService et isStreamingTTSService sont importables depuis src/index.ts', () => {
    expect(typeof isStreamingSTTService).toBe('function');
    expect(typeof isStreamingTTSService).toBe('function');
  });
});
