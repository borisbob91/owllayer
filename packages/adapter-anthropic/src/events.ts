import type { LLMToolCall } from '@owllayer/core';

export interface AnthropicAdapterEventMap {
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

export type AnthropicAdapterEventType = keyof AnthropicAdapterEventMap & string;

export type AnthropicAdapterEventOf<TType extends AnthropicAdapterEventType> = {
  type: TType;
  payload: AnthropicAdapterEventMap[TType];
};

export type AnthropicAdapterEvent = {
  [TType in AnthropicAdapterEventType]: AnthropicAdapterEventOf<TType>;
}[AnthropicAdapterEventType];

export type AnthropicAdapterEventListener<TType extends AnthropicAdapterEventType> = (
  payload: AnthropicAdapterEventMap[TType],
  event: AnthropicAdapterEventOf<TType>
) => void;

export type AnthropicAdapterAnyEventListener = (event: AnthropicAdapterEvent) => void;
