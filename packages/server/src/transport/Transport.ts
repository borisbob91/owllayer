import type { AITPMessage } from '@owllayer/core';

export type ConnectionId = string;

/**
 * Evenements emis par un transport.
 */
export interface TransportEvents {
  onConnection: (connId: ConnectionId, req: any) => void;
  onMessage: (connId: ConnectionId, message: AITPMessage) => void;
  onClose: (connId: ConnectionId, code: number, reason: string) => void;
  onError: (connId: ConnectionId, error: Error) => void;
}

/**
 * Interface abstraite pour un transport AITP.
 * Implementee par AITPTransport (WebSocket) et WebRTCTransport.
 */
export interface Transport {
  /** Demarrer le transport */
  start(): void;

  /** Arreter le transport */
  stop(): void | Promise<void>;

  /** Envoyer un message a une connexion */
  send(connId: ConnectionId, message: AITPMessage): boolean;

  /** Broadcast a toutes les connexions */
  broadcast(message: AITPMessage): void;

  /** Fermer une connexion */
  close(connId: ConnectionId, code?: number, reason?: string): void;

  /** Verifier si une connexion est active */
  isConnected(connId: ConnectionId): boolean;

  /** Nombre de connexions actives */
  readonly connectionCount: number;
}

/** Type de transport disponible */
export type TransportType = 'websocket' | 'webrtc';
