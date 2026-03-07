import { z } from 'zod';
import { MessageType } from './adtp.types.js';

// ============================================================
// Schemas Zod pour valider chaque type de message ADTP
// ============================================================

const toolParameterPropertySchema = z.object({
  type: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'OBJECT', 'ARRAY']),
  description: z.string().optional(),
  enum: z.array(z.string()).optional(),
});

const toolParametersSchema = z.object({
  type: z.literal('OBJECT'),
  properties: z.record(toolParameterPropertySchema),
  required: z.array(z.string()).optional(),
});

const toolDeclarationSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  parameters: toolParametersSchema.optional(),
  risk: z.enum(['none', 'low', 'high', 'critical']).optional(),
});

// --- Payloads Upstream ---

const handshakeInitPayload = z.object({
  apiKey: z.string().min(1),
  userAgent: z.string(),
  viewport: z.string(),
  sdkVersion: z.string(),
  protocolVersion: z.string(),
});

const contextUpdatePayload = z.object({
  url: z.string(),
  title: z.string().optional(),
  activeTools: z.array(toolDeclarationSchema),
  context: z.record(z.unknown()).optional(),
});

const toolResultPayload = z.object({
  callId: z.string().min(1),
  result: z.unknown(),
  status: z.enum(['success', 'error', 'pending_approval']),
  error: z.string().optional(),
});

const approvalRequestPayload = z.object({
  callId: z.string().min(1),
  toolName: z.string().min(1),
  risk: z.enum(['none', 'low', 'high', 'critical']),
  args: z.record(z.unknown()),
  message: z.string().min(1),
});

const approvalResponsePayload = z.object({
  callId: z.string().min(1),
  approved: z.boolean(),
  result: z.unknown().optional(),
  error: z.string().optional(),
});

const userInputPayload = z.object({
  modality: z.enum(['text', 'audio']),
  content: z.string(),
  mimeType: z.string().optional(),
});

// --- Payloads Downstream ---

const handshakeAckPayload = z.object({
  sessionId: z.string().min(1),
  serverVersion: z.string(),
  protocolVersion: z.string(),
  capabilities: z.array(z.string()),
});

const toolCallPayload = z.object({
  callId: z.string().min(1),
  name: z.string().min(1),
  args: z.record(z.unknown()),
});

const agentResponsePayload = z.object({
  chunk: z.string(),
  done: z.boolean(),
  modality: z.enum(['text', 'audio']).optional(),
  audioData: z.string().optional(),
});

const audioStreamPayload = z.object({
  data: z.string().min(1),
  mimeType: z.string().min(1),
});

const systemEventPayload = z.object({
  kind: z.enum(['reload', 'redirect', 'error', 'disconnect', 'waiting', 'approval_required']),
  message: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

// --- Message complet ---

const metaSchema = z.object({
  sessionId: z.string().optional(),
  token: z.string().optional(),
}).optional();

/**
 * Map MessageType → schema de payload.
 */
const payloadSchemas: Record<MessageType, z.ZodType> = {
  [MessageType.HANDSHAKE_INIT]: handshakeInitPayload,
  [MessageType.HANDSHAKE_ACK]: handshakeAckPayload,
  [MessageType.CONTEXT_UPDATE]: contextUpdatePayload,
  [MessageType.TOOL_RESULT]: toolResultPayload,
  [MessageType.APPROVAL_REQUEST]: approvalRequestPayload,
  [MessageType.APPROVAL_RESPONSE]: approvalResponsePayload,
  [MessageType.USER_INPUT]: userInputPayload,
  [MessageType.TOOL_CALL]: toolCallPayload,
  [MessageType.AGENT_RESPONSE]: agentResponsePayload,
  [MessageType.AUDIO_STREAM]: audioStreamPayload,
  [MessageType.SYSTEM_EVENT]: systemEventPayload,
};

/**
 * Schema de base d'un message ADTP (sans validation du payload).
 */
const baseMessageSchema = z.object({
  id: z.string().min(1),
  type: z.nativeEnum(MessageType),
  timestamp: z.number(),
  payload: z.unknown(),
  meta: metaSchema,
});

/**
 * Resultat de validation.
 */
export type ValidationResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Valider un message ADTP complet (enveloppe + payload).
 */
export function validateMessage(raw: unknown): ValidationResult {
  // 1. Valider l'enveloppe
  const baseResult = baseMessageSchema.safeParse(raw);
  if (!baseResult.success) {
    return {
      success: false,
      error: `Invalid ADTP message: ${baseResult.error.issues[0]?.message}`,
    };
  }

  const message = baseResult.data;

  // 2. Valider le payload selon le type
  const payloadSchema = payloadSchemas[message.type];
  if (!payloadSchema) {
    return {
      success: false,
      error: `Unknown message type: ${message.type}`,
    };
  }

  const payloadResult = payloadSchema.safeParse(message.payload);
  if (!payloadResult.success) {
    return {
      success: false,
      error: `Invalid payload for ${message.type}: ${payloadResult.error.issues[0]?.message}`,
    };
  }

  return {
    success: true,
    data: { ...message, payload: payloadResult.data },
  };
}

/**
 * Valider uniquement le payload d'un type donne.
 */
export function validatePayload<T extends MessageType>(
  type: T,
  payload: unknown
): ValidationResult {
  const schema = payloadSchemas[type];
  if (!schema) {
    return { success: false, error: `Unknown message type: ${type}` };
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message ?? 'Validation failed',
    };
  }

  return { success: true, data: result.data };
}
