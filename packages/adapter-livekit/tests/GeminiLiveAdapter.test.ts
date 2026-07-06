import type { ToolDeclaration } from '@domos/core';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_GEMINI_LIVE_MODEL,
  DEFAULT_GEMINI_LIVE_VOICE,
  GeminiLiveAdapter,
  LiveKitLiveSession,
  createDefaultLiveKitRuntimeHelpers,
  parsePCMMimeType,
  toLiveKitToolSchema,
  type GeminiLiveModelOptions,
  type LiveKitAudioFrame,
  type LiveKitGenerationCreatedEvent,
  type LiveKitLiveSessionConfig,
  type LiveKitReadableStream,
  type LiveKitRealtimeCapabilities,
  type LiveKitRealtimeModelClient,
  type LiveKitRealtimeSessionClient,
  type LiveKitRuntimeHelpers,
} from '../src/index.js';

const liveKitRuntimeMock = vi.hoisted(() => {
  function createChatContext(items: unknown[] = []) {
    return {
      items: [...items],
      addMessage: vi.fn(function addMessage(this: { items: unknown[] }, params: unknown) {
        this.items.push({ type: 'message', ...(params as object) });
      }),
      copy: vi.fn(function copy(this: { items: unknown[] }) {
        return createChatContext([...this.items]);
      }),
    };
  }

  const tool = vi.fn((config: unknown) => ({ type: 'function', config }));
  const ToolContext = vi.fn(function ToolContext(this: { tools: unknown[] }, tools: unknown[]) {
    this.tools = tools;
  });
  const FunctionCallOutput = {
    create: vi.fn((params: unknown) => ({ type: 'function_call_output', ...(params as object) })),
  };
  const ChatContext = {
    empty: vi.fn(() => createChatContext()),
  };
  const AudioFrame = vi.fn(function AudioFrame(
    this: LiveKitAudioFrame,
    data: Int16Array,
    sampleRate: number,
    channels: number,
    samplesPerChannel: number
  ) {
    this.data = data;
    this.sampleRate = sampleRate;
    this.channels = channels;
    this.samplesPerChannel = samplesPerChannel;
  });

  return {
    llm: { ChatContext, FunctionCallOutput, ToolContext, tool },
    AudioFrame,
  };
});

vi.mock('@livekit/agents', () => ({
  llm: liveKitRuntimeMock.llm,
}));

vi.mock('@livekit/rtc-node', () => ({
  AudioFrame: liveKitRuntimeMock.AudioFrame,
}));

class TestReadableStream<T> implements LiveKitReadableStream<T> {
  constructor(private readonly values: T[]) {}

  getReader() {
    let index = 0;
    return {
      read: async () => {
        if (index >= this.values.length) {
          return { done: true, value: undefined };
        }

        return { done: false, value: this.values[index++] };
      },
      releaseLock: vi.fn(),
    };
  }
}

class MockRealtimeSession implements LiveKitRealtimeSessionClient {
  chatCtx: TestChatContext = createTestChatContext();
  tools: unknown;
  readonly updateChatCtx = vi.fn(async (chatCtx: unknown) => {
    this.chatCtx = chatCtx as TestChatContext;
  });
  readonly updateTools = vi.fn(async (tools: unknown) => {
    this.tools = tools;
  });
  readonly pushAudio = vi.fn();
  readonly generateReply = vi.fn(async () => buildGeneration({ text: ['ok'] }));
  readonly commitAudio = vi.fn(async () => undefined);
  readonly interrupt = vi.fn(async () => undefined);
  readonly close = vi.fn(async () => undefined);
  private readonly listeners = new Map<string, Array<(...args: unknown[]) => void>>();

  constructor(readonly realtimeModel: LiveKitRealtimeModelClient) {}

  on(event: string, listener: (...args: unknown[]) => void): unknown {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }

  off(event: string, listener: (...args: unknown[]) => void): unknown {
    const listeners = this.listeners.get(event) ?? [];
    this.listeners.set(event, listeners.filter((candidate) => candidate !== listener));
  }

  emit(event: string, ...args: unknown[]): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(...args);
    }
  }
}

class MockRealtimeModel implements LiveKitRealtimeModelClient {
  sessionInstance: MockRealtimeSession;

  constructor(
    readonly capabilities: LiveKitRealtimeCapabilities = {
      audioOutput: true,
      midSessionChatCtxUpdate: true,
      midSessionToolsUpdate: false,
      userTranscription: true,
    },
    readonly model = DEFAULT_GEMINI_LIVE_MODEL
  ) {
    this.sessionInstance = new MockRealtimeSession(this);
  }

  session(): LiveKitRealtimeSessionClient {
    return this.sessionInstance;
  }
}

