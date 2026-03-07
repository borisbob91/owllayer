import { AuthMiddleware, type ApiKeyValidator } from '../middleware/auth.js';
import { createLogger } from '@domos/core';
import type { ClientAuthOptions } from './types.js';

// Réexporter les types pour usage externe
export type { ClientAuthOptions };

const log = createLogger('DomOS:ClientAuth');

/**
 * Gestionnaire d'authentification client (API keys).
 * Wrapper autour de AuthMiddleware existant avec features additionnelles.
 */
export class ClientAuthManager {
  private auth: AuthMiddleware;
  private connectionCounts = new Map<string, number>();

  constructor(private options: ClientAuthOptions = {}) {
    this.auth = new AuthMiddleware();
    log.info('ClientAuth initialisé');
  }

  /**
   * Ajouter une/des API key(s) valide(s).
   */
  addKeys(...keys: string[]): void {
    this.auth.addKeys(...keys);
    log.info(`${keys.length} API key(s) ajoutée(s)`);
  }

  /**
   * Ajouter une seule API key (alias pour addKeys).
   */
  addKey(key: string): void {
    this.addKeys(key);
  }

  /**
   * Supprimer une API key.
   */
  removeKey(key: string): boolean {
    const removed = this.auth.removeKey(key);
    if (removed) {
      this.connectionCounts.delete(key);
      log.info(`API key supprimée: ${key.slice(0, 8)}...`);
    }
    return removed;
  }

  /**
   * Lister toutes les API keys enregistrées.
   */
  getKeys(): string[] {
    return this.auth.getKeys();
  }

  /**
   * Définir un validateur custom.
   */
  setValidator(validator: ApiKeyValidator): void {
    this.auth.setValidator(validator);
  }

  /**
   * Authentifier une connexion WebSocket.
   */
  async authenticate(req: any): Promise<{ authenticated: boolean; apiKey?: string; error?: string }> {
    // Si requireApiKey est false, autoriser sans vérification
    if (this.options.requireApiKey === false) {
      return { authenticated: true, apiKey: 'anonymous' };
    }

    const result = await this.auth.authenticate(req);
    
    if (result.authenticated && result.apiKey) {
      // Vérifier le nombre de connexions
      if (!this.checkConnectionLimit(result.apiKey)) {
        return {
          authenticated: false,
          error: `Trop de connexions simultanées pour cette API key (max: ${this.options.maxConnectionsPerKey || 10})`,
        };
      }
    }

    return result;
  }

  /**
   * Vérifier la limite de connexions par API key.
   */
  private checkConnectionLimit(apiKey: string): boolean {
    const maxConnections = this.options.maxConnectionsPerKey || 10;
    const currentCount = this.connectionCounts.get(apiKey) || 0;
    return currentCount < maxConnections;
  }

  /**
   * Enregistrer une nouvelle connexion pour une API key.
   * @returns Objet indiquant si la connexion est autorisée.
   */
  registerConnection(apiKey: string): { allowed: boolean; message?: string } {
    const maxConnections = this.options.maxConnectionsPerKey || 10;
    const current = this.connectionCounts.get(apiKey) || 0;

    if (current >= maxConnections) {
      return {
        allowed: false,
        message: `Max connections (${maxConnections}) atteint pour cette API key`,
      };
    }

    this.connectionCounts.set(apiKey, current + 1);
    return { allowed: true };
  }

  /**
   * Libérer une connexion pour une API key.
   */
  releaseConnection(apiKey: string): void {
    const current = this.connectionCounts.get(apiKey) || 0;
    if (current > 0) {
      this.connectionCounts.set(apiKey, current - 1);
    }
  }

  /**
   * Obtenir les statistiques client.
   */
  getStats() {
    const totalKeys = this.auth.getKeys().length;
    const activeKeys = Array.from(this.connectionCounts.entries())
      .filter(([_, count]) => count > 0)
      .length;

    return {
      totalApiKeys: totalKeys,
      activeApiKeys: activeKeys,
      connectionCounts: Object.fromEntries(this.connectionCounts),
    };
  }
}
