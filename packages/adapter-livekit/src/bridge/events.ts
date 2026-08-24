import type { LLMToolCall } from '@owllayer/core';
import type { OwlLayerContextSnapshot } from './OwlLayerContextBridge.js';
import type { LiveKitRoomHandle } from './LiveKitRoomManager.js';

export type OwlLayerLiveKitBridgeEvent =
  | {
      type: 'room.ready';
      sessionId: string;
      room: LiveKitRoomHandle;
    }
  | {
      type: 'agent_session.started';
      sessionId: string;
      room: LiveKitRoomHandle;
      context: OwlLayerContextSnapshot;
    }
  | {
      type: 'context.updated';
      sessionId: string;
      context: OwlLayerContextSnapshot;
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

export type OwlLayerLiveKitBridgeEventListener = (event: OwlLayerLiveKitBridgeEvent) => void;

export function emitBridgeEvent(
  listener: OwlLayerLiveKitBridgeEventListener | undefined,
  event: OwlLayerLiveKitBridgeEvent
): void {
  listener?.(event);
}
