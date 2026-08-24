import type { LLMToolCall } from '@owllayer/core';
import { emitBridgeEvent, type OwlLayerLiveKitBridgeEventListener } from './events.js';

export interface OwlLayerToolExecutorContext {
  sessionId: string;
}

export type OwlLayerToolExecutor = (
  toolCall: LLMToolCall,
  context: OwlLayerToolExecutorContext
) => Promise<unknown> | unknown;

export interface OwlLayerToolResponseTarget {
  sendToolResponse(callId: string, name: string, result: unknown): Promise<void> | void;
}

export type OwlLayerToolBridgeResult =
  | {
      ok: true;
      result: unknown;
    }
  | {
      ok: false;
      error: string;
      result: { error: string };
    };

export interface OwlLayerToolBridgeOptions {
  sessionId: string;
  executor: OwlLayerToolExecutor;
  responseTarget?: OwlLayerToolResponseTarget;
  onEvent?: OwlLayerLiveKitBridgeEventListener;
}

export class OwlLayerToolBridge {
  constructor(private readonly options: OwlLayerToolBridgeOptions) {}

  async handleToolCall(toolCall: LLMToolCall): Promise<OwlLayerToolBridgeResult> {
    emitBridgeEvent(this.options.onEvent, {
      type: 'tool.call_started',
      sessionId: this.options.sessionId,
      toolCall,
    });

    try {
      const result = await this.options.executor(toolCall, {
        sessionId: this.options.sessionId,
      });
      await this.options.responseTarget?.sendToolResponse(
        toolCall.callId,
        toolCall.name,
        result
      );

      emitBridgeEvent(this.options.onEvent, {
        type: 'tool.call_completed',
        sessionId: this.options.sessionId,
        toolCall,
        result,
      });

      return { ok: true, result };
    } catch (error) {
      const message = normalizeToolError(error);
      const result = { error: message };

      await this.options.responseTarget?.sendToolResponse(
        toolCall.callId,
        toolCall.name,
        result
      );

      emitBridgeEvent(this.options.onEvent, {
        type: 'tool.call_failed',
        sessionId: this.options.sessionId,
        toolCall,
        error: message,
      });

      return { ok: false, error: message, result };
    }
  }
}

function normalizeToolError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
