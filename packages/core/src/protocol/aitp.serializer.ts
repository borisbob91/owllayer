import type { AITPMessage, SystemEventKind, ToolDeclaration } from './aitp.types.js';
import { MessageType } from './aitp.types.js';
import { validateMessage } from './aitp.validator.js';
import { generateId } from '../utils/uuid.js';

/**
 * Creer un message AITP avec ID et timestamp automatiques.
 */
export function createMessage<T extends MessageType>(
  type: T,
  payload: Extract<AITPMessage, { type: T }>['payload'],
  meta?: AITPMessage['meta']
): Extract<AITPMessage, { type: T }> {
  return {
    id: generateId(),
    type,
    timestamp: Date.now(),
    payload,
    meta,
  } as Extract<AITPMessage, { type: T }>;
}

/**
 * Serialiser un message AITP en string JSON.
 */
export function encode(message: AITPMessage): string {
  return JSON.stringify(message);
}

/**
 * Deserialiser un string JSON en message AITP valide.
 * @throws Si le JSON est invalide ou le message ne passe pas la validation.
 */
export function decode(raw: string): AITPMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('AITP decode error: invalid JSON');
  }

  const result = validateMessage(parsed);
  if (!result.success) {
    throw new Error(`AITP decode error: ${result.error}`);
  }

  return result.data as AITPMessage;
}

/**
 * Decoder sans throw (retourne null si invalide).
 */
export function tryDecode(raw: string): AITPMessage | null {
  try {
    return decode(raw);
  } catch {
    return null;
  }
}

// ============================================================
// Factory functions pour creer rapidement chaque type de message
// ============================================================

export const Messages = {
  handshakeInit(
    apiKey: string,
    userAgent: string,
    viewport: string,
    sdkVersion: string,
    protocolVersion: string
  ) {
    return createMessage(MessageType.HANDSHAKE_INIT, {
      apiKey,
      userAgent,
      viewport,
      sdkVersion,
      protocolVersion,
    });
  },

  handshakeAck(sessionId: string, serverVersion: string, protocolVersion: string, capabilities: string[]) {
    return createMessage(MessageType.HANDSHAKE_ACK, {
      sessionId,
      serverVersion,
      protocolVersion,
      capabilities,
    });
  },

  contextUpdate(
    url: string,
    activeTools: ToolDeclaration[],
    title?: string,
    context?: Record<string, unknown>
  ) {
    return createMessage(MessageType.CONTEXT_UPDATE, {
      url,
      title,
      activeTools,
      context,
    });
  },

  userInputText(content: string) {
    return createMessage(MessageType.USER_INPUT, {
      modality: 'text',
      content,
    });
  },

  userInputAudio(audioBase64: string, mimeType: string = 'audio/pcm;rate=16000') {
    return createMessage(MessageType.USER_INPUT, {
      modality: 'audio',
      content: audioBase64,
      mimeType,
    });
  },

  toolCall(callId: string, name: string, args: Record<string, unknown>) {
    return createMessage(MessageType.TOOL_CALL, {
      callId,
      name,
      args,
    });
  },

  toolResult(
    callId: string,
    result: unknown,
    status: 'success' | 'error' | 'pending_approval' = 'success',
    error?: string
  ) {
    return createMessage(MessageType.TOOL_RESULT, {
      callId,
      result: result ?? null,
      status,
      error,
    });
  },

  approvalRequest(
    callId: string,
    toolName: string,
    risk: 'none' | 'low' | 'high' | 'critical',
    args: Record<string, unknown>,
    message: string
  ) {
    return createMessage(MessageType.APPROVAL_REQUEST, {
      callId,
      toolName,
      risk,
      args,
      message,
    });
  },

  approvalResponse(
    callId: string,
    approved: boolean,
    result?: unknown,
    error?: string
  ) {
    return createMessage(MessageType.APPROVAL_RESPONSE, {
      callId,
      approved,
      result,
      error,
    });
  },

  voiceInputEnd(reason: 'user_stop' | 'vad' | 'timeout' = 'user_stop') {
    return createMessage(MessageType.VOICE_INPUT_END, { reason });
  },

  voiceInterrupt(reason: 'barge_in' = 'barge_in') {
    return createMessage(MessageType.VOICE_INTERRUPT, { reason });
  },

  voiceStateEvent(event: 'turn_complete' | 'interrupted' | 'waiting_for_input', reason?: string) {
    return createMessage(MessageType.VOICE_STATE_EVENT, { event, reason });
  },

  agentResponse(chunk: string, done: boolean) {
    return createMessage(MessageType.AGENT_RESPONSE, {
      chunk,
      done,
    });
  },

  audioStream(data: string, mimeType: string = 'audio/pcm;rate=24000') {
    return createMessage(MessageType.AUDIO_STREAM, {
      data,
      mimeType,
    });
  },

  systemEvent(kind: SystemEventKind, message?: string, data?: Record<string, unknown>) {
    return createMessage(MessageType.SYSTEM_EVENT, {
      kind,
      message,
      data,
    });
  },
} as const;
