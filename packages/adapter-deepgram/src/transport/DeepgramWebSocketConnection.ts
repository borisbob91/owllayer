// ============================================================
// DeepgramWebSocketConnection (interne, jamais exporte)
// Classe de connexion partagee par les trois protocoles websocket Deepgram
// (Flux, Aura streaming, Voice Agent) : authentification par en-tete,
// timeout d'ouverture, demultiplexage JSON/binaire, file d'envoi bornee
// avant ouverture, keepalive optionnel, fermeture idempotente.
// La cle API n'est jamais placee ailleurs que dans l'en-tete `Authorization`.
// ============================================================

import WebSocket from 'ws';

export type DeepgramConnectionState = 'connecting' | 'open' | 'closing' | 'closed';

export interface DeepgramWebSocketConnectionOptions {
  /** URL complete du websocket, sans la cle API (jamais dans l'URL). */
  url: string;
  /** Cle API Deepgram, envoyee uniquement via l'en-tete `Authorization: Token <cle>`. */
  apiKey: string;
  /** Delai maximum pour l'ouverture du socket (defaut 10000 ms). */
  openTimeoutMs?: number;
  /** Intervalle d'envoi d'un keepalive une fois la connexion ouverte (defaut : aucun keepalive). */
  keepAliveIntervalMs?: number;
  /** Frame keepalive a envoyer a chaque intervalle (appele a chaque tick). */
  buildKeepAliveFrame?: () => string;
  /** Nombre maximum de frames mises en attente avant l'ouverture (defaut 100). */
  maxQueuedSendFrames?: number;
  onOpen?: () => void;
  onJsonMessage?: (message: unknown) => void;
  onBinaryMessage?: (data: Buffer) => void;
  onClose?: (code: number, reason: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Connexion websocket Deepgram partagee. Ne connait aucun message de
 * protocole specifique : elle expose uniquement l'ouverture, l'envoi, la
 * reception demultiplexee et la fermeture idempotente. Le mapping vers des
 * codes d'erreur stables (`toSpeechServiceError`) est fait par l'appelant.
 */
export class DeepgramWebSocketConnection {
  private socket: WebSocket;
  private state: DeepgramConnectionState = 'connecting';
  private openTimer: ReturnType<typeof setTimeout> | undefined;
  private keepAliveTimer: ReturnType<typeof setInterval> | undefined;
  private readonly sendQueue: Array<string | Buffer> = [];
  private readonly maxQueuedSendFrames: number;
  private readonly options: DeepgramWebSocketConnectionOptions;

  constructor(options: DeepgramWebSocketConnectionOptions) {
    this.options = options;
    this.maxQueuedSendFrames = options.maxQueuedSendFrames ?? 100;

    this.socket = new WebSocket(options.url, {
      headers: { Authorization: `Token ${options.apiKey}` },
    });

    this.openTimer = setTimeout(() => {
      this.options.onError?.(new Error(`Deepgram connection open timed out after ${this.openTimeoutMs()}ms.`));
      this.terminate();
    }, this.openTimeoutMs());

    this.socket.on('open', () => {
      if (this.state !== 'connecting') {
        return;
      }
      this.clearOpenTimer();
      this.state = 'open';
      this.flushSendQueue();
      this.startKeepAlive();
      this.options.onOpen?.();
    });

    this.socket.on('message', (data: Buffer, isBinary: boolean) => {
      if (isBinary) {
        this.options.onBinaryMessage?.(data);
        return;
      }
      try {
        this.options.onJsonMessage?.(JSON.parse(data.toString('utf8')));
      } catch {
        this.options.onError?.(new Error('Received an unparsable JSON message from Deepgram.'));
      }
    });

    this.socket.on('close', (code: number, reason: Buffer) => {
      this.clearOpenTimer();
      this.stopKeepAlive();
      const wasClosed = this.state === 'closed';
      this.state = 'closed';
      if (!wasClosed) {
        this.options.onClose?.(code, reason?.toString('utf8') ?? '');
      }
    });

    this.socket.on('error', (err: unknown) => {
      this.options.onError?.(err instanceof Error ? err : new Error(String(err)));
    });
  }

  get readyState(): DeepgramConnectionState {
    return this.state;
  }

  /**
   * Envoie une frame (texte JSON deja serialise, ou binaire). Avant
   * l'ouverture, la frame est mise en file dans une limite bornee
   * (`maxQueuedSendFrames`) ; au-dela, la frame est rejetee et `onError` est
   * appele au lieu de grossir la file indefiniment.
   */
  send(frame: string | Buffer): void {
    if (this.state === 'closed' || this.state === 'closing') {
      return;
    }
    if (this.state === 'open') {
      this.socket.send(frame);
      return;
    }
    if (this.sendQueue.length >= this.maxQueuedSendFrames) {
      this.options.onError?.(new Error('Deepgram send queue is full before the connection opened.'));
      return;
    }
    this.sendQueue.push(frame);
  }

  /**
   * Ferme la connexion. Idempotent : un second appel ne fait rien et ne
   * declenche pas un second `onClose`. Libere le timer d'ouverture, le
   * keepalive et la file d'envoi.
   */
  close(): void {
    if (this.state === 'closed' || this.state === 'closing') {
      return;
    }
    this.state = 'closing';
    this.clearOpenTimer();
    this.stopKeepAlive();
    this.sendQueue.length = 0;
    try {
      this.socket.close();
    } catch {
      // La socket peut deja etre dans un etat non fermable ; on ignore.
    }
  }

  private terminate(): void {
    if (this.state === 'closed') {
      return;
    }
    this.state = 'closed';
    this.stopKeepAlive();
    this.sendQueue.length = 0;
    try {
      this.socket.terminate();
    } catch {
      // Ignore.
    }
  }

  private flushSendQueue(): void {
    while (this.sendQueue.length > 0) {
      const frame = this.sendQueue.shift();
      if (frame !== undefined) {
        this.socket.send(frame);
      }
    }
  }

  private startKeepAlive(): void {
    const interval = this.options.keepAliveIntervalMs;
    if (!interval || !this.options.buildKeepAliveFrame) {
      return;
    }
    this.keepAliveTimer = setInterval(() => {
      if (this.state === 'open') {
        this.send(this.options.buildKeepAliveFrame!());
      }
    }, interval);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = undefined;
    }
  }

  private clearOpenTimer(): void {
    if (this.openTimer) {
      clearTimeout(this.openTimer);
      this.openTimer = undefined;
    }
  }

  private openTimeoutMs(): number {
    return this.options.openTimeoutMs ?? 10000;
  }
}
