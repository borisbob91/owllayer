import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SpeechServiceError } from '@owllayer/core';
import type {
  ChatMessage,
  LLMAdapter,
  LLMResponse,
  LLMToolCall,
  LiveSessionConfig,
  SpeechStreamState,
  STTTurnEvent,
  STTTurnStream,
  STTTurnStreamOptions,
  StreamingSTTService,
  StreamingTTSService,
  TTSSpeechStream,
  TTSSpeechStreamOptions,
} from '@owllayer/core';
import { StreamingPipelineLiveAdapter } from '../src/voice/StreamingPipelineLiveAdapter.js';

// ------------------------------------------------------------------
// Fakes provider-neutres (aucun package Deepgram importe — R14 de research.md)
// ------------------------------------------------------------------

class FakeSTTStream implements STTTurnStream {
  state: SpeechStreamState = 'ready';
  sentAudio: string[] = [];
  endCalls = 0;
  closeCalls = 0;

  constructor(private readonly onEvent: (event: STTTurnEvent) => void) {}

  sendAudio(audioBase64: string): void {
    this.sentAudio.push(audioBase64);
  }

  async endAudioTurn(): Promise<void> {
    this.endCalls += 1;
  }

  async close(): Promise<void> {
    this.closeCalls += 1;
    this.state = 'closed';
  }

  /** Simule un evenement provider ; met a jour l'etat comme le ferait un vrai flux. */
  emit(event: STTTurnEvent): void {
    if (event.type === 'stream.closed') {
      this.state = 'closed';
    }
    this.onEvent(event);
  }
}

class FakeSTTService implements StreamingSTTService {
  readonly name = 'fake-stt';
  readonly streams: FakeSTTStream[] = [];

  async openTurnStream(options: STTTurnStreamOptions): Promise<STTTurnStream> {
    const stream = new FakeSTTStream(options.onEvent);
    this.streams.push(stream);
    return stream;
  }
}

/**
 * Flux TTS pilotable : `flush()` emet un chunk audio immediat puis un par tranche de
 * `chunkIntervalMs`, jusqu'a `totalChunks` ou jusqu'a `interrupt()`. `interrupt()` annule
 * les chunks programmes et n'en emet plus qu'un seul, "deja en vol", apres `interruptDelayMs`.
 */
class FakeTTSStream implements TTSSpeechStream {
  state: SpeechStreamState = 'ready';
  interruptCalls = 0;
  closeCalls = 0;
  appended: string[] = [];
  private timer?: ReturnType<typeof setTimeout>;
  private flushResolve?: () => void;
  private pendingFlush = false;

  constructor(
    private readonly opts: TTSSpeechStreamOptions,
    private readonly totalChunks = 5,
    private readonly chunkIntervalMs = 100,
    private readonly interruptDelayMs = 200,
    private readonly failFlush = false
  ) {}

  appendText(text: string): void {
    this.appended.push(text);
  }

  flush(): Promise<void> {
    if (this.failFlush) {
      return Promise.reject(new Error('tts synthesis failed'));
    }
    this.pendingFlush = true;
    return new Promise((resolve) => {
      this.flushResolve = () => {
        this.pendingFlush = false;
        resolve();
      };
      let count = 0;
      const tick = () => {
        count += 1;
        this.opts.onAudio(`chunk-${count}`, 'audio/pcm;rate=24000');
        if (count >= this.totalChunks) {
          this.flushResolve!();
          return;
        }
        this.timer = setTimeout(tick, this.chunkIntervalMs);
      };
      tick();
    });
  }

  interrupt(): Promise<void> {
    this.interruptCalls += 1;
    if (this.timer) clearTimeout(this.timer);
    // Un chunk "deja en vol" n'existe que si une synthese etait effectivement en cours.
    const hadAudioInFlight = this.pendingFlush;
    return new Promise((resolve) => {
      setTimeout(() => {
        if (hadAudioInFlight) {
          this.opts.onAudio('final-in-flight-chunk', 'audio/pcm;rate=24000');
        }
        this.flushResolve?.();
        resolve();
      }, this.interruptDelayMs);
    });
  }

