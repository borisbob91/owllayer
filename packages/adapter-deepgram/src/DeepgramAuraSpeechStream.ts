// ============================================================
// DeepgramAuraSpeechStream — flux de synthese vocale streaming (wss /v1/speak)
// Implemente `TTSSpeechStream` (core). A la difference de Flux, ce websocket
// n'envoie aucun message de confirmation initial : le flux passe a `ready`
// directement a l'ouverture du socket (recherche DG-5, verifie sur
// developers.deepgram.com/docs/tts-websocket-streaming). Un flux par appel a
// `DeepgramAuraTTS.openSpeechStream()` ; jamais reconnecte en interne
// (recherche R2/donnees-modele §5), comme Flux.
// ============================================================

import { EventEmitter, SpeechServiceError, type SpeechStreamState, type TTSSpeechStream } from '@owllayer/core';
import { createEvenByteAligner } from './audio.js';
import type {
  DeepgramAuraAnyEventListener,
  DeepgramAuraEventListener,
  DeepgramAuraEventMap,
  DeepgramAuraEventType,
} from './events.js';
import { handshakeHttpStatus, toSpeechServiceError } from './errors.js';
import { assertModelSupportsLanguage } from './language.js';
import { DEEPGRAM_AURA_MAX_TEXT_LENGTH, type DeepgramConnectionLimits } from './settings.js';
import { DeepgramWebSocketConnection } from './transport/DeepgramWebSocketConnection.js';
import type {
  SpeakClearedMessage,
  SpeakFlushedMessage,
  SpeakMetadataMessage,
  SpeakWarningMessage,
} from './protocol/speak.messages.js';

const SPEAK_WS_URL = 'wss://api.deepgram.com/v1/speak';

/** Dependances de construction, fournies par `DeepgramAuraTTS.openSpeechStream()`. */
export interface DeepgramAuraSpeechStreamOptions {
  apiKey: string;
  voice: string;
  language: string;
  sampleRate: number;
  speed: number;
  mipOptOut: boolean;
  limits: DeepgramConnectionLimits;
  onAudio: (audioBase64: string, mimeType: string) => void;
  onError: (error: SpeechServiceError) => void;
}

interface PendingAck {
  resolve: () => void;
  reject: (error: SpeechServiceError) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

/** Decoupe un texte en segments d'au plus `maxLength` caracteres, de preference sur un espace. */
function splitSpeakText(text: string, maxLength: number): string[] {
  const segments: string[] = [];
  let rest = text;
  while (rest.length > maxLength) {
    const cut = rest.lastIndexOf(' ', maxLength);
    const end = cut > 0 ? cut : maxLength;
    segments.push(rest.slice(0, end));
    rest = rest.slice(end);
  }
  if (rest.length > 0) {
    segments.push(rest);
  }
  return segments;
}

function buildSpeakUrl(params: { voice: string; sampleRate: number; speed: number; mipOptOut: boolean }): string {
  const url = new URL(SPEAK_WS_URL);
  url.searchParams.set('model', params.voice);
  url.searchParams.set('encoding', 'linear16');
  url.searchParams.set('sample_rate', String(params.sampleRate));
  url.searchParams.set('speed', String(params.speed));
  if (params.mipOptOut) {
    url.searchParams.set('mip_opt_out', 'true');
  }
  return url.toString();
}

export class DeepgramAuraSpeechStream implements TTSSpeechStream {
  private _state: SpeechStreamState = 'connecting';
  private readonly connection: DeepgramWebSocketConnection;
  private readonly onAudio: (audioBase64: string, mimeType: string) => void;
  private readonly onError: (error: SpeechServiceError) => void;
  private readonly emitter = new EventEmitter<DeepgramAuraEventMap>();
  private readonly limits: DeepgramConnectionLimits;
  private readonly outputMimeType: string;

  // Frames `Speak`/`Flush` emises avant l'ouverture, envoyees dans l'ordre a l'ouverture.
  private readonly textQueue: string[] = [];
  private aligner = createEvenByteAligner();
  // Porte de sortie : fermee entre l'envoi de `Clear` et la reception de
  // `Cleared`, pour ignorer l'audio deja en vol (contrat `interrupt()`).
  private outputGateClosed = false;

  private pendingFlush: PendingAck | undefined;
  private pendingInterrupt: PendingAck | undefined;
  private lastRequestId: string | undefined;
  private closeReason: 'client' | 'remote' | 'error' | 'timeout' | undefined;

  constructor(options: DeepgramAuraSpeechStreamOptions) {
    assertModelSupportsLanguage(options.voice, options.language);

    this.onAudio = options.onAudio;
    this.onError = options.onError;
    this.limits = options.limits;
    this.outputMimeType = `audio/pcm;rate=${options.sampleRate}`;

    const url = buildSpeakUrl({
      voice: options.voice,
      sampleRate: options.sampleRate,
      speed: options.speed,
      mipOptOut: options.mipOptOut,
    });

    this.connection = new DeepgramWebSocketConnection({
      url,
      apiKey: options.apiKey,
      openTimeoutMs: options.limits.openTimeoutMs,
      onOpen: () => this.handleOpen(),
      onJsonMessage: (message) => this.handleJsonMessage(message),
      onBinaryMessage: (data) => this.handleBinaryMessage(data),
      onClose: (code, reason) => this.handleClose(code, reason),
      onError: (error) => this.handleError(error),
    });
  }

