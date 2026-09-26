// ============================================================
// Fake websocket Deepgram pour les tests (T010)
// A utiliser avec `vi.mock('ws', () => ({ default: FakeDeepgramWebSocket }))`.
// Enregistre les frames envoyees, expose `open()`, `serverSend()`,
// `serverSendBinary()`, `serverClose()`, `serverError()`. Aucun reseau,
// aucune vraie cle.
// ============================================================

import { EventEmitter } from 'node:events';

export interface FakeDeepgramSocketOptions {
  headers?: Record<string, string>;
}

/**
 * Remplace `ws` en test. Reproduit la surface utilisee par
 * `DeepgramWebSocketConnection` : `send`, `close`, `terminate`, evenements
 * `open` / `message` / `close` / `error`.
 */
export class FakeDeepgramWebSocket extends EventEmitter {
  static instances: FakeDeepgramWebSocket[] = [];

  readonly url: string;
  readonly options: FakeDeepgramSocketOptions;
  readonly sent: Array<string | Buffer> = [];
  closed = false;
  terminated = false;
  /**
   * Quand true, `close()` marque la socket fermee sans emettre l'evenement
   * `close` (simule un `ws` reel dont la confirmation de fermeture peut
   * tarder, voire ne jamais arriver) — utilise pour prouver que
   * `DeepgramWebSocketConnection.close()` arrete le keepalive lui-meme,
   * independamment de tout evenement `close` du socket (T010/#107).
   */
  suppressCloseEvent = false;

  constructor(url: string, options: FakeDeepgramSocketOptions = {}) {
    super();
    this.url = url;
    this.options = options;
    FakeDeepgramWebSocket.instances.push(this);
  }

  send(data: string | Buffer): void {
    this.sent.push(data);
  }

  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    if (!this.suppressCloseEvent) {
      this.emit('close', 1000, Buffer.from(''));
    }
  }

  terminate(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.terminated = true;
    this.emit('close', 1006, Buffer.from('terminated'));
  }

  /** Simule l'ouverture de la connexion (evenement `open` de `ws`). */
  open(): void {
    this.emit('open');
  }

  /** Simule un message JSON envoye par Deepgram. */
  serverSend(payload: unknown): void {
    this.emit('message', Buffer.from(JSON.stringify(payload), 'utf8'), false);
  }

  /** Simule un chunk audio binaire envoye par Deepgram. */
  serverSendBinary(data: Buffer): void {
    this.emit('message', data, true);
  }

  /** Simule une fermeture initiee par le serveur Deepgram. */
  serverClose(code = 1000, reason = ''): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.emit('close', code, Buffer.from(reason, 'utf8'));
  }

  /** Simule une erreur reseau/socket cote serveur. */
  serverError(error: Error): void {
    this.emit('error', error);
  }
}

/** Reinitialise le registre d'instances entre deux tests (`beforeEach`). */
export function resetFakeDeepgramSockets(): void {
  FakeDeepgramWebSocket.instances.length = 0;
}

/** Derniere socket cree — pratique quand un seul flux est ouvert par test. */
export function lastFakeDeepgramSocket(): FakeDeepgramWebSocket {
  const socket = FakeDeepgramWebSocket.instances[FakeDeepgramWebSocket.instances.length - 1];
  if (!socket) {
    throw new Error('No FakeDeepgramWebSocket instance was created yet.');
  }
  return socket;
}
