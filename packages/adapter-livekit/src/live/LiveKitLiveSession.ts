import type { LiveSession, LiveSessionConfig, LLMToolCall, ToolDeclaration } from '@owllayer/core';
import { LiveKitAdapterError } from '../errors.js';
import { createLiveKitAudioFrame, liveKitAudioFrameToOwlLayerAudio } from './audioMapping.js';
import { createLiveKitToolContext, serializeToolResult, toOwlLayerToolCall } from './toolMapping.js';
import type {
  LiveKitAudioFrame,
  LiveKitFunctionCall,
  LiveKitGenerationCreatedEvent,
  LiveKitInputTranscriptionCompletedEvent,
  LiveKitMessageGeneration,
  LiveKitModelErrorEvent,
  LiveKitReadableStream,
  LiveKitRealtimeModelClient,
  LiveKitRealtimeSessionClient,
  LiveKitRuntimeHelpers,
  LiveKitToolsUpdateStatus,
  LiveKitToolsUpdateStatusEvent,
} from './types.js';

export interface LiveKitLiveSessionConfig extends LiveSessionConfig {
  onToolsUpdateStatus?: (event: LiveKitToolsUpdateStatusEvent) => void;
}

export interface LiveKitLiveSessionOptions {
  provider: string;
  providerSession: LiveKitRealtimeSessionClient;
  providerModel?: LiveKitRealtimeModelClient;
  helpers: LiveKitRuntimeHelpers;
  config: LiveKitLiveSessionConfig;
  secrets?: Array<string | undefined>;
}

export class LiveKitLiveSession implements LiveSession {
  private active = true;
  private lastToolsUpdateStatusValue: LiveKitToolsUpdateStatus = 'not_requested';
  private readonly consumedGenerations = new WeakSet<object>();
  private readonly consumedResponseIds = new Set<string>();
  private readonly listeners: Array<[string, (...args: unknown[]) => void]> = [];

  constructor(private readonly options: LiveKitLiveSessionOptions) {
    this.attachProviderEvents();
  }

  get isActive(): boolean {
    return this.active;
  }

  get lastToolsUpdateStatus(): LiveKitToolsUpdateStatus {
    return this.lastToolsUpdateStatusValue;
  }

