import type { ConnectionId } from './Transport.js';

/**
 * Metadata d'une connexion.
 */
export interface ConnectionInfo {
  connId: ConnectionId;
  sessionId: string;
  apiKey: string;
  connectedAt: number;
  lastActivityAt: number;
  messageCount: number;
  userAgent?: string;
}

/**
 * ConnectionPool - Suivi des connexions actives et leurs metadonnees.
 */
export class ConnectionPool {
  private pool = new Map<ConnectionId, ConnectionInfo>();
  private sessionToConn = new Map<string, ConnectionId>();

  /**
   * Enregistrer une nouvelle connexion.
   */
  register(connId: ConnectionId, apiKey: string, sessionId: string, userAgent?: string): void {
    const info: ConnectionInfo = {
      connId,
      sessionId,
      apiKey,
      connectedAt: Date.now(),
      lastActivityAt: Date.now(),
      messageCount: 0,
      userAgent,
    };

    this.pool.set(connId, info);
    this.sessionToConn.set(sessionId, connId);
  }

  /**
   * Supprimer une connexion.
   */
  unregister(connId: ConnectionId): void {
    const info = this.pool.get(connId);
    if (info) {
      this.sessionToConn.delete(info.sessionId);
    }
    this.pool.delete(connId);
  }

  /**
   * Recuperer les infos d'une connexion.
   */
  get(connId: ConnectionId): ConnectionInfo | undefined {
    return this.pool.get(connId);
  }

  /**
   * Recuperer le connId a partir d'un sessionId.
   */
  getBySession(sessionId: string): ConnectionId | undefined {
    return this.sessionToConn.get(sessionId);
  }

  /**
   * Enregistrer une activite (met a jour lastActivityAt et messageCount).
   */
  recordActivity(connId: ConnectionId): void {
    const info = this.pool.get(connId);
    if (info) {
      info.lastActivityAt = Date.now();
      info.messageCount++;
    }
  }

  /**
   * Nombre de connexions actives.
   */
  get size(): number {
    return this.pool.size;
  }

  /**
   * Toutes les connexions actives.
   */
  getAll(): ConnectionInfo[] {
    return Array.from(this.pool.values());
  }

  /**
   * Compter les connexions par API key.
   */
  countByApiKey(apiKey: string): number {
    let count = 0;
    for (const info of this.pool.values()) {
      if (info.apiKey === apiKey) count++;
    }
    return count;
  }
}