  async close(): Promise<void> {
    this.closeCalls += 1;
    this.state = 'closed';
  }
}

class FakeTTSService implements StreamingTTSService {
  readonly name = 'fake-tts';
  readonly streams: FakeTTSStream[] = [];
  constructor(private readonly streamOptions: Partial<{
    totalChunks: number;
    chunkIntervalMs: number;
    interruptDelayMs: number;
    failFlush: boolean;
  }> = {}) {}

  async openSpeechStream(options: TTSSpeechStreamOptions): Promise<TTSSpeechStream> {
    const stream = new FakeTTSStream(
      options,
      this.streamOptions.totalChunks,
      this.streamOptions.chunkIntervalMs,
      this.streamOptions.interruptDelayMs,
      this.streamOptions.failFlush
    );
    this.streams.push(stream);
    return stream;
  }
}

function createFakeLLM(
  chatImpl: (messages: ChatMessage[]) => Promise<LLMResponse> | LLMResponse,
  handleToolResultImpl?: (callId: string, result: unknown) => Promise<LLMResponse> | LLMResponse
): LLMAdapter {
  return {
    name: 'fake-llm',
    chat: vi.fn(async (request) => chatImpl(request.messages)),
    handleToolResult: vi.fn(async (callId, result) =>
      handleToolResultImpl ? handleToolResultImpl(callId, result) : { text: 'follow-up' }
    ),
  };
}

function createConfig(overrides: Partial<LiveSessionConfig> = {}): {
  config: LiveSessionConfig;
  onAudioOutput: ReturnType<typeof vi.fn>;
  onTextOutput: ReturnType<typeof vi.fn>;
  onToolCall: ReturnType<typeof vi.fn>;
  onTranscript: ReturnType<typeof vi.fn>;
  onError: ReturnType<typeof vi.fn>;
  onInterrupted: ReturnType<typeof vi.fn>;
  onToolCallCancelled: ReturnType<typeof vi.fn>;
} {
  const onAudioOutput = vi.fn();
  const onTextOutput = vi.fn();
  const onToolCall = vi.fn();
  const onTranscript = vi.fn();
  const onError = vi.fn();
  const onInterrupted = vi.fn();
  const onToolCallCancelled = vi.fn();
  const config: LiveSessionConfig = {
    systemPrompt: 'You are a test agent.',
    tools: [],
    onAudioOutput,
    onTextOutput,
    onToolCall,
    onTranscript,
    onError,
    onInterrupted,
    onToolCallCancelled,
    ...overrides,
  };
  return { config, onAudioOutput, onTextOutput, onToolCall, onTranscript, onError, onInterrupted, onToolCallCancelled };
}

