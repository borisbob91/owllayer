import type { LLMToolCall } from '@domos/core';
import type { DomOSContextSnapshot } from './DomOSContextBridge.js';
import type { LiveKitRoomHandle } from './LiveKitRoomManager.js';

export type DomOSLiveKitBridgeEvent =
  | {
      type: 'room.ready';
      sessionId: string;
      room: LiveKitRoomHandle;
    }
  | {
      type: 'agent_session.started';
      sessionId: string;
      room: LiveKitRoomHandle;
      context: DomOSContextSnapshot;
    }
  | {
      type: 'context.updated';
      sessionId: string;
      context: DomOSContextSnapshot;
      toolCount: number;
    }
  | {
      type: 'tools.update_deferred';
      sessionId: string;
      toolCount: number;
      reason: string;
    }
  | {
      type: 'tool.call_started';
      sessionId: string;
      toolCall: LLMToolCall;
    }
  | {
      type: 'tool.call_completed';
      sessionId: string;
      toolCall: LLMToolCall;
      result: unknown;
    }
  | {
      type: 'tool.call_failed';
      sessionId: string;
      toolCall: LLMToolCall;
      error: string;
    }
  | {
      type: 'agent_session.closed';
      sessionId: string;
      reason?: string;
    }
  | {
      type: 'error';
      sessionId?: string;
      message: string;
    };

export type DomOSLiveKitBridgeEventListener = (event: DomOSLiveKitBridgeEvent) => void;

export function emitBridgeEvent(
  listener: DomOSLiveKitBridgeEventListener | undefined,
  event: DomOSLiveKitBridgeEvent
): void {
  listener?.(event);
}
