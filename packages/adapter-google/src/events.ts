import type { LLMToolCall, LiveSession, LiveSessionConfig } from '@owllayer/core';

export interface GoogleAdapterEventMap {
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

export type GoogleAdapterEventType = keyof GoogleAdapterEventMap & string;

export type GoogleAdapterEventOf<TType extends GoogleAdapterEventType> = {
  type: TType;
  payload: GoogleAdapterEventMap[TType];
};

export type GoogleAdapterEvent = {
  [TType in GoogleAdapterEventType]: GoogleAdapterEventOf<TType>;
}[GoogleAdapterEventType];

export type GoogleAdapterEventListener<TType extends GoogleAdapterEventType> = (
  payload: GoogleAdapterEventMap[TType],
  event: GoogleAdapterEventOf<TType>
) => void;

export type GoogleAdapterAnyEventListener = (event: GoogleAdapterEvent) => void;

export interface GoogleLiveEventMap {
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
  'live.turn.interrupted': {
    source: 'provider';
  };
  'live.turn.waiting_for_input': {
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

export type GoogleLiveEventType = keyof GoogleLiveEventMap & string;

export type GoogleLiveEventOf<TType extends GoogleLiveEventType> = {
  type: TType;
  payload: GoogleLiveEventMap[TType];
};

export type GoogleLiveEvent = {
  [TType in GoogleLiveEventType]: GoogleLiveEventOf<TType>;
}[GoogleLiveEventType];

export type GoogleLiveEventListener<TType extends GoogleLiveEventType> = (
  payload: GoogleLiveEventMap[TType],
  event: GoogleLiveEventOf<TType>
) => void;

export type GoogleLiveAnyEventListener = (event: GoogleLiveEvent) => void;

export interface GoogleLiveSessionConfig extends LiveSessionConfig {
  onEvent?: GoogleLiveAnyEventListener;
  onAnyEvent?: GoogleLiveAnyEventListener;
}

export interface GoogleLiveSession extends LiveSession {
  onEvent<TType extends GoogleLiveEventType>(
    type: TType,
    listener: GoogleLiveEventListener<TType>
  ): () => void;
  offEvent<TType extends GoogleLiveEventType>(
    type: TType,
    listener: GoogleLiveEventListener<TType>
  ): void;
  onAnyEvent(listener: GoogleLiveAnyEventListener): () => void;
  offAnyEvent(listener: GoogleLiveAnyEventListener): void;
}