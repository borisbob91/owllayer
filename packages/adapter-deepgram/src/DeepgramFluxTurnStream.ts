// ============================================================
// DeepgramFluxTurnStream — flux STT oriente tours de parole (wss /v2/listen)
// Implemente `STTTurnStream` (core) et l'ajoute Deepgram `updateTurnDetection`
// (recherche R20.3 : mise a jour explicite plutot qu'un `configure()`
// generique). Un flux par appel a `DeepgramFluxSTT.openTurnStream()` ; jamais
// reconnecte en interne (recherche R2/donnees-modele §5).
// ============================================================

import { EventEmitter, SpeechServiceError, type SpeechStreamState, type STTTurnEvent, type STTTurnStream } from '@owllayer/core';
import { mimeTypeToDeepgramEncoding } from './audio.js';
import type {
  DeepgramFluxAnyEventListener,
  DeepgramFluxEventListener,
  DeepgramFluxEventMap,
  DeepgramFluxEventType,
} from './events.js';
import { handshakeHttpStatus, toSpeechServiceError } from './errors.js';
import { assertModelSupportsLanguage } from './language.js';
import type { DeepgramConnectionLimits } from './settings.js';
import { DeepgramWebSocketConnection } from './transport/DeepgramWebSocketConnection.js';
import type {
  FluxConfigureMessage,
  FluxConfigureFailureMessage,
  FluxConfigureSuccessMessage,
  FluxConnectedMessage,
  FluxFatalErrorMessage,
  FluxTurnInfoMessage,
} from './protocol/flux.messages.js';

const LISTEN_URL = 'wss://api.deepgram.com/v2/listen';

/** Mise a jour locale de la detection de fin de tour (`updateTurnDetection`). */
export interface DeepgramFluxTurnDetectionUpdate {
  endOfTurnThreshold?: number;
  tentativeEndOfTurnThreshold?: number;
  endOfTurnTimeoutMs?: number;
  /** Remplace entierement la liste courante (jamais fusionnee), max 100. */
  keyterms?: string[];
}

/** Dependances de construction, fournies par `DeepgramFluxSTT.openTurnStream()`. */
export interface DeepgramFluxTurnStreamOptions {
  apiKey: string;
  model: string;
  language: string;
  /** Deja filtre par l'appelant : vide sauf pour `flux-general-multi`. */
  languageHints: readonly string[];
  turnDetection: {
    endOfTurnThreshold: number;
    tentativeEndOfTurnThreshold?: number;
    endOfTurnTimeoutMs: number;
  };
  keyterms: readonly string[];
  mipOptOut: boolean;
  tags: readonly string[];
  limits: DeepgramConnectionLimits;
  mimeType: string;
  /** Surcharge par appel de la langue de construction (memes regles que Nova/Aura). */
  languageCode?: string;
  onEvent: (event: STTTurnEvent) => void;
}

