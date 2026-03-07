// ============================================================
// ADTP - Agent-to-DOM Transfer Protocol
// Version 1.0.0
// ============================================================

/**
 * Types de messages du protocole ADTP.
 * Upstream = Client → Serveur
 * Downstream = Serveur → Client
 */
export enum MessageType {
  // --- Upstream (Client → Server) ---
  HANDSHAKE_INIT = 'HANDSHAKE_INIT',
  CONTEXT_UPDATE = 'CONTEXT_UPDATE',
  TOOL_RESULT = 'TOOL_RESULT',
  APPROVAL_REQUEST = 'APPROVAL_REQUEST',
  APPROVAL_RESPONSE = 'APPROVAL_RESPONSE',
  USER_INPUT = 'USER_INPUT',

  // --- Downstream (Server → Client) ---
  HANDSHAKE_ACK = 'HANDSHAKE_ACK',
  TOOL_CALL = 'TOOL_CALL',
  AGENT_RESPONSE = 'AGENT_RESPONSE',
  AUDIO_STREAM = 'AUDIO_STREAM',
  SYSTEM_EVENT = 'SYSTEM_EVENT',
}

/**
 * Modalite d'input utilisateur.
 */
export type InputModality = 'text' | 'audio';

/**
 * Statut d'execution d'un tool.
 */
export type ToolResultStatus = 'success' | 'error' | 'pending_approval';

/**
 * Types d'evenements systeme.
 */
export type SystemEventKind =
  | 'reload'
  | 'redirect'
  | 'error'
  | 'disconnect'
  | 'waiting'
  | 'approval_required';

// ============================================================
// Payloads Upstream (Client → Server)
// ============================================================

export interface HandshakeInitPayload {
  apiKey: string;
  userAgent: string;
  viewport: string;
  sdkVersion: string;
  protocolVersion: string;
}

export interface ContextUpdatePayload {
  url: string;
  title?: string;
  activeTools: ToolDeclaration[];
  context?: Record<string, unknown>;
}

export interface ToolResultPayload {
  callId: string;
  result: unknown;
  status: ToolResultStatus;
  error?: string;
}

export interface ApprovalRequestPayload {
  callId: string;
  toolName: string;
  risk: 'none' | 'low' | 'high' | 'critical';
  args: Record<string, unknown>;
  message: string;
}

export interface ApprovalResponsePayload {
  callId: string;
  approved: boolean;
  result?: unknown;
  error?: string;
}

export interface UserInputPayload {
  modality: InputModality;
  content: string; // texte ou base64 audio
  mimeType?: string; // ex: 'audio/pcm;rate=16000'
}

// ============================================================
// Payloads Downstream (Server → Client)
// ============================================================

export interface HandshakeAckPayload {
  sessionId: string;
  serverVersion: string;
  protocolVersion: string;
  capabilities: string[];
}

export interface ToolCallPayload {
  callId: string;
  name: string;
  args: Record<string, unknown>;
}

export interface AgentResponsePayload {
  chunk: string;
  done: boolean;
  modality?: InputModality;
  audioData?: string; // base64 audio
}

/**
 * Payload pour le streaming audio de l'agent vers le client.
 * Utilise en mode Live (Gemini Live, etc.).
 */
export interface AudioStreamPayload {
  /** Audio en base64 (PCM, opus, etc.) */
  data: string;
  /** MIME type (ex: 'audio/pcm;rate=24000') */
  mimeType: string;
}

export interface SystemEventPayload {
  kind: SystemEventKind;
  message?: string;
  data?: Record<string, unknown>;
}

// ============================================================
// Declaration d'un tool (envoyee dans CONTEXT_UPDATE)
// ============================================================

export interface ToolParameterProperty {
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'OBJECT' | 'ARRAY';
  description?: string;
  enum?: string[];
}

export interface ToolParameters {
  type: 'OBJECT';
  properties: Record<string, ToolParameterProperty>;
  required?: string[];
}

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters?: ToolParameters;
  /** Niveau de risque (si fourni par le client) */
  risk?: 'none' | 'low' | 'high' | 'critical';
}

// ============================================================
// Message ADTP (enveloppe)
// ============================================================

export interface ADTPMessageMeta {
  sessionId?: string;
  token?: string;
}

/**
 * Union discriminee de tous les types de messages ADTP.
 */
export type ADTPMessage =
  | {
      id: string;
      type: MessageType.HANDSHAKE_INIT;
      timestamp: number;
      payload: HandshakeInitPayload;
      meta?: ADTPMessageMeta;
    }
  | {
      id: string;
      type: MessageType.HANDSHAKE_ACK;
      timestamp: number;
      payload: HandshakeAckPayload;
      meta?: ADTPMessageMeta;
    }
  | {
      id: string;
      type: MessageType.CONTEXT_UPDATE;
      timestamp: number;
      payload: ContextUpdatePayload;
      meta?: ADTPMessageMeta;
    }
  | {
      id: string;
      type: MessageType.TOOL_RESULT;
      timestamp: number;
      payload: ToolResultPayload;
      meta?: ADTPMessageMeta;
    }
  | {
      id: string;
      type: MessageType.APPROVAL_REQUEST;
      timestamp: number;
      payload: ApprovalRequestPayload;
      meta?: ADTPMessageMeta;
    }
  | {
      id: string;
      type: MessageType.APPROVAL_RESPONSE;
      timestamp: number;
      payload: ApprovalResponsePayload;
      meta?: ADTPMessageMeta;
    }
  | {
      id: string;
      type: MessageType.USER_INPUT;
      timestamp: number;
      payload: UserInputPayload;
      meta?: ADTPMessageMeta;
    }
  | {
      id: string;
      type: MessageType.TOOL_CALL;
      timestamp: number;
      payload: ToolCallPayload;
      meta?: ADTPMessageMeta;
    }
  | {
      id: string;
      type: MessageType.AGENT_RESPONSE;
      timestamp: number;
      payload: AgentResponsePayload;
      meta?: ADTPMessageMeta;
    }
  | {
      id: string;
      type: MessageType.AUDIO_STREAM;
      timestamp: number;
      payload: AudioStreamPayload;
      meta?: ADTPMessageMeta;
    }
  | {
      id: string;
      type: MessageType.SYSTEM_EVENT;
      timestamp: number;
      payload: SystemEventPayload;
      meta?: ADTPMessageMeta;
    };

/**
 * Extraire le type de payload a partir du MessageType.
 */
export type PayloadOf<T extends MessageType> = Extract<
  ADTPMessage,
  { type: T }
>['payload'];
