// ============================================================
// Erreurs Deepgram
// Traduit les echecs du fournisseur (HTTP, fermeture WebSocket,
// timeout, echec de Configure) en `SpeechServiceError` (core) avec
// des codes stables (recherche R11). Ne jamais inclure le corps de
// reponse du fournisseur ni la cle dans un message d'erreur.
// ============================================================

import { SpeechServiceError } from '@owllayer/core';

/** Codes d'erreur stables Deepgram (recherche R11). */
export type DeepgramErrorCode =
  | 'AUTH_FAILED'
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMITED'
  | 'INVALID_REQUEST'
  | 'PAYLOAD_TOO_LARGE'
  | 'PROVIDER_UNAVAILABLE'
  | 'TIMEOUT'
  | 'REMOTE_CLOSED'
  | 'INVALID_SETTINGS'
  | 'UNSUPPORTED_LANGUAGE'
  | 'UNSUPPORTED_PROVIDER'
  | 'AUDIO_QUEUE_FULL'
  | 'TEXT_QUEUE_FULL';

/** Codes consideres reessayables (recherche R11). */
const RETRYABLE_CODES: ReadonlySet<DeepgramErrorCode> = new Set([
  'RATE_LIMITED',
  'PROVIDER_UNAVAILABLE',
  'TIMEOUT',
  'REMOTE_CLOSED',
]);

/** Entree HTTP (REST `/v1/listen`, `/v1/speak`). */
export interface DeepgramHttpErrorInput {
  kind: 'http';
  status: number;
  requestId?: string;
}

/** Entree fermeture WebSocket inattendue. */
export interface DeepgramWsCloseErrorInput {
  kind: 'wsClose';
  code: number;
}

/** Entree timeout local (ouverture, handshake, accusé de reception). */
export interface DeepgramTimeoutErrorInput {
  kind: 'timeout';
  operation: string;
}

/** Entree `ConfigureFailure` (Flux) : les nouveaux seuils sont refuses. */
export interface DeepgramConfigureFailureErrorInput {
  kind: 'configureFailure';
}

/** Entree locale : erreur deja qualifiee par l'appelant (ex. validation locale). */
export interface DeepgramLocalErrorInput {
  kind: 'local';
  code: DeepgramErrorCode;
  message: string;
}

export type DeepgramErrorInput =
  | DeepgramHttpErrorInput
  | DeepgramWsCloseErrorInput
  | DeepgramTimeoutErrorInput
  | DeepgramConfigureFailureErrorInput
  | DeepgramLocalErrorInput;

/** Associe un identifiant de requete fournisseur a l'erreur qui l'a produit (jamais serialise sur l'erreur elle-meme). */
const requestIdsByError = new WeakMap<SpeechServiceError, string>();

function codeAndStatusForHttp(status: number): { code: DeepgramErrorCode; statusCode: number } {
  if (status === 401) return { code: 'AUTH_FAILED', statusCode: status };
  if (status === 402) return { code: 'QUOTA_EXCEEDED', statusCode: status };
  if (status === 403) return { code: 'AUTH_FAILED', statusCode: status };
  if (status === 413) return { code: 'PAYLOAD_TOO_LARGE', statusCode: status };
  if (status === 429) return { code: 'RATE_LIMITED', statusCode: status };
  if (status >= 500) return { code: 'PROVIDER_UNAVAILABLE', statusCode: status };
  return { code: 'INVALID_REQUEST', statusCode: status };
}

function codeForWsClose(code: number): DeepgramErrorCode {
  if (code === 1011) return 'PROVIDER_UNAVAILABLE';
  if (code === 1008) return 'INVALID_REQUEST';
  // 1005 (pas de statut) et tout autre code inattendu : la connexion a ete
  // perdue sans que le fournisseur ait annonce un probleme definitif.
  return 'REMOTE_CLOSED';
}

/**
 * Construit une `SpeechServiceError` (provider `deepgram`) a partir d'une
 * cause de bas niveau, avec un message stable qui n'expose jamais le corps
 * de reponse du fournisseur ni la cle API.
 */
export function toSpeechServiceError(input: DeepgramErrorInput): SpeechServiceError {
  let code: DeepgramErrorCode;
  let statusCode: number | undefined;
  let message: string;
  let requestId: string | undefined;

  switch (input.kind) {
    case 'http': {
      const mapped = codeAndStatusForHttp(input.status);
      code = mapped.code;
      statusCode = mapped.statusCode;
      message = `Deepgram request failed with HTTP ${input.status}.`;
      requestId = input.requestId;
      break;
    }
    case 'wsClose': {
      code = codeForWsClose(input.code);
      message = `Deepgram connection closed unexpectedly (code ${input.code}).`;
      break;
    }
    case 'timeout': {
      code = 'TIMEOUT';
      message = `Deepgram operation timed out: ${input.operation}.`;
      break;
    }
    case 'configureFailure': {
      code = 'INVALID_REQUEST';
      message = 'Deepgram rejected the turn-detection configuration update.';
      break;
    }
    case 'local': {
      code = input.code;
      message = input.message;
      break;
    }
  }

  const error = new SpeechServiceError(message, 'deepgram', code, statusCode);
  if (requestId) {
    requestIdsByError.set(error, requestId);
  }
  return error;
}

/**
 * Details exploitables d'une `SpeechServiceError` Deepgram : indicateur de
 * nouvelle tentative (derive uniquement du code, stable pour toute instance
 * portant ce code) et identifiant de requete fournisseur pour le support.
 */
export function getDeepgramErrorDetails(error: SpeechServiceError): {
  retryable: boolean;
  requestId?: string;
} {
  return {
    retryable: RETRYABLE_CODES.has(error.code as DeepgramErrorCode),
    requestId: requestIdsByError.get(error),
  };
}