  async sendAudio(audioBase64: string, mimeType?: string): Promise<void> {
    if (!this.active) {
      return;
    }

    try {
      const frame = createLiveKitAudioFrame(this.options.helpers, audioBase64, mimeType);
      this.options.providerSession.pushAudio(frame);
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async sendText(text: string): Promise<void> {
    if (!this.active) {
      return;
    }

    const cleanText = text.trim();
    if (!cleanText) {
      return;
    }

    try {
      const capabilities = this.getCapabilities();
      if (capabilities.midSessionChatCtxUpdate === false) {
        throw new LiveKitAdapterError(
          'This LiveKit realtime model cannot receive text chat updates after the session has started.'
        );
      }

      const chatCtx = this.copyCurrentChatContext();
      this.options.helpers.appendUserMessage(chatCtx, cleanText);
      await this.options.providerSession.updateChatCtx(chatCtx);

      if (this.options.providerSession.generateReply) {
        const generation = await this.options.providerSession.generateReply();
        void this.consumeGeneration(generation);
      }
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async sendToolResponse(callId: string, name: string, result: unknown): Promise<void> {
    if (!this.active) {
      return;
    }

    try {
      const chatCtx = this.copyCurrentChatContext();
      this.options.helpers.appendFunctionCallOutput(chatCtx, {
        callId,
        name,
        output: serializeToolResult(result),
        isError: result instanceof Error,
      });
      await this.options.providerSession.updateChatCtx(chatCtx);

      if (this.options.providerSession.generateReply) {
        const capabilities = this.getCapabilities();
        if (capabilities.midSessionChatCtxUpdate !== false) {
          const generation = await this.options.providerSession.generateReply();
          void this.consumeGeneration(generation);
        }
      }
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async endAudioTurn(): Promise<void> {
    if (!this.active) {
      return;
    }

    await this.options.providerSession.commitAudio?.();
  }

  async interrupt(): Promise<void> {
    if (!this.active) {
      return;
    }

    await this.options.providerSession.interrupt?.();
  }

  updateTools(tools: ToolDeclaration[]): void {
    if (!this.active) {
      return;
    }

    const capabilities = this.getCapabilities();
    if (capabilities.midSessionToolsUpdate === false) {
      this.setToolsUpdateStatus({
        status: 'deferred_until_next_session',
        toolCount: tools.length,
        reason: 'Provider does not support mid-session tool list updates.',
      });
      return;
    }

    const toolContext = createLiveKitToolContext(this.options.helpers, tools);
    void this.options.providerSession.updateTools(toolContext)
      .then(() => {
        this.setToolsUpdateStatus({
          status: 'applied',
          toolCount: tools.length,
        });
      })
      .catch((error: unknown) => {
        this.setToolsUpdateStatus({
          status: 'failed',
          toolCount: tools.length,
          reason: normalizeError(error, this.options.provider, this.options.secrets).message,
        });
        this.handleError(error);
      });
  }

  close(): void {
    if (!this.active) {
      return;
    }

    this.active = false;
    for (const [event, listener] of this.listeners) {
      this.options.providerSession.off?.(event, listener);
    }
    this.listeners.length = 0;

    void this.options.providerSession.close?.()
      .catch((error: unknown) => this.handleError(error))
      .finally(() => this.options.config.onClose?.());
  }

  private attachProviderEvents(): void {
    this.onProvider('generation_created', (generation) => {
      void this.consumeGeneration(generation as LiveKitGenerationCreatedEvent);
    });
    this.onProvider('input_audio_transcription_completed', (event) => {
      const transcript = (event as LiveKitInputTranscriptionCompletedEvent)?.transcript;
      if (transcript) {
        this.options.config.onTranscript?.('user', transcript);
      }
    });
    this.onProvider('input_speech_started', () => this.options.config.onInterrupted?.());
    this.onProvider('input_speech_stopped', () => this.options.config.onWaitingForInput?.());
    this.onProvider('error', (event) => {
      const modelError = event as LiveKitModelErrorEvent;
      this.handleError(modelError.error ?? event);
    });
  }

  private onProvider(event: string, listener: (...args: unknown[]) => void): void {
    this.options.providerSession.on(event, listener);
    this.listeners.push([event, listener]);
  }

  private async consumeGeneration(generation: LiveKitGenerationCreatedEvent): Promise<void> {
    if (!generation || this.hasConsumedGeneration(generation)) {
      return;
    }

    try {
      await Promise.all([
        this.consumeMessages(generation.messageStream),
        this.consumeFunctionCalls(generation.functionStream),
      ]);
    } catch (error) {
      this.handleError(error);
    }
  }

  private hasConsumedGeneration(generation: LiveKitGenerationCreatedEvent): boolean {
    if (typeof generation === 'object') {
      if (this.consumedGenerations.has(generation)) {
        return true;
      }
      this.consumedGenerations.add(generation);
    }

    if (generation.responseId) {
      if (this.consumedResponseIds.has(generation.responseId)) {
        return true;
      }
      this.consumedResponseIds.add(generation.responseId);
    }

    return false;
  }

  private async consumeMessages(
    stream: LiveKitReadableStream<LiveKitMessageGeneration> | undefined
  ): Promise<void> {
    if (!stream) {
      return;
    }

    await readStream(stream, async (message) => {
      await Promise.all([
        this.consumeTextStream(message.textStream),
        this.consumeAudioStream(message.audioStream),
      ]);
    });
  }

  private async consumeTextStream(
    stream: LiveKitMessageGeneration['textStream']
  ): Promise<void> {
    if (!stream) {
      return;
    }

    await readStream(stream, (chunk) => {
      const text = typeof chunk === 'string' ? chunk : chunk.text ?? chunk.value ?? '';
      if (text) {
        this.options.config.onTextOutput?.(text, false);
        this.options.config.onTranscript?.('agent', text);
      }
    });
    this.options.config.onTextOutput?.('', true);
  }

  private async consumeAudioStream(
    stream: LiveKitReadableStream<LiveKitAudioFrame> | undefined
  ): Promise<void> {
    if (!stream) {
      return;
    }

    await readStream(stream, (frame) => {
      const audio = liveKitAudioFrameToOwlLayerAudio(frame);
      this.options.config.onAudioOutput?.(audio.audioBase64, audio.mimeType);
    });
  }

  private async consumeFunctionCalls(
    stream: LiveKitReadableStream<LiveKitFunctionCall> | undefined
  ): Promise<void> {
    if (!stream) {
      return;
    }

    await readStream(stream, (call) => {
      const toolCall: LLMToolCall = toOwlLayerToolCall(call);
      this.options.config.onToolCall?.(toolCall);
    });
  }

  private copyCurrentChatContext(): unknown {
    const chatCtx = this.options.providerSession.chatCtx ??
      this.options.helpers.createChatContext();
    return this.options.helpers.copyChatContext(chatCtx);
  }

  private getCapabilities() {
    return this.options.providerSession.realtimeModel?.capabilities ??
      this.options.providerModel?.capabilities ??
      {};
  }

  private handleError(error: unknown): void {
    const normalized = normalizeError(error, this.options.provider, this.options.secrets);
    this.options.config.onError?.(normalized);
  }

  private setToolsUpdateStatus(event: LiveKitToolsUpdateStatusEvent): void {
    this.lastToolsUpdateStatusValue = event.status;
    this.options.config.onToolsUpdateStatus?.(event);
  }
}

async function readStream<T>(
  stream: LiveKitReadableStream<T>,
  onValue: (value: T) => void | Promise<void>
): Promise<void> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value !== undefined) {
        await onValue(value);
      }
    }
  } finally {
    reader.releaseLock?.();
  }
}

function normalizeError(
  error: unknown,
  provider: string,
  secrets: Array<string | undefined> = []
): Error {
  if (error instanceof LiveKitAdapterError) {
    return new LiveKitAdapterError(
      sanitizeMessage(error.message, secrets),
      error.code,
      {
        provider: error.provider ?? provider,
        statusCode: error.statusCode,
      }
    );
  }

  const rawMessage = error instanceof Error ? error.message : String(error);
  const message = sanitizeMessage(rawMessage || 'Unknown LiveKit realtime error', secrets);

  return new LiveKitAdapterError(
    `${provider}: ${message.length > 500 ? `${message.slice(0, 500)}...` : message}`,
    'LIVEKIT_ADAPTER_ERROR',
    { provider }
  );
}

function sanitizeMessage(message: string, secrets: Array<string | undefined>): string {
  let sanitized = message;
  for (const secret of secrets.filter((value): value is string => Boolean(value))) {
    sanitized = sanitized.split(secret).join('[redacted]');
  }

  return sanitized
    .replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
    .replace(/(api[_-]?key\s*[:=]\s*)[^\s,;]+/gi, '$1[redacted]');
}
