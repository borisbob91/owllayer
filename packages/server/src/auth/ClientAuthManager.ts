import { AuthMiddleware, type ApiKeyValidator } from '../middleware/auth.js';
import { createLogger } from '@domos/core';
import type { ClientAuthOptions } from './types.js';
import type { ApiKeyStore, ApiKeyRecord } from '../persistence/types.js';
import { MemoryApiKeyStore } from '../persistence/MemoryApiKeyStore.js';

// Réexporter les types pour usage externe
export type { ClientAuthOptions };

const log = createLogger('DomOS:ClientAuth');

/**
 * Gestionnaire d'authentification client (API keys).
 * Wrapper autour de AuthMiddleware existant avec features additionnelles.
 * Supporte un ApiKeyStore pluggable (Memory, SQLite, MongoDB).
 */
export class ClientAuthManager {
  private auth: AuthMiddleware;
  private store: ApiKeyStore;
  private connectionCounts = new Map<string, number>();

  constructor(private options: ClientAuthOptions = {}, store?: ApiKeyStore) {
    this.auth = new AuthMiddleware();
    this.store = store ?? new MemoryApiKeyStore();
    log.info(`ClientAuth initialisé (store: ${this.store.name})`);
  }

  /**
   * Ajouter une/des API key(s) valide(s) (sans métadonnées).
   * Préférer addKey(record) pour les clés avec nom/description.
   */
  addKeys(...keys: string[]): void {
    const now = Date.now();
    for (const key of keys) {
      void this.store.save({ key, createdAt: now });
      this.auth.addKeys(key);
    }
    log.info(`${keys.length} API key(s) ajoutée(s)`);
  }

  /**
   * Ajouter une seule API key avec ses métadonnées.
   */
  async addKeyRecord(record: ApiKeyRecord): Promise<void> {
    await this.store.save(record);
    this.auth.addKeys(record.key);
    log.info(`API key enregistrée: ${record.key.slice(0, 8)}... (${record.name ?? 'sans nom'})`);
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
      void this.store.delete(key);
      this.connectionCounts.delete(key);
      log.info(`API key supprimée: ${key.slice(0, 8)}...`);
    }
    return removed;
  }

  /**
   * Lister toutes les API keys enregistrées (avec métadonnées).
   */
  async listKeys(): Promise<import('../persistence/types.js').ApiKeyRecord[]> {
    return this.store.list();
  }

  /**
   * Lister les valeurs brutes des API keys (rétrocompat).
   */
  getKeys(): string[] {
    return this.auth.getKeys();
  }

  /**
   * Exposer le store pour usage avancé (AdminAPI).
   */
  getStore(): ApiKeyStore {
    return this.store;
  }

  /**
   * Définir un validateur custom.
   */
  setValidator(validator: ApiKeyValidator): void {
    this.auth.setValidator(validator);
  }

  /**
   * Authentifier une connexion WebSocket.
   * Vérifie le store en priorité (source de vérité), puis le Set in-memory.
   */
  async authenticate(req: any): Promise<{ authenticated: boolean; apiKey?: string; error?: string }> {
    // Si requireApiKey est false, autoriser sans vérification
    if (this.options.requireApiKey === false) {
      return { authenticated: true, apiKey: 'anonymous' };
    }

    // Extraire la clé depuis la requête
    const result = await this.auth.authenticate(req);

    // Si le Set in-memory ne connaît pas la clé, vérifier le store (cas cold-start)
    if (!result.authenticated && result.error === 'API key invalide') {
      // Tenter d'extraire la clé manuellement pour vérifier le store
      const url = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
      const key = url.searchParams.get('apiKey')
        ?? (req.headers?.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.slice(7)
          : null);
      if (key && await this.store.hasKey(key)) {
        // Resync le Set in-memory
        this.auth.addKeys(key);
        // Vérifier connexions
        if (!this.checkConnectionLimit(key)) {
          return { authenticated: false, error: `Trop de connexions simultanées pour cette API key (max: ${this.options.maxConnectionsPerKey || 10})` };
        }
        return { authenticated: true, apiKey: key };
      }
    }

    if (result.authenticated && result.apiKey) {
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
