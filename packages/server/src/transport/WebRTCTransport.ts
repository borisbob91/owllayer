import { createServer, type Server as HttpServer, type IncomingMessage, type ServerResponse } from 'http';
import { tryDecode, encode, createLogger, type ADTPMessage } from '@domos/core';
import type { Transport, TransportEvents, ConnectionId } from './Transport.js';

const log = createLogger('DomOS:WebRTC');

export interface WebRTCTransportOptions {
  /** Serveur HTTP existant pour le signaling (optionnel) */
  server?: HttpServer;
  /** Port pour le serveur de signaling */
  port?: number;
  /** Path pour le signaling REST */
  signalingPath?: string;
  /** ICE servers (STUN/TURN) */
  iceServers?: Array<{ urls: string; username?: string; credential?: string }>;
  /** Handler HTTP pour les requetes non-signaling (admin API, virtual lines, UI). */
  httpHandler?: (req: IncomingMessage, res: ServerResponse) => boolean;
}

/**
 * WebRTCTransport - Transport ADTP via WebRTC DataChannel.
 *
 * Utilise un endpoint HTTP pour le signaling (SDP offer/answer),
 * puis les messages ADTP transitent via un DataChannel fiable.
 *
 * Avantages vs WebSocket :
 * - Latence plus faible (UDP par defaut, NAT traversal)
 * - Audio/video natif via MediaStream (pour le mode Live)
 * - Peer-to-peer possible (pas de serveur intermediaire pour les donnees)
 *
 * NOTE : Necessite 'wrtc' (node-webrtc) comme peer dependency cote serveur.
 * ```bash
 * pnpm add wrtc
 * ```
 */
export class WebRTCTransport implements Transport {
  private httpServer: HttpServer | null = null;
  private ownsHttpServer = false;
  private connections = new Map<ConnectionId, any>(); // RTCPeerConnection
  private dataChannels = new Map<ConnectionId, any>(); // RTCDataChannel
  private connectionCounter = 0;

  constructor(
    private options: WebRTCTransportOptions,
    private events: TransportEvents
  ) {}

  start(): void {
    if (this.options.server) {
      this.httpServer = this.options.server;
    } else {
      this.httpServer = createServer();
      this.ownsHttpServer = true;
      this.httpServer.listen(this.options.port || 3001);
    }

    this.httpServer.on('request', (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const signalingPath = this.options.signalingPath || '/domos/rtc';

      // CORS preflight
      if (url.pathname === signalingPath && req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
      }

      if (url.pathname === signalingPath && req.method === 'POST') {
        this.handleSignaling(req, res);
        return;
      }

      if (this.options.httpHandler?.(req, res)) {
        return;
      }

      if (!this.options.server) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    });

    log.info(`WebRTC signaling sur path: ${this.options.signalingPath || '/domos/rtc'}`);
  }

  private async handleSignaling(req: IncomingMessage, res: ServerResponse): Promise<void> {
    let body = '';
    for await (const chunk of req) body += chunk;

    try {
      const { type, sdp, connId: existingConnId } = JSON.parse(body);

      if (type === 'offer') {
        const connId = existingConnId || this.generateConnectionId();

        // Import dynamique de wrtc (node-webrtc)
        const wrtc = await import('wrtc');
        const pc = new wrtc.RTCPeerConnection({
          iceServers: this.options.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        this.connections.set(connId, pc);

        // Ecouter le DataChannel cree par le client
        pc.ondatachannel = (event: any) => {
          const dc = event.channel;
          this.dataChannels.set(connId, dc);

          dc.onopen = () => {
            log.info(`DataChannel ouvert: ${connId}`);
            this.events.onConnection(connId, req);
          };

          dc.onmessage = (msgEvent: any) => {
            const message = tryDecode(msgEvent.data);
            if (message) {
              this.events.onMessage(connId, message);
            }
          };

          dc.onclose = () => {
            log.info(`DataChannel ferme: ${connId}`);
            this.cleanup(connId);
            this.events.onClose(connId, 1000, 'DataChannel closed');
          };

          dc.onerror = (err: any) => {
            this.events.onError(connId, new Error(String(err)));
          };
        };

        // ICE candidates collection
        const candidates: any[] = [];
        pc.onicecandidate = (event: any) => {
          if (event.candidate) candidates.push(event.candidate);
        };

        // Set remote offer, create answer
        await pc.setRemoteDescription({ type: 'offer', sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Attendre que les ICE candidates soient collectes
        await new Promise<void>((resolve) => {
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') resolve();
          };
          setTimeout(resolve, 3000);
        });

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify({
          type: 'answer',
          sdp: pc.localDescription?.sdp,
          connId,
          candidates,
        }));
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid signaling type' }));
      }
    } catch (err) {
      log.error('Signaling error:', String(err));
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Signaling error' }));
    }
  }

  send(connId: ConnectionId, message: ADTPMessage): boolean {
    const dc = this.dataChannels.get(connId);
    if (!dc || dc.readyState !== 'open') return false;

    dc.send(encode(message));
    return true;
  }

  broadcast(message: ADTPMessage): void {
    const encoded = encode(message);
    for (const [, dc] of this.dataChannels) {
      if (dc.readyState === 'open') {
        dc.send(encoded);
      }
    }
  }

  close(connId: ConnectionId, code = 1000, reason = ''): void {
    this.cleanup(connId);
  }

  isConnected(connId: ConnectionId): boolean {
    const dc = this.dataChannels.get(connId);
    return dc?.readyState === 'open';
  }

  get connectionCount(): number {
    return this.dataChannels.size;
  }

  async stop(): Promise<void> {
    for (const [connId] of this.connections) {
      this.cleanup(connId);
    }
    if (this.ownsHttpServer) {
      const server = this.httpServer;
      this.httpServer = null;
      if (server) {
        await new Promise<void>((resolve, reject) => {
          server.close((err?: Error) => err ? reject(err) : resolve());
        });
      }
    }
    log.info('WebRTC transport arrete');
  }

  private cleanup(connId: ConnectionId): void {
    const dc = this.dataChannels.get(connId);
    if (dc) {
      try { dc.close(); } catch {}
      this.dataChannels.delete(connId);
    }
    const pc = this.connections.get(connId);
    if (pc) {
      try { pc.close(); } catch {}
      this.connections.delete(connId);
    }
  }

  private generateConnectionId(): ConnectionId {
    return `rtc_${++this.connectionCounter}_${Date.now().toString(36)}`;
  }
}
