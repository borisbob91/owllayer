/**
 * Constantes du protocole ADTP.
 */

export const AITP_VERSION = '1.0.0';

export const ADTP_VERSION = AITP_VERSION;

export const SDK_VERSION = '0.1.0';

/**
 * Codes d'erreur standardises.
 */
export enum ErrorCode {
  // Connexion
  UNAUTHORIZED = 'UNAUTHORIZED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  RATE_LIMITED = 'RATE_LIMITED',

  // Tools
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_ERROR = 'TOOL_EXECUTION_ERROR',
  TOOL_TIMEOUT = 'TOOL_TIMEOUT',
  TOOL_APPROVAL_DENIED = 'TOOL_APPROVAL_DENIED',

  // LLM
  LLM_ERROR = 'LLM_ERROR',
  LLM_TIMEOUT = 'LLM_TIMEOUT',
  LLM_RATE_LIMITED = 'LLM_RATE_LIMITED',

  // Protocol
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  UNKNOWN_MESSAGE_TYPE = 'UNKNOWN_MESSAGE_TYPE',

  // General
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Timeouts par defaut (en ms).
 */
export const DEFAULTS = {
  /** Timeout pour l'execution d'un tool cote client */
  TOOL_EXECUTION_TIMEOUT: 10_000,

  /** Timeout pour la reponse du LLM */
  LLM_RESPONSE_TIMEOUT: 30_000,

  /** Intervalle de heartbeat WebSocket */
  HEARTBEAT_INTERVAL: 30_000,

  /** Delai avant reconnexion automatique */
  RECONNECT_DELAY: 1_000,

  /** Nombre max de tentatives de reconnexion */
  MAX_RECONNECT_ATTEMPTS: 5,

  /** Taille max du contexte (en caracteres) */
  MAX_CONTEXT_SIZE: 50_000,

  /** Nombre max de tools actifs simultanes */
  MAX_ACTIVE_TOOLS: 30,
} as const;