interface TestChatContext {
  items: unknown[];
  addMessage(params: { role: string; content: string }): void;
  copy(): TestChatContext;
}

function createTestChatContext(items: unknown[] = []): TestChatContext {
  return {
    items: [...items],
    addMessage(params) {
      this.items.push({ type: 'message', ...params });
    },
    copy() {
      return createTestChatContext([...this.items]);
    },
  };
}

function createTestRuntimeHelpers(): LiveKitRuntimeHelpers {
  return {
    createAudioFrame(data, sampleRate, channels, samplesPerChannel) {
      return { data, sampleRate, channels, samplesPerChannel };
    },
    createChatContext() {
      return createTestChatContext();
    },
    copyChatContext(chatCtx) {
      return (chatCtx as TestChatContext).copy();
    },
    appendUserMessage(chatCtx, text) {
      (chatCtx as TestChatContext).addMessage({ role: 'user', content: text });
    },
    appendFunctionCallOutput(chatCtx, params) {
      (chatCtx as TestChatContext).items.push({
        type: 'function_call_output',
        ...params,
      });
    },
    createToolContext(tools) {
      return tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: toLiveKitToolSchema(tool.parameters),
      }));
    },
  };
}

function buildAdapter(options: {
  model?: MockRealtimeModel;
  modelFactory?: ReturnType<typeof vi.fn>;
} = {}) {
  const model = options.model ?? new MockRealtimeModel();
  const modelFactory = options.modelFactory ?? vi.fn(async () => model);
  const adapter = new GeminiLiveAdapter({
    apiKey: 'google-key',
    env: {},
    modelFactory,
    runtimeHelpersFactory: () => createTestRuntimeHelpers(),
  });

  return { adapter, model, modelFactory };
}

function buildConfig(
  overrides: Partial<LiveKitLiveSessionConfig> = {}
): LiveKitLiveSessionConfig {
  return {
    systemPrompt: 'Tu es DomOS.',
    tools: [buildTool()],
    onAudioOutput: vi.fn(),
    onTextOutput: vi.fn(),
    onToolCall: vi.fn(),
    onTranscript: vi.fn(),
    onError: vi.fn(),
    onClose: vi.fn(),
    onInterrupted: vi.fn(),
    onWaitingForInput: vi.fn(),
    ...overrides,
  };
}

function buildTool(): ToolDeclaration {
  return {
    name: 'cart.add',
    description: 'Add an item to cart',
    risk: 'low',
    parameters: {
      type: 'OBJECT',
      required: ['sku'],
      properties: {
        sku: { type: 'STRING', description: 'Product SKU' },
        quantity: { type: 'NUMBER' },
        options: {
          type: 'OBJECT',
          properties: {
            gift: { type: 'BOOLEAN' },
          },
        },
      },
    },
  };
}