  get state(): TTSSpeechStream['state'] {
    return this._state;
  }

  appendText(text: string): void {
    if (this._state === 'closed' || this._state === 'closing') {
      return;
    }
    // Deepgram refuse un texte de plus de 2000 caracteres (413) : envoi en plusieurs `Speak`.
    for (const segment of splitSpeakText(text, DEEPGRAM_AURA_MAX_TEXT_LENGTH)) {
      this.sendSpeak(segment);
    }
  }

  private sendSpeak(text: string): void {
    if (this._state === 'ready') {
      this.connection.send(JSON.stringify({ type: 'Speak', text }));
      return;
    }
    if (this.textQueue.length >= this.limits.maxQueuedTextSegments) {
      this.onError(
        toSpeechServiceError({
          kind: 'local',
          code: 'TEXT_QUEUE_FULL',
          message: 'Deepgram Aura text queue is full before the connection is ready.',
        }),
      );
      return;
    }
    this.textQueue.push(JSON.stringify({ type: 'Speak', text }));
  }

  async flush(): Promise<void> {
    if (this._state === 'closed' || this._state === 'closing') {
      throw toSpeechServiceError({
        kind: 'local',
        code: 'REMOTE_CLOSED',
        message: 'Deepgram Aura stream is closed; flush was not sent.',
      });
    }
    // `Flushed` ne porte pas d'identifiant de requete : un seul flush a la
    // fois, sinon l'accuse de reception serait attribue au mauvais appel.
    if (this.pendingFlush) {
      throw new SpeechServiceError(
        'flush: a previous flush is still waiting for its acknowledgement.',
        'deepgram',
        'INVALID_REQUEST',
      );
    }

    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingFlush = undefined;
        reject(toSpeechServiceError({ kind: 'timeout', operation: 'flush' }));
      }, this.limits.acknowledgementTimeoutMs);

