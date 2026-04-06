import type { ApprovalRequest } from '../security/hitl.types.js';
import type {
  SystemEventKind,
  ToolCallPayload,
  ToolDeclaration,
} from '../protocol/adtp.types.js';
import type { ClientState } from './DomOSClient.js';

export const DOMOS_CLIENT_EVENT_TYPES = [
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
  'tool.call.requested',
  'approval.requested',
  'audio.output.chunk',
  'line.state.changed',
  'system.error',
] as const;

export type DomOSClientEventType = typeof DOMOS_CLIENT_EVENT_TYPES[number];

export type DomOSClientTurnSource = 'provider' | 'server' | 'client';

export type DomOSClientPlaybackSource = 'browser' | 'sdk';

export type DomOSClientLineState = 'idle' | 'waiting' | 'busy';

export interface DomOSClientEventMap {
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
    source: DomOSClientTurnSource;
    sessionId?: string;
  };
  'turn.completed': {
    source: DomOSClientTurnSource;
    sessionId?: string;
  };
  'turn.interrupted': {
    source: DomOSClientTurnSource;
    reason?: string;
    sessionId?: string;
  };
  'turn.waiting_for_input': {
    source: DomOSClientTurnSource;
    sessionId?: string;
  };
  'playback.completed': {
    source: DomOSClientPlaybackSource;
    sessionId?: string;
  };
  'tool.registry.synced': {
    tools: ToolDeclaration[];
  };
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
    state: DomOSClientLineState;
  };
  'system.error': {
    message: string;
    kind?: SystemEventKind | string;
  };
}

export type DomOSClientEventOf<TType extends DomOSClientEventType> = {
  type: TType;
  payload: DomOSClientEventMap[TType];
};

export type DomOSClientEvent = {
  [TType in DomOSClientEventType]: DomOSClientEventOf<TType>;
}[DomOSClientEventType];

export type DomOSClientEventListener<TType extends DomOSClientEventType> = (
  payload: DomOSClientEventMap[TType],
  event: DomOSClientEventOf<TType>
) => void;

export type DomOSClientAnyEventListener = (event: DomOSClientEvent) => void;