interface PendingConfigure {
  resolve: () => void;
  reject: (error: SpeechServiceError) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

function buildFluxUrl(params: {
  model: string;
  encoding: string;
  sampleRate: number;
  eotThreshold: number;
  eagerEotThreshold?: number;
  eotTimeoutMs: number;
  keyterms: readonly string[];
  languageHints: readonly string[];
  mipOptOut: boolean;
  tags: readonly string[];
}): string {
  const url = new URL(LISTEN_URL);
  url.searchParams.set('model', params.model);
  url.searchParams.set('encoding', params.encoding);
  url.searchParams.set('sample_rate', String(params.sampleRate));
  url.searchParams.set('eot_threshold', String(params.eotThreshold));
  if (params.eagerEotThreshold !== undefined) {
    url.searchParams.set('eager_eot_threshold', String(params.eagerEotThreshold));
  }
  url.searchParams.set('eot_timeout_ms', String(params.eotTimeoutMs));
  for (const keyterm of params.keyterms) {
    url.searchParams.append('keyterm', keyterm);
  }
  for (const hint of params.languageHints) {
    url.searchParams.append('language_hint', hint);
  }
  if (params.mipOptOut) {
    url.searchParams.set('mip_opt_out', 'true');
  }
  for (const tag of params.tags) {
    url.searchParams.append('tag', tag);
  }
  return url.toString();
}

/** Valide localement une mise a jour de detection de fin de tour, avant tout envoi (FR pertinente : jamais de round-trip pour un rejet local previsible). */
function assertValidTurnDetectionUpdate(
  update: DeepgramFluxTurnDetectionUpdate,
  current: { endOfTurnThreshold: number; tentativeEndOfTurnThreshold?: number },
): void {
  if (update.endOfTurnThreshold !== undefined && (update.endOfTurnThreshold < 0.5 || update.endOfTurnThreshold > 1.0)) {
    throw new SpeechServiceError(
      'updateTurnDetection: endOfTurnThreshold must be between 0.5 and 1.0.',
      'deepgram',
      'INVALID_SETTINGS',
    );
  }
  if (
    update.tentativeEndOfTurnThreshold !== undefined &&
    (update.tentativeEndOfTurnThreshold < 0.3 || update.tentativeEndOfTurnThreshold > 0.9)
  ) {
    throw new SpeechServiceError(
      'updateTurnDetection: tentativeEndOfTurnThreshold must be between 0.3 and 0.9.',
      'deepgram',
      'INVALID_SETTINGS',
    );
  }
  if (update.endOfTurnTimeoutMs !== undefined && (update.endOfTurnTimeoutMs < 500 || update.endOfTurnTimeoutMs > 60000)) {
    throw new SpeechServiceError(
      'updateTurnDetection: endOfTurnTimeoutMs must be between 500 and 60000.',
      'deepgram',
      'INVALID_SETTINGS',
    );
  }
  const effectiveEndOfTurn = update.endOfTurnThreshold ?? current.endOfTurnThreshold;
  const effectiveTentative = update.tentativeEndOfTurnThreshold ?? current.tentativeEndOfTurnThreshold;
  if (effectiveTentative !== undefined && effectiveTentative > effectiveEndOfTurn) {
    throw new SpeechServiceError(
      'updateTurnDetection: tentativeEndOfTurnThreshold must be less than or equal to endOfTurnThreshold.',
      'deepgram',
      'INVALID_SETTINGS',
    );
  }
  if (update.keyterms !== undefined && update.keyterms.length > 100) {
    throw new SpeechServiceError('updateTurnDetection: keyterms accepts at most 100 entries.', 'deepgram', 'INVALID_SETTINGS');
  }
}

export class DeepgramFluxTurnStream implements STTTurnStream {
  private _state: SpeechStreamState = 'connecting';
  private readonly connection: DeepgramWebSocketConnection;
  private readonly onEvent: (event: STTTurnEvent) => void;
  private readonly emitter = new EventEmitter<DeepgramFluxEventMap>();
  private readonly limits: DeepgramConnectionLimits;

  private readonly audioQueue: Buffer[] = [];
  private queuedAudioBytes = 0;
  private readonly maxQueuedAudioBytes: number;

  private currentEndOfTurnThreshold: number;
  private currentTentativeEndOfTurnThreshold: number | undefined;

  private pendingConfigure: PendingConfigure | undefined;
  private closeReason: 'client' | 'remote' | 'error' | 'timeout' | undefined;

