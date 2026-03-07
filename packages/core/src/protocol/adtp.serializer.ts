import type { ADTPMessage, ToolDeclaration } from './adtp.types.js';
import { MessageType } from './adtp.types.js';
import { validateMessage } from './adtp.validator.js';
import { generateId } from '../utils/uuid.js';

/**
 * Creer un message ADTP avec ID et timestamp automatiques.
 */
export function createMessage<T extends MessageType>(
  type: T,
  payload: Extract<ADTPMessage, { type: T }>['payload'],
  meta?: ADTPMessage['meta']
): Extract<ADTPMessage, { type: T }> {
  return {
    id: generateId(),
    type,
    timestamp: Date.now(),
    payload,
    meta,
  } as Extract<ADTPMessage, { type: T }>;
}

/**
 * Serialiser un message ADTP en string JSON.
 */
export function encode(message: ADTPMessage): string {
  return JSON.stringify(message);
}

/**
 * Deserialiser un string JSON en message ADTP valide.
 * @throws Si le JSON est invalide ou le message ne passe pas la validation.
 */
export function decode(raw: string): ADTPMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('ADTP decode error: invalid JSON');
  }

  const result = validateMessage(parsed);
  if (!result.success) {
    throw new Error(`ADTP decode error: ${result.error}`);
  }

  return result.data as ADTPMessage;
}

/**
 * Decoder sans throw (retourne null si invalide).
 */
export function tryDecode(raw: string): ADTPMessage | null {
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
      result,
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

  systemEvent(
    kind: 'reload' | 'redirect' | 'error' | 'disconnect' | 'waiting' | 'approval_required',
    message?: string
  ) {
    return createMessage(MessageType.SYSTEM_EVENT, {
      kind,
      message,
    });
  },
} as const;
