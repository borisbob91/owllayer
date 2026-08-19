import type { ApprovalRequest } from '../security/hitl.types.js';
import type {
  AITPMessage,
  EffectiveToolsPayload,
  SystemEventKind,
  SystemEventPayload,
  ToolCallPayload,
  ToolDeclaration,
  VoiceStateEventPayload,
} from '../protocol/aitp.types.js';
import type { ClientState } from './OwlLayerClient.js';

export const OWLLAYER_CLIENT_EVENT_TYPES = [
  'connection.state.changed',
  'session.started',
  'agent.response.delta',
  'agent.response.done',
  'turn.started',
  'turn.completed',
  'turn.interrupted',
  'turn.waiting_for_input',
  'playback.completed',
  'tool.registry.synced',
  'tool.registry.effective',
  'tool.call.requested',
  'approval.requested',
  'audio.output.chunk',
  'line.state.changed',
  'system.error',
] as const;

export type OwlLayerClientEventType = typeof OWLLAYER_CLIENT_EVENT_TYPES[number];

export type OwlLayerClientTurnSource = 'provider' | 'server' | 'client';

export type OwlLayerClientPlaybackSource = 'browser' | 'sdk';

export type OwlLayerClientLineState = 'idle' | 'waiting' | 'busy';

export interface OwlLayerClientEventMap {
  'connection.state.changed': {
    previous: ClientState;
    current: ClientState;
  };
  'session.started': {
    sessionId: string;
  };
  'agent.response.delta': {
    text: string;
    done: false;
    sessionId?: string;
  };
  'agent.response.done': {
    text: string;
    done: true;
    sessionId?: string;
  };
  'turn.started': {
    source: OwlLayerClientTurnSource;
    sessionId?: string;
  };
  'turn.completed': {
    source: OwlLayerClientTurnSource;
    sessionId?: string;
  };
  'turn.interrupted': {
    source: OwlLayerClientTurnSource;
    reason?: string;
    sessionId?: string;
  };
  'turn.waiting_for_input': {
    source: OwlLayerClientTurnSource;
    sessionId?: string;
  };
  'playback.completed': {
    source: OwlLayerClientPlaybackSource;
    sessionId?: string;
  };
  'tool.registry.synced': {
    tools: ToolDeclaration[];
  };
  'tool.registry.effective': EffectiveToolsPayload;
  'tool.call.requested': {
    toolCall: ToolCallPayload;
  };
  'approval.requested': {
    request: ApprovalRequest;
    resolve: (approved: boolean) => void;
  };
  'audio.output.chunk': {
    audioBase64: string;
    mimeType: string;
    sessionId?: string;
  };
  'line.state.changed': {
    lineNumber: string | null;
    waiting: boolean;
    state: OwlLayerClientLineState;
  };
  'system.error': {
    message: string;
    kind?: SystemEventKind | string;
  };
}

export type OwlLayerClientEventOf<TType extends OwlLayerClientEventType> = {
  type: TType;
  payload: OwlLayerClientEventMap[TType];
};

export type OwlLayerClientEvent = {
  [TType in OwlLayerClientEventType]: OwlLayerClientEventOf<TType>;
}[OwlLayerClientEventType];

export type OwlLayerClientEventListener<TType extends OwlLayerClientEventType> = (
  payload: OwlLayerClientEventMap[TType],
  event: OwlLayerClientEventOf<TType>
) => void;

export type OwlLayerClientAnyEventListener = (event: OwlLayerClientEvent) => void;