  constructor(options: DeepgramFluxTurnStreamOptions) {
    const language = options.languageCode ? options.languageCode : options.language;
    assertModelSupportsLanguage(options.model, language);

    const rawEncoding = mimeTypeToDeepgramEncoding(options.mimeType);
    if (!rawEncoding) {
      throw new SpeechServiceError(
        `Deepgram Flux only accepts raw PCM audio; unsupported mimeType "${options.mimeType}".`,
        'deepgram',
        'INVALID_REQUEST',
      );
    }

    this.onEvent = options.onEvent;
    this.limits = options.limits;
    this.currentEndOfTurnThreshold = options.turnDetection.endOfTurnThreshold;
    this.currentTentativeEndOfTurnThreshold = options.turnDetection.tentativeEndOfTurnThreshold;
    this.maxQueuedAudioBytes = rawEncoding.sampleRate * 2 * (options.limits.maxQueuedAudioMs / 1000);

    const url = buildFluxUrl({
      model: options.model,
      encoding: rawEncoding.encoding,
      sampleRate: rawEncoding.sampleRate,
      eotThreshold: options.turnDetection.endOfTurnThreshold,
      eagerEotThreshold: options.turnDetection.tentativeEndOfTurnThreshold,
      eotTimeoutMs: options.turnDetection.endOfTurnTimeoutMs,
      keyterms: options.keyterms,
      languageHints: options.model === 'flux-general-multi' ? options.languageHints : [],
      mipOptOut: options.mipOptOut,
      tags: options.tags,
    });

    this.connection = new DeepgramWebSocketConnection({
      url,
      apiKey: options.apiKey,
      openTimeoutMs: options.limits.openTimeoutMs,
      onJsonMessage: (message) => this.handleJsonMessage(message),
      onClose: (code, reason) => this.handleClose(code, reason),
      onError: (error) => this.handleError(error),
    });
  }

  get state(): STTTurnStream['state'] {
    return this._state;
  }

  sendAudio(audioBase64: string): void {
    if (this._state === 'closed' || this._state === 'closing') {
      return;
    }
    const chunk = Buffer.from(audioBase64, 'base64');
    if (this._state === 'ready') {
      this.connection.send(chunk);
      return;
    }
    if (this.queuedAudioBytes + chunk.length > this.maxQueuedAudioBytes) {
      this.emitStreamError(
        toSpeechServiceError({
          kind: 'local',
          code: 'AUDIO_QUEUE_FULL',
          message: 'Deepgram Flux audio queue is full before the connection is ready.',
        }),
        false,
      );
      return;
    }
    this.audioQueue.push(chunk);
    this.queuedAudioBytes += chunk.length;
  }

  async endAudioTurn(): Promise<void> {
    this.connection.send(JSON.stringify({ type: 'ForceEndTurn' }));
  }

  async updateTurnDetection(update: DeepgramFluxTurnDetectionUpdate): Promise<void> {
    assertValidTurnDetectionUpdate(update, {
      endOfTurnThreshold: this.currentEndOfTurnThreshold,
      tentativeEndOfTurnThreshold: this.currentTentativeEndOfTurnThreshold,
    });
    // Un flux ferme n'enverra plus rien : rejet immediat plutot qu'une attente jusqu'au timeout.
    if (this._state === 'closed' || this._state === 'closing') {
      throw toSpeechServiceError({
        kind: 'local',
        code: 'REMOTE_CLOSED',
        message: 'Deepgram Flux stream is closed; the configuration update was not sent.',
      });
    }
    // `ConfigureSuccess`/`ConfigureFailure` ne portent pas d'identifiant de requete :
    // une seule mise a jour a la fois, sinon l'acquittement serait attribue a la mauvaise.
    if (this.pendingConfigure) {
      throw new SpeechServiceError(
        'updateTurnDetection: a previous update is still waiting for its acknowledgement.',
        'deepgram',
        'INVALID_REQUEST',
      );
    }

    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingConfigure = undefined;
        reject(toSpeechServiceError({ kind: 'timeout', operation: 'configure' }));
      }, this.limits.acknowledgementTimeoutMs);

      this.pendingConfigure = { resolve, reject, timeoutId };

