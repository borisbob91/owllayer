import type { LLMToolCall } from '@domos/core';
import { emitBridgeEvent, type DomOSLiveKitBridgeEventListener } from './events.js';

export interface DomOSToolExecutorContext {
  sessionId: string;
}

export type DomOSToolExecutor = (
  toolCall: LLMToolCall,
  context: DomOSToolExecutorContext
) => Promise<unknown> | unknown;

export interface DomOSToolResponseTarget {
  sendToolResponse(callId: string, name: string, result: unknown): Promise<void> | void;
}

export type DomOSToolBridgeResult =
  | {
      ok: true;
      result: unknown;
    }
  | {
      ok: false;
      error: string;
      result: { error: string };
    };

export interface DomOSToolBridgeOptions {
  sessionId: string;
  executor: DomOSToolExecutor;
  responseTarget?: DomOSToolResponseTarget;
  onEvent?: DomOSLiveKitBridgeEventListener;
}

export class DomOSToolBridge {
  constructor(private readonly options: DomOSToolBridgeOptions) {}

  async handleToolCall(toolCall: LLMToolCall): Promise<DomOSToolBridgeResult> {
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