      this.pendingFlush = { resolve, reject, timeoutId };
      // Avant l'ouverture, `Flush` suit les `Speak` en attente (jamais avant eux).
      if (this._state === 'ready') {
        this.connection.send(JSON.stringify({ type: 'Flush' }));
      } else {
        this.textQueue.push(JSON.stringify({ type: 'Flush' }));
      }
    });
  }

  async interrupt(): Promise<void> {
    if (this._state === 'closed' || this._state === 'closing') {
      throw toSpeechServiceError({
        kind: 'local',
        code: 'REMOTE_CLOSED',
        message: 'Deepgram Aura stream is closed; interrupt was not sent.',
      });
    }
    // Meme regle que `flush()` : `Cleared` ne porte pas d'identifiant de
    // requete non plus.
    if (this.pendingInterrupt) {
      throw new SpeechServiceError(
        'interrupt: a previous interrupt is still waiting for its acknowledgement.',
        'deepgram',
        'INVALID_REQUEST',
      );
    }

    // Barge-in immediat, avant tout accuse de reception : vide le texte en
    // attente et ferme la porte de sortie (l'audio deja en vol est ignore).
    // Un nouvel alignateur remplace l'ancien pour ne jamais recoller un
    // octet porte par l'audio maintenant abandonne a l'audio qui suivra.
    this.textQueue.length = 0;
    // Le segment en cours est abandonne : son `flush()` est termine, pas en echec.
    this.resolvePendingFlush();
    if (this._state !== 'ready') {
      // Rien n'a encore ete envoye : aucun `Clear` a demander.
      return;
    }
    this.outputGateClosed = true;
    this.aligner = createEvenByteAligner();

    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingInterrupt = undefined;
        // Sans `Cleared`, la porte ne doit pas rester fermee : l'audio suivant serait perdu.
        this.outputGateClosed = false;
        reject(toSpeechServiceError({ kind: 'timeout', operation: 'interrupt' }));
      }, this.limits.acknowledgementTimeoutMs);

      this.pendingInterrupt = { resolve, reject, timeoutId };
      this.connection.send(JSON.stringify({ type: 'Clear' }));
    });
  }

  async close(): Promise<void> {
    this.closeWithReason('client', true);
  }

  /** Abonnement type aux evenements d'observabilite (contrat public `on`/`onAny`). */
  on<TType extends DeepgramAuraEventType>(type: TType, listener: DeepgramAuraEventListener<TType>): () => void {
    return this.emitter.on(type, listener);
  }

  off<TType extends DeepgramAuraEventType>(type: TType, listener: DeepgramAuraEventListener<TType>): void {
    this.emitter.off(type, listener);
  }

  onAny(listener: DeepgramAuraAnyEventListener): () => void {
    return this.emitter.onAny(listener);
  }

  offAny(listener: DeepgramAuraAnyEventListener): void {
    this.emitter.offAny(listener);
  }

  private closeWithReason(reason: 'client' | 'remote' | 'error' | 'timeout', sendCloseFrame: boolean): void {
    if (this._state === 'closed' || this._state === 'closing') {
      return;
    }
    this._state = 'closing';
    this.closeReason = reason;
    if (sendCloseFrame) {
      this.connection.send(JSON.stringify({ type: 'Close' }));
    }
    this.connection.close();
  }

  private handleOpen(): void {
    // Pas de message "Connected" documente pour ce websocket : l'ouverture
    // du socket est directement le signal de disponibilite (a la difference
    // de Flux, verifie DG-5).
    this._state = 'ready';
    this.flushTextQueue();
  }

  private flushTextQueue(): void {
    for (const frame of this.textQueue) {
      this.connection.send(frame);
    }
    this.textQueue.length = 0;
  }

  private handleBinaryMessage(data: Buffer): void {
    if (this._state === 'closed' || this._state === 'closing' || this.outputGateClosed) {
      return;
    }
    const aligned = this.aligner(data);
    if (aligned.length > 0) {
      this.onAudio(aligned.toString('base64'), this.outputMimeType);
    }
  }

  private handleJsonMessage(message: unknown): void {
    const type = (message as { type?: string } | null)?.type;
    switch (type) {
      case 'Flushed':
        this.handleFlushed(message as SpeakFlushedMessage);
        return;
      case 'Cleared':
        this.handleCleared(message as SpeakClearedMessage);
        return;
      case 'Warning':
        this.handleWarning(message as SpeakWarningMessage);
        return;
      case 'Metadata':
        this.handleMetadata(message as SpeakMetadataMessage);
        return;
      default:
        return;
    }
  }

  private handleFlushed(_message: SpeakFlushedMessage): void {
    // Avant `Cleared`, un `Flushed` concerne un segment deja abandonne.
    if (this.outputGateClosed) {
      return;
    }
    if (this.resolvePendingFlush()) {
      this.emitter.emit('aura.speech.flushed', {});
    }
  }

  private resolvePendingFlush(): boolean {
    if (!this.pendingFlush) {
      return false;
    }
    clearTimeout(this.pendingFlush.timeoutId);
    const { resolve } = this.pendingFlush;
    this.pendingFlush = undefined;
    resolve();
    return true;
  }

  private handleCleared(_message: SpeakClearedMessage): void {
    this.outputGateClosed = false;
    if (!this.pendingInterrupt) {
      return;
    }
    clearTimeout(this.pendingInterrupt.timeoutId);
    const { resolve } = this.pendingInterrupt;
    this.pendingInterrupt = undefined;
    this.emitter.emit('aura.speech.interrupted', {});
    resolve();
  }

  private handleWarning(message: SpeakWarningMessage): void {
    // Redige : jamais la description brute du fournisseur (recherche R11 —
    // meme discipline que les erreurs), seulement son code le cas echeant.
    const suffix = message.code ? ` (${message.code})` : '';
    this.emitter.emit('aura.warning', { message: `Deepgram Aura reported a warning${suffix}.` });
  }

  private handleMetadata(message: SpeakMetadataMessage): void {
    if (message.request_id) {
      this.lastRequestId = message.request_id;
    }
  }

  private handleError(error: Error): void {
    const status = handshakeHttpStatus(error);
    if (this._state === 'connecting' && status !== undefined) {
      // Ouverture refusee (ex. cle invalide) : la fermeture 1006 qui suit n'est pas une coupure.
      this.closeReason = 'error';
      this.onError(toSpeechServiceError({ kind: 'http', status }));
      return;
    }
    if (this._state === 'connecting' && error.message.includes('timed out')) {
      this.closeReason = 'timeout';
      this.onError(toSpeechServiceError({ kind: 'timeout', operation: 'open' }));
      return;
    }
    this.emitter.emit('aura.error', { error, message: error.message });
  }

  private handleClose(code: number, reason: string): void {
    if (this._state === 'closed') {
      return;
    }
    this._state = 'closed';
    const finalReason = this.closeReason ?? 'remote';
    if (finalReason === 'remote') {
      this.onError(toSpeechServiceError({ kind: 'wsClose', code, requestId: this.lastRequestId }));
    }
    this.emitter.emit('aura.closed', { code, reason, fatal: finalReason !== 'client' });
    this.rejectPendingAcks();
    this.textQueue.length = 0;
    this.emitter.clear();
  }

  private rejectPendingAcks(): void {
    const closedError = (): SpeechServiceError =>
      toSpeechServiceError({
        kind: 'local',
        code: 'REMOTE_CLOSED',
        message: 'Deepgram Aura connection closed before the acknowledgement was received.',
      });
    if (this.pendingFlush) {
      clearTimeout(this.pendingFlush.timeoutId);
      const { reject } = this.pendingFlush;
      this.pendingFlush = undefined;
      reject(closedError());
    }
    if (this.pendingInterrupt) {
      clearTimeout(this.pendingInterrupt.timeoutId);
      const { reject } = this.pendingInterrupt;
      this.pendingInterrupt = undefined;
      reject(closedError());
    }
  }
}