      const thresholds: Record<string, number> = {};
      if (update.endOfTurnThreshold !== undefined) {
        thresholds.eot_threshold = update.endOfTurnThreshold;
      }
      if (update.tentativeEndOfTurnThreshold !== undefined) {
        thresholds.eager_eot_threshold = update.tentativeEndOfTurnThreshold;
      }
      if (update.endOfTurnTimeoutMs !== undefined) {
        thresholds.eot_timeout_ms = update.endOfTurnTimeoutMs;
      }

      const message: FluxConfigureMessage = { type: 'Configure' };
      if (Object.keys(thresholds).length > 0) {
        message.thresholds = thresholds;
      }
      if (update.keyterms !== undefined) {
        message.keyterms = update.keyterms;
      }

      this.connection.send(JSON.stringify(message));
    });
  }

  async close(): Promise<void> {
    this.closeWithReason('client', true);
  }

  /** Abonnement type aux evenements d'observabilite (contrat public `on`/`onAny`). */
  on<TType extends DeepgramFluxEventType>(type: TType, listener: DeepgramFluxEventListener<TType>): () => void {
    return this.emitter.on(type, listener);
  }

  off<TType extends DeepgramFluxEventType>(type: TType, listener: DeepgramFluxEventListener<TType>): void {
    this.emitter.off(type, listener);
  }

  onAny(listener: DeepgramFluxAnyEventListener): () => void {
    return this.emitter.onAny(listener);
  }

  offAny(listener: DeepgramFluxAnyEventListener): void {
    this.emitter.offAny(listener);
  }

  private closeWithReason(reason: 'client' | 'remote' | 'error' | 'timeout', sendCloseStreamFrame: boolean): void {
    if (this._state === 'closed' || this._state === 'closing') {
      return;
    }
    this._state = 'closing';
    this.closeReason = reason;
    if (sendCloseStreamFrame) {
      this.connection.send(JSON.stringify({ type: 'CloseStream' }));
    }
    this.connection.close();
  }

  private flushAudioQueue(): void {
    for (const chunk of this.audioQueue) {
      this.connection.send(chunk);
    }
    this.audioQueue.length = 0;
    this.queuedAudioBytes = 0;
  }

  private handleJsonMessage(message: unknown): void {
    const type = (message as { type?: string } | null)?.type;
    switch (type) {
      case 'Connected': {
        void (message as FluxConnectedMessage);
        this._state = 'ready';
        this.flushAudioQueue();
        return;
      }
      case 'TurnInfo': {
        this.handleTurnInfo(message as FluxTurnInfoMessage);
        return;
      }
      case 'ConfigureSuccess': {
        this.handleConfigureSuccess(message as FluxConfigureSuccessMessage);
        return;
      }
      case 'ConfigureFailure': {
        this.handleConfigureFailure(message as FluxConfigureFailureMessage);
        return;
      }
      case 'FatalError':
      case 'Error': {
        this.handleFatalError(message as FluxFatalErrorMessage);
        return;
      }
      default:
        return;
    }
  }

  private handleTurnInfo(message: FluxTurnInfoMessage): void {
    const turnIndex = message.turn_index;
    switch (message.event) {
      case 'StartOfTurn':
        this.onEvent({ type: 'turn.started', turnIndex });
        this.emitter.emit('flux.turn.started', { turnIndex });
        return;
      case 'Update':
        this.onEvent({ type: 'transcript.partial', turnIndex, text: message.transcript ?? '' });
        return;
      case 'EagerEndOfTurn':
        this.onEvent({
          type: 'turn.tentative_end',
          turnIndex,
          text: message.transcript ?? '',
          confidence: message.end_of_turn_confidence,
        });
        this.emitter.emit('flux.turn.tentative_end', { turnIndex });
        return;
      case 'TurnResumed':
        this.onEvent({ type: 'turn.resumed', turnIndex });
        this.emitter.emit('flux.turn.resumed', { turnIndex });
        return;
      case 'EndOfTurn':
        this.onEvent({
          type: 'turn.ended',
          turnIndex,
          text: message.transcript ?? '',
          confidence: message.end_of_turn_confidence,
          languages: message.languages,
        });
        this.emitter.emit('flux.turn.ended', {
          turnIndex,
          confidence: message.end_of_turn_confidence,
          languages: message.languages,
        });
        return;
      default:
        return;
    }
  }

  private handleConfigureSuccess(message: FluxConfigureSuccessMessage): void {
    if (!this.pendingConfigure) {
      return;
    }
    clearTimeout(this.pendingConfigure.timeoutId);
    const { resolve } = this.pendingConfigure;
    this.pendingConfigure = undefined;
    if (message.thresholds?.eot_threshold !== undefined) {
      this.currentEndOfTurnThreshold = message.thresholds.eot_threshold;
    }
    if (message.thresholds?.eager_eot_threshold !== undefined) {
      this.currentTentativeEndOfTurnThreshold = message.thresholds.eager_eot_threshold;
    }
    this.emitter.emit('flux.turn_detection.updated', {
      endOfTurnThreshold: this.currentEndOfTurnThreshold,
      tentativeEndOfTurnThreshold: this.currentTentativeEndOfTurnThreshold,
    });
    resolve();
  }

  private handleConfigureFailure(_message: FluxConfigureFailureMessage): void {
    if (!this.pendingConfigure) {
      return;
    }
    clearTimeout(this.pendingConfigure.timeoutId);
    const { reject } = this.pendingConfigure;
    this.pendingConfigure = undefined;
    reject(toSpeechServiceError({ kind: 'configureFailure' }));
  }

  private handleFatalError(_message: FluxFatalErrorMessage): void {
    const error = toSpeechServiceError({
      kind: 'local',
      code: 'PROVIDER_UNAVAILABLE',
      message: 'Deepgram Flux reported a fatal error.',
    });
    this.emitStreamError(error, true);
    this.closeWithReason('error', false);
  }

  private handleError(error: Error): void {
    const status = handshakeHttpStatus(error);
    if (this._state === 'connecting' && status !== undefined) {
      // Ouverture refusee (ex. cle invalide) : la fermeture 1006 qui suit n'est pas une coupure.
      this.closeReason = 'error';
      this.emitStreamError(toSpeechServiceError({ kind: 'http', status }), true);
      return;
    }
    if (this._state === 'connecting' && error.message.includes('timed out')) {
      this.closeReason = 'timeout';
      this.emitStreamError(toSpeechServiceError({ kind: 'timeout', operation: 'open' }), true);
      return;
    }
    this.emitter.emit('flux.error', { error, message: error.message });
  }

  private handleClose(code: number, reason: string): void {
    if (this._state === 'closed') {
      return;
    }
    this._state = 'closed';
    const finalReason = this.closeReason ?? 'remote';
    if (finalReason === 'remote') {
      this.emitStreamError(toSpeechServiceError({ kind: 'wsClose', code }), true);
    }
    this.onEvent({ type: 'stream.closed', reason: finalReason });
    this.emitter.emit('flux.closed', { code, reason, fatal: finalReason !== 'client' });
    this.rejectPendingConfigure();
    this.emitter.clear();
  }

  private rejectPendingConfigure(): void {
    if (!this.pendingConfigure) {
      return;
    }
    clearTimeout(this.pendingConfigure.timeoutId);
    const { reject } = this.pendingConfigure;
    this.pendingConfigure = undefined;
    reject(
      toSpeechServiceError({
        kind: 'local',
        code: 'REMOTE_CLOSED',
        message: 'Deepgram Flux connection closed before the configuration update was acknowledged.',
      }),
    );
  }

  private emitStreamError(error: SpeechServiceError, fatal: boolean): void {
    this.onEvent({ type: 'stream.error', error, fatal });
    this.emitter.emit('flux.error', { error, message: error.message });
  }
}