async function flushMicrotasks(times = 5): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('StreamingPipelineLiveAdapter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes a name combining stt, llm and tts provider names', () => {
    const adapter = new StreamingPipelineLiveAdapter({
      stt: new FakeSTTService(),
      llm: createFakeLLM(() => ({ text: 'ok' })),
      tts: new FakeTTSService(),
    });
    expect(adapter.name).toBe('pipeline(fake-stt+fake-llm+fake-tts)');
  });

  it('handles a simple turn: transcript, LLM text, and TTS audio', async () => {
    const stt = new FakeSTTService();
    const tts = new FakeTTSService({ totalChunks: 1 });
    const llm = createFakeLLM(() => ({ text: 'Hello there' }));
    const adapter = new StreamingPipelineLiveAdapter({ stt, llm, tts });
    const { config, onAudioOutput, onTextOutput, onTranscript } = createConfig();

    const session = await adapter.createSession(config);
    const sttStream = stt.streams[0]!;

    sttStream.emit({ type: 'turn.started', turnIndex: 0 });
    sttStream.emit({ type: 'turn.ended', turnIndex: 0, text: 'hi there' });
    await flushMicrotasks();

    expect(onTranscript).toHaveBeenCalledWith('user', 'hi there');
    expect(onTextOutput).toHaveBeenCalledWith('Hello there', true);
    expect(onTextOutput).toHaveBeenCalledTimes(1);
    expect(onAudioOutput).toHaveBeenCalledWith('chunk-1', 'audio/pcm;rate=24000');
    expect(llm.chat).toHaveBeenCalledTimes(1);

    session.close();
  });

  it('forces the end of the current turn via STTTurnStream.endAudioTurn', async () => {
    const stt = new FakeSTTService();
    const tts = new FakeTTSService();
    const llm = createFakeLLM(() => ({ text: 'ok' }));
    const adapter = new StreamingPipelineLiveAdapter({ stt, llm, tts });
    const { config } = createConfig();

    const session = await adapter.createSession(config);
    const sttStream = stt.streams[0]!;

    expect(sttStream.endCalls).toBe(0);
    await session.endAudioTurn!();
    expect(sttStream.endCalls).toBe(1);

    session.close();
  });

  it('barge-in during the LLM call: no text, tool call, or audio is ever emitted for that turn', async () => {
    const stt = new FakeSTTService();
    const tts = new FakeTTSService();
    let resolveChat: (response: LLMResponse) => void = () => {};
    const llm = createFakeLLM(
      () =>
        new Promise<LLMResponse>((resolve) => {
          resolveChat = resolve;
        })
    );
    const adapter = new StreamingPipelineLiveAdapter({ stt, llm, tts });
    const { config, onAudioOutput, onTextOutput, onToolCall, onInterrupted } = createConfig();

    const session = await adapter.createSession(config);
    const sttStream = stt.streams[0]!;
    const ttsStream = tts.streams[0]!;

    sttStream.emit({ type: 'turn.started', turnIndex: 0 });
    sttStream.emit({ type: 'turn.ended', turnIndex: 0, text: 'book a flight' });
    await flushMicrotasks();

    // Le LLM n'a pas encore repondu : on interrompt maintenant.
    await session.interrupt!();
    expect(ttsStream.interruptCalls).toBe(1);
    expect(onInterrupted).toHaveBeenCalledTimes(1);

    // Le LLM finit par repondre — trop tard, le tour est deja interrompu.
    resolveChat({ text: 'here is your flight', toolCalls: [{ callId: 'c1', name: 'book', args: {} }] });
    await flushMicrotasks();

    expect(onTextOutput).not.toHaveBeenCalled();
    expect(onToolCall).not.toHaveBeenCalled();
    expect(onAudioOutput).not.toHaveBeenCalled();

    session.close();
  });

  it('barge-in during TTS: last audio arrives within 300ms of interrupt, then nothing more (S17)', async () => {
    vi.useFakeTimers();
    const stt = new FakeSTTService();
    const tts = new FakeTTSService({ totalChunks: 5, chunkIntervalMs: 100, interruptDelayMs: 200 });
    const llm = createFakeLLM(() => ({ text: 'a long spoken reply' }));
    const adapter = new StreamingPipelineLiveAdapter({ stt, llm, tts });

    const audioLog: { chunk: string; t: number }[] = [];
    const onAudioOutput = vi.fn((chunk: string) => {
      audioLog.push({ chunk, t: Date.now() });
    });
    const onInterrupted = vi.fn();
    const config: LiveSessionConfig = {
      systemPrompt: 'test',
      tools: [],
      onAudioOutput,
      onInterrupted,
    };

    const session = await adapter.createSession(config);
    const sttStream = stt.streams[0]!;
    const ttsStream = tts.streams[0]!;

    sttStream.emit({ type: 'turn.started', turnIndex: 0 });
    sttStream.emit({ type: 'turn.ended', turnIndex: 0, text: 'tell me a story' });
    await vi.advanceTimersByTimeAsync(0); // laisse le chat (immediat) resoudre et flush() emettre chunk-1

    // Laisser deux chunks supplementaires partir (t=100, t=200).
    await vi.advanceTimersByTimeAsync(250);
    expect(audioLog.map((a) => a.chunk)).toEqual(['chunk-1', 'chunk-2', 'chunk-3']);

    const interruptedAt = Date.now();
    const interruptPromise = session.interrupt!();

    // Le chunk-4, programme pour t=300, ne doit jamais arriver : interrupt() l'a annule.
    await vi.advanceTimersByTimeAsync(500);
    await interruptPromise;

    expect(ttsStream.interruptCalls).toBe(1);
    expect(onInterrupted).toHaveBeenCalledTimes(1);

    const lastChunk = audioLog[audioLog.length - 1]!;
    expect(lastChunk.chunk).toBe('final-in-flight-chunk');
    expect(lastChunk.t - interruptedAt).toBeLessThanOrEqual(300);
    expect(audioLog.some((a) => a.chunk === 'chunk-4')).toBe(false);
    expect(audioLog.some((a) => a.chunk === 'chunk-5')).toBe(false);

    // Bien plus tard : toujours aucun audio supplementaire.
    const countAfterInterrupt = audioLog.length;
    await vi.advanceTimersByTimeAsync(5000);
    expect(audioLog.length).toBe(countAfterInterrupt);

    session.close();
  });

  it('tentative end then resume: speculative text and tool calls are never emitted (S5)', async () => {
    const stt = new FakeSTTService();
    const tts = new FakeTTSService({ totalChunks: 1 });
    let call = 0;
    const llm = createFakeLLM((messages) => {
      call += 1;
      if (call === 1) {
        // Reponse speculative, retenue.
        return {
          text: 'discarded reply',
          toolCalls: [{ callId: 'held-1', name: 'held_tool', args: {} }],
        };
      }
      return { text: 'final reply' };
    });
    const adapter = new StreamingPipelineLiveAdapter({ stt, llm, tts, speculativeReplies: true });
    const { config, onTextOutput, onToolCall, onToolCallCancelled } = createConfig();

    const session = await adapter.createSession(config);
    const sttStream = stt.streams[0]!;

    sttStream.emit({ type: 'turn.started', turnIndex: 0 });
    sttStream.emit({ type: 'turn.tentative_end', turnIndex: 0, text: 'boo' });
    await flushMicrotasks();
    expect(llm.chat).toHaveBeenCalledTimes(1);

    sttStream.emit({ type: 'turn.resumed', turnIndex: 0 });
    await flushMicrotasks();

    expect(onToolCallCancelled).toHaveBeenCalledWith(['held-1']);
    expect(onTextOutput).not.toHaveBeenCalled();
    expect(onToolCall).not.toHaveBeenCalled();

    // Le tour continue avec un texte final different — nouvel appel LLM, reponse confirmee cette fois.
    sttStream.emit({ type: 'turn.ended', turnIndex: 0, text: 'final text' });
    await flushMicrotasks();

    expect(llm.chat).toHaveBeenCalledTimes(2);
    expect(onTextOutput).toHaveBeenCalledWith('final reply', true);
    expect(onTextOutput).not.toHaveBeenCalledWith('discarded reply', true);
    expect(onToolCall).not.toHaveBeenCalled();

    session.close();
  });

  it('speculative promotion: same text on turn.ended reuses the speculative response without a second LLM call', async () => {
    const stt = new FakeSTTService();
    const tts = new FakeTTSService({ totalChunks: 1 });
    const llm = createFakeLLM(() => ({ text: 'promoted reply' }));
    const adapter = new StreamingPipelineLiveAdapter({ stt, llm, tts, speculativeReplies: true });
    const { config, onTextOutput } = createConfig();

    const session = await adapter.createSession(config);
    const sttStream = stt.streams[0]!;

    sttStream.emit({ type: 'turn.started', turnIndex: 0 });
    sttStream.emit({ type: 'turn.tentative_end', turnIndex: 0, text: 'same text' });
    await flushMicrotasks();
    expect(llm.chat).toHaveBeenCalledTimes(1);

    sttStream.emit({ type: 'turn.ended', turnIndex: 0, text: 'same text' });
    await flushMicrotasks();

    // Promotion : pas de second appel LLM.
    expect(llm.chat).toHaveBeenCalledTimes(1);
    expect(onTextOutput).toHaveBeenCalledWith('promoted reply', true);

    session.close();
  });

  it('a low-risk tool result continues the same turn (no new turn.started)', async () => {
    const stt = new FakeSTTService();
    const tts = new FakeTTSService({ totalChunks: 1 });
    const toolCall: LLMToolCall = { callId: 'call-1', name: 'get_weather', args: { city: 'paris' } };
    const llm = createFakeLLM(
      () => ({ toolCalls: [toolCall] }),
      () => ({ text: 'It is sunny' })
    );
    const adapter = new StreamingPipelineLiveAdapter({ stt, llm, tts });
    const { config, onToolCall, onTextOutput } = createConfig();

    const session = await adapter.createSession(config);
    const sttStream = stt.streams[0]!;

    sttStream.emit({ type: 'turn.started', turnIndex: 0 });
    sttStream.emit({ type: 'turn.ended', turnIndex: 0, text: 'what is the weather' });
    await flushMicrotasks();

    expect(onToolCall).toHaveBeenCalledWith(toolCall);
    expect(onTextOutput).not.toHaveBeenCalled();

    await session.sendToolResponse('call-1', 'get_weather', { tempC: 20 });
    await flushMicrotasks();

    expect(llm.handleToolResult).toHaveBeenCalledWith('call-1', { tempC: 20 }, []);
    expect(onTextOutput).toHaveBeenCalledWith('It is sunny', true);

    session.close();
  });

  it('caps the number of chained tool calls per turn', async () => {
    let toolCallCounter = 0;
    const stt = new FakeSTTService();
    const tts = new FakeTTSService({ totalChunks: 1 });
    const llm: LLMAdapter = {
      name: 'fake-llm',
      chat: vi.fn(async () => {
        toolCallCounter += 1;
        return { toolCalls: [{ callId: `call-${toolCallCounter}`, name: 'loop_tool', args: {} }] };
      }),
      handleToolResult: vi.fn(async () => {
        toolCallCounter += 1;
        return { toolCalls: [{ callId: `call-${toolCallCounter}`, name: 'loop_tool', args: {} }] };
      }),
    };
    const adapter = new StreamingPipelineLiveAdapter({ stt, llm, tts, maxToolCallsPerTurn: 2 });
    const { config, onToolCall, onError } = createConfig();

    const session = await adapter.createSession(config);
    const sttStream = stt.streams[0]!;

    sttStream.emit({ type: 'turn.started', turnIndex: 0 });
    sttStream.emit({ type: 'turn.ended', turnIndex: 0, text: 'loop forever' });
    await flushMicrotasks();

    expect(onToolCall).toHaveBeenCalledTimes(1);
    await session.sendToolResponse('call-1', 'loop_tool', {});
    await flushMicrotasks();
    expect(onToolCall).toHaveBeenCalledTimes(2);

    await session.sendToolResponse('call-2', 'loop_tool', {});
    await flushMicrotasks();

    // Le plafond (2) est atteint : pas de 3e appel de tool, une erreur est signalee.
    expect(onToolCall).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0]![0] as Error).message).toMatch(/cap/i);

    session.close();
  });

  it('keeps the emitted text when TTS synthesis fails, and reports the error', async () => {
    const stt = new FakeSTTService();
    const tts = new FakeTTSService({ failFlush: true });
    const llm = createFakeLLM(() => ({ text: 'important answer' }));
    const adapter = new StreamingPipelineLiveAdapter({ stt, llm, tts });
    const { config, onTextOutput, onError, onAudioOutput } = createConfig();

    const session = await adapter.createSession(config);
    const sttStream = stt.streams[0]!;

    sttStream.emit({ type: 'turn.started', turnIndex: 0 });
    sttStream.emit({ type: 'turn.ended', turnIndex: 0, text: 'question' });
    await flushMicrotasks();

    expect(onTextOutput).toHaveBeenCalledWith('important answer', true);
    expect(onAudioOutput).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0]![0] as Error).message).toMatch(/tts synthesis failed/i);

    session.close();
  });

  it('seeds the LLM request with conversationHistory', async () => {
    const stt = new FakeSTTService();
    const tts = new FakeTTSService({ totalChunks: 1 });
    let capturedMessages: ChatMessage[] = [];
    const llm = createFakeLLM((messages) => {
      capturedMessages = messages;
      return { text: 'ok' };
    });
    const history: ChatMessage[] = [
      { role: 'user', content: 'earlier question' },
      { role: 'assistant', content: 'earlier answer' },
    ];
    const adapter = new StreamingPipelineLiveAdapter({ stt, llm, tts });
    const { config } = createConfig({ conversationHistory: history });

    const session = await adapter.createSession(config);
    const sttStream = stt.streams[0]!;

    sttStream.emit({ type: 'turn.started', turnIndex: 0 });
    sttStream.emit({ type: 'turn.ended', turnIndex: 0, text: 'new question' });
    await flushMicrotasks();

    expect(capturedMessages).toEqual([
      { role: 'user', content: 'earlier question' },
      { role: 'assistant', content: 'earlier answer' },
      { role: 'user', content: 'new question' },
    ]);

    session.close();
  });

  it('close releases both the STT and TTS streams', async () => {
    const stt = new FakeSTTService();
    const tts = new FakeTTSService();
    const llm = createFakeLLM(() => ({ text: 'ok' }));
    const adapter = new StreamingPipelineLiveAdapter({ stt, llm, tts });
    const { config } = createConfig();

    const session = await adapter.createSession(config);
    const sttStream = stt.streams[0]!;
    const ttsStream = tts.streams[0]!;

    expect(sttStream.closeCalls).toBe(0);
    expect(ttsStream.closeCalls).toBe(0);

    session.close();
    await flushMicrotasks();

    expect(sttStream.closeCalls).toBe(1);
    expect(ttsStream.closeCalls).toBe(1);
    expect(session.isActive).toBe(false);

    // Idempotent : un second close() ne relance pas de fermeture.
    session.close();
    await flushMicrotasks();
    expect(sttStream.closeCalls).toBe(1);
    expect(ttsStream.closeCalls).toBe(1);
  });

  it('ignores sendToolResponse for a stale or unknown call id', async () => {
    const stt = new FakeSTTService();
    const tts = new FakeTTSService({ totalChunks: 1 });
    const toolCall: LLMToolCall = { callId: 'call-1', name: 'noop_tool', args: {} };
    const llm = createFakeLLM(() => ({ toolCalls: [toolCall] }));
    const adapter = new StreamingPipelineLiveAdapter({ stt, llm, tts });
    const { config, onToolCall } = createConfig();

    const session = await adapter.createSession(config);
    const sttStream = stt.streams[0]!;

    sttStream.emit({ type: 'turn.started', turnIndex: 0 });
    sttStream.emit({ type: 'turn.ended', turnIndex: 0, text: 'do nothing' });
    await flushMicrotasks();
    expect(onToolCall).toHaveBeenCalledTimes(1);

    await session.sendToolResponse('unknown-call-id', 'noop_tool', {});
    await flushMicrotasks();

    expect(llm.handleToolResult).not.toHaveBeenCalled();

    session.close();
  });

  it('reopens exactly one STT stream after a remote close, and never sends audio to the closed stream', async () => {
    const stt = new FakeSTTService();
    const tts = new FakeTTSService();
    const llm = createFakeLLM(() => ({ text: 'ok' }));
    const adapter = new StreamingPipelineLiveAdapter({ stt, llm, tts });
    const { config, onError } = createConfig();

    const session = await adapter.createSession(config);
    const firstStream = stt.streams[0]!;
    expect(stt.streams).toHaveLength(1);

    // Le provider ferme la connexion pendant un silence (pas de keepalive, ex. Flux).
    firstStream.emit({
      type: 'stream.error',
      error: new SpeechServiceError('remote closed', 'fake-stt', 'REMOTE_CLOSED'),
      fatal: true,
    });
    firstStream.emit({ type: 'stream.closed', reason: 'remote' });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(firstStream.state).toBe('closed');

    await session.sendAudio('audio-after-close');

    expect(stt.streams).toHaveLength(2);
    const secondStream = stt.streams[1]!;
    expect(secondStream.sentAudio).toEqual(['audio-after-close']);
    expect(firstStream.sentAudio).toEqual([]);
    // La session live n'a jamais ete fermee par la coupure distante.
    expect(session.isActive).toBe(true);

    session.close();
  });
});