function buildGeneration(options: {
  text?: string[];
  audio?: LiveKitAudioFrame[];
  functions?: Array<{ callId: string; name: string; args?: string | Record<string, unknown> }>;
}): LiveKitGenerationCreatedEvent {
  return {
    responseId: `response-${Math.random()}`,
    userInitiated: true,
    messageStream: new TestReadableStream([
      {
        messageId: 'message-1',
        textStream: new TestReadableStream(options.text ?? []),
        audioStream: new TestReadableStream(options.audio ?? []),
      },
    ]),
    functionStream: new TestReadableStream(options.functions ?? []),
  };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('GeminiLiveAdapter', () => {
  it('constructs the default LiveKit runtime helper boundary through dynamic imports', async () => {
    const helpers = await createDefaultLiveKitRuntimeHelpers();
    const frameData = new Int16Array([1, 2]);

    const frame = helpers.createAudioFrame(frameData, 16000, 1, 2);
    const chatCtx = helpers.createChatContext();
    helpers.appendUserMessage(chatCtx, 'Bonjour');
    const copiedCtx = helpers.copyChatContext(chatCtx);
    helpers.appendFunctionCallOutput(copiedCtx, {
      callId: 'call-1',
      name: 'cart.add',
      output: '{"ok":true}',
      isError: false,
    });
    const toolContext = helpers.createToolContext([buildTool()]);

    expect(liveKitRuntimeMock.AudioFrame).toHaveBeenCalledWith(frameData, 16000, 1, 2);
    expect(frame).toMatchObject({
      data: frameData,
      sampleRate: 16000,
      channels: 1,
      samplesPerChannel: 2,
    });
    expect(liveKitRuntimeMock.llm.ChatContext.empty).toHaveBeenCalled();
    expect(liveKitRuntimeMock.llm.FunctionCallOutput.create).toHaveBeenCalledWith({
      callId: 'call-1',
      name: 'cart.add',
      output: '{"ok":true}',
      isError: false,
    });
    expect(liveKitRuntimeMock.llm.tool).toHaveBeenCalledWith(expect.objectContaining({
      name: 'cart.add',
      parameters: expect.objectContaining({ type: 'object' }),
      execute: expect.any(Function),
    }));
    expect(liveKitRuntimeMock.llm.ToolContext).toHaveBeenCalled();
    expect(toolContext).toMatchObject({
      tools: [
        expect.objectContaining({ type: 'function' }),
      ],
    });
  });

  it('creates a LiveKit Gemini realtime session without executing DomOS tools', async () => {
    const { adapter, model, modelFactory } = buildAdapter();
    const config = buildConfig({ voice: 'Kore', language: 'fr-FR' });

    const session = await adapter.createSession(config);

    expect(session).toBeInstanceOf(LiveKitLiveSession);
    expect(modelFactory).toHaveBeenCalledWith({
      instructions: 'Tu es DomOS.',
      model: DEFAULT_GEMINI_LIVE_MODEL,
      apiKey: 'google-key',
      voice: 'Kore',
      language: 'fr-FR',
      vertexai: false,
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    } satisfies GeminiLiveModelOptions);
    expect(model.sessionInstance.updateTools).toHaveBeenCalledWith([
      {
        name: 'cart.add',
        description: 'Add an item to cart',
        parameters: {
          type: 'object',
          required: ['sku'],
          properties: {
            sku: { type: 'string', description: 'Product SKU' },
            quantity: { type: 'number' },
            options: {
              type: 'object',
              properties: {
                gift: { type: 'boolean' },
              },
            },
          },
        },
      },
    ]);
  });

  it('maps DomOS PCM input to LiveKit AudioFrame input', async () => {
    const { adapter, model } = buildAdapter();
    const session = await adapter.createSession(buildConfig());
    const samples = new Int16Array([1, 2, 3, 4]);

    await session.sendAudio(Buffer.from(samples.buffer).toString('base64'), 'audio/pcm;rate=16000');

    expect(model.sessionInstance.pushAudio).toHaveBeenCalledWith({
      data: samples,
      sampleRate: 16000,
      channels: 1,
      samplesPerChannel: 4,
    });
  });

  it('maps LiveKit generation streams to DomOS callbacks', async () => {
    const { adapter, model } = buildAdapter();
    const config = buildConfig();
    await adapter.createSession(config);
    const frame = {
      data: new Int16Array([10, 20]),
      sampleRate: 24000,
      channels: 1,
      samplesPerChannel: 2,
    };

    model.sessionInstance.emit('generation_created', buildGeneration({
      text: ['Bonjour'],
      audio: [frame],
      functions: [
        { callId: 'call-1', name: 'cart.add', args: '{"sku":"sku-1"}' },
      ],
    }));
    await flushPromises();

    expect(config.onTextOutput).toHaveBeenCalledWith('Bonjour', false);
    expect(config.onTextOutput).toHaveBeenCalledWith('', true);
    expect(config.onTranscript).toHaveBeenCalledWith('agent', 'Bonjour');
    expect(config.onAudioOutput).toHaveBeenCalledWith(
      Buffer.from(frame.data.buffer).toString('base64'),
      'audio/pcm;rate=24000'
    );
    expect(config.onToolCall).toHaveBeenCalledWith({
      callId: 'call-1',
      name: 'cart.add',
      args: { sku: 'sku-1' },
    });
  });

  it('maps provider transcription and error events to DomOS callbacks with redacted secrets', async () => {
    const { adapter, model } = buildAdapter();
    const config = buildConfig();
    await adapter.createSession(config);

    model.sessionInstance.emit('input_audio_transcription_completed', {
      transcript: 'ouvre le panier',
    });
    model.sessionInstance.emit('error', {
      error: new Error('failed with google-key and Bearer token-value'),
    });

    expect(config.onTranscript).toHaveBeenCalledWith('user', 'ouvre le panier');
    expect(config.onError).toHaveBeenCalled();
    const error = vi.mocked(config.onError).mock.calls[0]?.[0];
    expect(error?.message).toContain('[redacted]');
    expect(error?.message).not.toContain('google-key');
    expect(error?.message).not.toContain('token-value');
    expect((error as Error & { cause?: unknown })?.cause).toBeUndefined();
  });

  it('sends text and tool responses through LiveKit ChatContext updates and resumes generation', async () => {
    const { adapter, model } = buildAdapter();
    const session = await adapter.createSession(buildConfig());
    model.sessionInstance.updateChatCtx.mockClear();

    await session.sendText('  Bonjour  ');
    await session.sendToolResponse('call-1', 'cart.add', { ok: true });

    const textCtx = model.sessionInstance.updateChatCtx.mock.calls[0]?.[0] as TestChatContext;
    const toolCtx = model.sessionInstance.updateChatCtx.mock.calls[1]?.[0] as TestChatContext;
    expect(textCtx.items).toContainEqual({
      type: 'message',
      role: 'user',
      content: 'Bonjour',
    });
    expect(model.sessionInstance.generateReply).toHaveBeenCalled();
    expect(toolCtx.items).toContainEqual({
      type: 'function_call_output',
      callId: 'call-1',
      name: 'cart.add',
      output: '{"ok":true}',
      isError: false,
    });
    expect(model.sessionInstance.generateReply).toHaveBeenCalledTimes(2);
  });

  it('records Gemini Live mid-session tool update limitation instead of pretending success', async () => {
    const { adapter, model } = buildAdapter();
    const onToolsUpdateStatus = vi.fn();
    const session = await adapter.createSession(buildConfig({ onToolsUpdateStatus }));
    model.sessionInstance.updateTools.mockClear();

    session.updateTools?.([]);

    expect(model.sessionInstance.updateTools).not.toHaveBeenCalled();
    expect(onToolsUpdateStatus).toHaveBeenCalledWith({
      status: 'deferred_until_next_session',
      toolCount: 0,
      reason: 'Provider does not support mid-session tool list updates.',
    });
    expect(session.lastToolsUpdateStatus).toBe('deferred_until_next_session');
  });

  it('closes the provider session and emits DomOS close callback', async () => {
    const { adapter, model } = buildAdapter();
    const config = buildConfig();
    const session = await adapter.createSession(config);

    session.close();
    await flushPromises();

    expect(model.sessionInstance.close).toHaveBeenCalled();
    expect(config.onClose).toHaveBeenCalled();
    expect(session.isActive).toBe(false);
  });

  it('applies tool updates when the realtime model declares mid-session support', async () => {
    const liveKitModel = new MockRealtimeModel({
      audioOutput: true,
      midSessionChatCtxUpdate: true,
      midSessionToolsUpdate: true,
    });
    const { adapter, model } = buildAdapter({ model: liveKitModel });
    const onToolsUpdateStatus = vi.fn();
    const session = await adapter.createSession(buildConfig({ onToolsUpdateStatus }));
    model.sessionInstance.updateTools.mockClear();

    session.updateTools?.([]);
    await flushPromises();

    expect(model.sessionInstance.updateTools).toHaveBeenCalledWith([]);
    expect(onToolsUpdateStatus).toHaveBeenCalledWith({
      status: 'applied',
      toolCount: 0,
    });
    expect(session.lastToolsUpdateStatus).toBe('applied');
  });

  it('rejects text input when the realtime model cannot update chat context mid-session', async () => {
    const liveKitModel = new MockRealtimeModel({
      audioOutput: true,
      midSessionChatCtxUpdate: false,
      midSessionToolsUpdate: false,
    });
    const { adapter } = buildAdapter({ model: liveKitModel });
    const config = buildConfig();
    const session = await adapter.createSession(config);

    await expect(session.sendText('Bonjour')).rejects.toThrow(
      'cannot receive text chat updates'
    );
    expect(config.onError).toHaveBeenCalled();
  });

  it('exposes Gemini Live capabilities and validates PCM MIME input', () => {
    const adapter = new GeminiLiveAdapter({
      apiKey: 'google-key',
      env: {},
      voice: 'Aoede',
    });

    expect(adapter.getCapabilities()).toMatchObject({
      provider: 'livekit-gemini',
      providerName: 'LiveKit Gemini Live',
      currentModel: DEFAULT_GEMINI_LIVE_MODEL,
      currentVoice: 'Aoede',
    });
    expect(adapter.getCapabilities().voices?.some((voice) => voice.id === DEFAULT_GEMINI_LIVE_VOICE))
      .toBe(true);
    expect(parsePCMMimeType('audio/pcm;rate=8000;channels=2')).toEqual({
      mimeType: 'audio/pcm',
      sampleRate: 8000,
      channels: 2,
    });
    expect(() => parsePCMMimeType('video/pcm;rate=16000')).toThrow(
      'only accepts PCM input audio'
    );
    expect(() => parsePCMMimeType('application/pcm;rate=16000')).toThrow(
      'only accepts PCM input audio'
    );
    expect(() => parsePCMMimeType('audio/x-pcm;rate=16000')).toThrow(
      'only accepts PCM input audio'
    );
    expect(() => parsePCMMimeType('audio/wav')).toThrow(
      'only accepts PCM input audio'
    );
  });
});
