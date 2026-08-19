import type { ToolDeclaration } from '@owllayer/core';

export interface LiveKitRealtimeCapabilities {
  messageTruncation?: boolean;
  turnDetection?: boolean;
  userTranscription?: boolean;
  autoToolReplyGeneration?: boolean;
  audioOutput?: boolean;
  manualFunctionCalls?: boolean;
  midSessionChatCtxUpdate?: boolean;
  midSessionInstructionsUpdate?: boolean;
  midSessionToolsUpdate?: boolean;
  perResponseToolChoice?: boolean;
  nativeTranscriptSync?: boolean;
}

export interface LiveKitRealtimeModelClient {
  readonly model?: string;
  readonly capabilities?: LiveKitRealtimeCapabilities;
  session(): LiveKitRealtimeSessionClient;
  close?(): Promise<void>;
}

export interface LiveKitStreamReader<T> {
  read(): Promise<{ done?: boolean; value?: T }>;
  releaseLock?(): void;
}

export interface LiveKitReadableStream<T> {
  getReader(): LiveKitStreamReader<T>;
}

export interface LiveKitAudioFrame {
  data: Int16Array;
  sampleRate: number;
  channels: number;
  samplesPerChannel: number;
}

export interface LiveKitFunctionCall {
  callId: string;
  name: string;
  args?: string | Record<string, unknown>;
}

export interface LiveKitMessageGeneration {
  messageId?: string;
  textStream?: LiveKitReadableStream<string | { text?: string; value?: string }>;
  audioStream?: LiveKitReadableStream<LiveKitAudioFrame>;
  modalities?: Promise<Array<'text' | 'audio'>>;
}

export interface LiveKitGenerationCreatedEvent {
  messageStream?: LiveKitReadableStream<LiveKitMessageGeneration>;
  functionStream?: LiveKitReadableStream<LiveKitFunctionCall>;
  userInitiated?: boolean;
  responseId?: string;
}

export interface LiveKitInputTranscriptionCompletedEvent {
  itemId?: string;
  transcript?: string;
  isFinal?: boolean;
}

export interface LiveKitModelErrorEvent {
  error?: Error;
  recoverable?: boolean;
  label?: string;
}

export interface LiveKitRealtimeSessionClient {
  readonly realtimeModel?: LiveKitRealtimeModelClient;
  readonly chatCtx?: unknown;
  readonly tools?: unknown;
  updateInstructions?(instructions: string): Promise<void>;
  updateChatCtx(chatCtx: unknown): Promise<void>;
  updateTools(tools: unknown): Promise<void>;
  updateOptions?(options: { toolChoice?: unknown; [key: string]: unknown }): void;
  pushAudio(frame: unknown): void;
  generateReply?(
    instructions?: string,
    options?: { signal?: AbortSignal }
  ): Promise<LiveKitGenerationCreatedEvent>;
  commitAudio?(): Promise<void>;
  clearAudio?(): Promise<void>;
  interrupt?(): Promise<void>;
  truncate?(options: {
    messageId: string;
    audioEndMs: number;
    modalities?: Array<'text' | 'audio'>;
    audioTranscript?: string;
  }): Promise<void>;
  close?(): Promise<void>;
  startUserActivity?(): void;
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  off?(event: string, listener: (...args: unknown[]) => void): unknown;
}

export interface LiveKitToolResponseParams {
  callId: string;
  name: string;
  output: string;
  isError: boolean;
}

export interface LiveKitRuntimeHelpers {
  createAudioFrame(
    data: Int16Array,
    sampleRate: number,
    channels: number,
    samplesPerChannel: number
  ): unknown;
  createChatContext(): unknown;
  copyChatContext(chatCtx: unknown): unknown;
  appendUserMessage(chatCtx: unknown, text: string): void;
  appendFunctionCallOutput(chatCtx: unknown, params: LiveKitToolResponseParams): void;
  createToolContext(tools: ToolDeclaration[]): unknown;
}

export type LiveKitRuntimeHelpersFactory =
  () => LiveKitRuntimeHelpers | Promise<LiveKitRuntimeHelpers>;

export type LiveKitToolsUpdateStatus =
  | 'not_requested'
  | 'applied'
  | 'deferred_until_next_session'
  | 'failed';

export interface LiveKitToolsUpdateStatusEvent {
  status: LiveKitToolsUpdateStatus;
  toolCount: number;
  reason?: string;
}
