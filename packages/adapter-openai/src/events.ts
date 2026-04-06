import type { LLMToolCall, LiveSession, LiveSessionConfig } from '@domos/core';

export interface OpenAIAdapterEventMap {
  'chat.response.text': {
    text: string;
    model: string;
  };
  'chat.tool.call': {
    toolCall: LLMToolCall;
    model: string;
  };
  'chat.error': {
    error: Error;
    message: string;
    model: string;
  };
}

export type OpenAIAdapterEventType = keyof OpenAIAdapterEventMap & string;

export type OpenAIAdapterEventOf<TType extends OpenAIAdapterEventType> = {
  type: TType;
  payload: OpenAIAdapterEventMap[TType];
};

export type OpenAIAdapterEvent = {
  [TType in OpenAIAdapterEventType]: OpenAIAdapterEventOf<TType>;
}[OpenAIAdapterEventType];

export type OpenAIAdapterEventListener<TType extends OpenAIAdapterEventType> = (
  payload: OpenAIAdapterEventMap[TType],
  event: OpenAIAdapterEventOf<TType>
) => void;

export type OpenAIAdapterAnyEventListener = (event: OpenAIAdapterEvent) => void;

export interface OpenAILiveEventMap {
  'live.session.opened': {
    model: string;
    voice: string;
  };
  'live.turn.started': {
    source: 'provider';
  };
  'live.audio.output': {
    audioBase64: string;
    mimeType: string;
  };
  'live.text.output.delta': {
    text: string;
    done: false;
  };
  'live.text.output.done': {
    text: string;
    done: true;
  };
  'live.transcript.user.delta': {
    role: 'user';
    text: string;
  };
  'live.transcript.agent.delta': {
    role: 'agent';
    text: string;
  };
  'live.turn.completed': {
    source: 'provider';
  };
  'live.tool.call': {
    toolCall: LLMToolCall;
  };
  'live.error': {
    error: Error;
    message: string;
  };
  'live.closed': {
    code?: number | string;
    reason?: string;
    fatal: boolean;
  };
}

export type OpenAILiveEventType = keyof OpenAILiveEventMap & string;

export type OpenAILiveEventOf<TType extends OpenAILiveEventType> = {
  type: TType;
  payload: OpenAILiveEventMap[TType];
};

export type OpenAILiveEvent = {
  [TType in OpenAILiveEventType]: OpenAILiveEventOf<TType>;
}[OpenAILiveEventType];

export type OpenAILiveEventListener<TType extends OpenAILiveEventType> = (
  payload: OpenAILiveEventMap[TType],
  event: OpenAILiveEventOf<TType>
) => void;

export type OpenAILiveAnyEventListener = (event: OpenAILiveEvent) => void;

export interface OpenAILiveSessionConfig extends LiveSessionConfig {
  onEvent?: OpenAILiveAnyEventListener;
  onAnyEvent?: OpenAILiveAnyEventListener;
}

export interface OpenAILiveSession extends LiveSession {
  onEvent<TType extends OpenAILiveEventType>(
    type: TType,
    listener: OpenAILiveEventListener<TType>
  ): () => void;
  offEvent<TType extends OpenAILiveEventType>(
    type: TType,
    listener: OpenAILiveEventListener<TType>
  ): void;
  onAnyEvent(listener: OpenAILiveAnyEventListener): () => void;
  offAnyEvent(listener: OpenAILiveAnyEventListener): void;
}
