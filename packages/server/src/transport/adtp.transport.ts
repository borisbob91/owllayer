import { WebSocketServer, WebSocket } from 'ws';
import { createServer, type IncomingMessage, type ServerResponse, type Server as HttpServer } from 'http';
import {
  decode,
  tryDecode,
  encode,
  createLogger,
  type ADTPMessage,
} from '@domos/core';
import type { Transport, TransportEvents, ConnectionId } from './Transport.js';

// Re-export pour compatibilite
export type { ConnectionId, TransportEvents } from './Transport.js';

const log = createLogger('DomOS:Transport');

export interface TransportOptions {
  /** Serveur HTTP existant (optionnel) */
  server?: HttpServer;
  /** Port si pas de serveur HTTP fourni */
  port?: number;
  /** Path WebSocket */
  path?: string;
  /** Intervalle de heartbeat en ms */
  heartbeatInterval?: number;
  /** Handler HTTP pour les requetes non-WebSocket (ex: admin API) */
  httpHandler?: (req: IncomingMessage, res: ServerResponse) => boolean;
  /** Nombre maximum de connexions WebSocket simultanées. Défaut: illimité. */
  maxConnections?: number;
}

/**
 * WebSocketTransport - Gere les connexions WebSocket ADTP.
 *
 * Responsabilites :
 * - Accepter les connexions
 * - Encoder/decoder les messages ADTP
 * - Heartbeat (ping/pong)
 * - Envoyer des messages a des connexions specifiques
 */
export class ADTPTransport implements Transport {
  private wss: WebSocketServer | null = null;
  private ownHttpServer: HttpServer | null = null;
  private connections = new Map<ConnectionId, WebSocket>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private connectionCounter = 0;
  private readonly maxConnections: number;

  constructor(
    private options: TransportOptions,
    private events: TransportEvents
  ) {
    this.maxConnections = options.maxConnections ?? Infinity;
  }

  /**
   * Demarrer le transport WebSocket.
   */
  start(): void {
    const wssOptions: Record<string, unknown> = {
      path: this.options.path || '/domos',
    };

    if (this.options.server) {
      wssOptions.server = this.options.server;
    } else {
      // Creer un serveur HTTP propre pour supporter a la fois WS et REST
      this.ownHttpServer = createServer();
      wssOptions.server = this.ownHttpServer;
    }

    this.wss = new WebSocketServer(wssOptions as any);

    // Attacher le handler HTTP pour les requetes non-WebSocket (admin API)
    if (this.options.httpHandler) {
      const handler = this.options.httpHandler;
      const httpServer = this.options.server || this.ownHttpServer!;
      httpServer.on('request', (req: IncomingMessage, res: ServerResponse) => {
        if (handler(req, res)) return;
        if (this.options.server) return;
        // Si pas geree par le handler, renvoyer 404
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
      });
    }

    // Demarrer le serveur HTTP si on l'a cree nous-memes
    if (this.ownHttpServer) {
      this.ownHttpServer.listen(this.options.port || 3000);
    }

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      if (this.connections.size >= this.maxConnections) {
        log.warn(`Connexion refusee: capacite maximale atteinte (${this.maxConnections})`);
        ws.close(1013, 'Server at capacity');
        return;
      }

      const connId = this.generateConnectionId();
      this.connections.set(connId, ws);

      log.info(`Nouvelle connexion: ${connId}`);
      this.events.onConnection(connId, req);

      ws.on('message', (data: Buffer | string) => {
        const raw = typeof data === 'string' ? data : data.toString('utf-8');
        const message = tryDecode(raw);

        if (!message) {
          log.warn(`Message invalide de ${connId}:`, raw.slice(0, 100));
          return;
        }

        this.events.onMessage(connId, message);
      });

      ws.on('close', (code: number, reason: Buffer) => {
        log.info(`Connexion fermee: ${connId} (code: ${code})`);
        this.connections.delete(connId);
        this.events.onClose(connId, code, reason.toString());
      });

      ws.on('error', (err: Error) => {
        log.error(`Erreur connexion ${connId}:`, err.message);
        this.events.onError(connId, err);
      });

      // Heartbeat pong
      ws.on('pong', () => {
        (ws as any).__alive = true;
      });
    });

    // Demarrer le heartbeat
    this.startHeartbeat();

    log.info(`Transport WebSocket demarre sur path: ${this.options.path || '/domos'}`);
  }

  /**
   * Envoyer un message ADTP a une connexion.
   */
  send(connId: ConnectionId, message: ADTPMessage): boolean {
    const ws = this.connections.get(connId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      log.warn(`Impossible d'envoyer a ${connId}: connexion fermee`);
      return false;
    }

    ws.send(encode(message));
    return true;
  }

  /**
   * Envoyer un message a toutes les connexions.
   */
  broadcast(message: ADTPMessage): void {
    const encoded = encode(message);
    for (const [connId, ws] of this.connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(encoded);
      }
    }
  }

  /**
   * Fermer une connexion.
   */
  close(connId: ConnectionId, code: number = 1000, reason: string = ''): void {
    const ws = this.connections.get(connId);
    if (ws) {
      ws.close(code, reason);
      this.connections.delete(connId);
    }
  }

  /**
   * Verifier si une connexion est active.
   */
  isConnected(connId: ConnectionId): boolean {
    const ws = this.connections.get(connId);
    return ws !== undefined && ws.readyState === WebSocket.OPEN;
  }

  /**
   * Nombre de connexions actives.
   */
  get connectionCount(): number {
    return this.connections.size;
  }

  /**
   * Arreter le transport.
   */
  async stop(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    for (const [connId, ws] of this.connections) {
      ws.close(1001, 'Server shutting down');
    }
    this.connections.clear();

    const wss = this.wss;
    this.wss = null;

    if (wss) {
      await new Promise<void>((resolve) => {
        wss.close(() => resolve());
      });
    }

    if (this.ownHttpServer) {
      const server = this.ownHttpServer;
      this.ownHttpServer = null;
      await new Promise<void>((resolve, reject) => {
        server.close((err?: Error) => err ? reject(err) : resolve());
      });
    }

    log.info('Transport WebSocket arrete');
  }

  private generateConnectionId(): ConnectionId {
    return `conn_${++this.connectionCounter}_${Date.now().toString(36)}`;
  }

  private startHeartbeat(): void {
    const interval = this.options.heartbeatInterval || 30_000;

    this.heartbeatTimer = setInterval(() => {
      for (const [connId, ws] of this.connections) {
        if ((ws as any).__alive === false) {
          log.warn(`Heartbeat timeout: ${connId}`);
          ws.terminate();
          this.connections.delete(connId);
          this.events.onClose(connId, 1006, 'Heartbeat timeout');
          continue;
        }

        (ws as any).__alive = false;
        ws.ping();
      }
    }, interval);
  }
}
