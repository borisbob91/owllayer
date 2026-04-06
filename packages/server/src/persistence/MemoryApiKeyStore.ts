import { createLogger } from '@domos/core';
import type { ApiKeyStore, ApiKeyRecord } from './types.js';

const log = createLogger('DomOS:MemoryApiKeyStore');

/**
 * MemoryApiKeyStore — Store d'API keys en mémoire (défaut).
 *
 * Les clés sont perdues au redémarrage du serveur.
 * Utilisez SQLiteApiKeyStore ou MongoApiKeyStore pour la persistance.
 */
export class MemoryApiKeyStore implements ApiKeyStore {
  readonly name = 'memory';
  private records = new Map<string, ApiKeyRecord>();

  async save(record: ApiKeyRecord): Promise<void> {
    this.records.set(record.key, { ...record });
    log.info(`API key sauvegardée: ${record.key.slice(0, 8)}...`);
  }

  async load(key: string): Promise<ApiKeyRecord | null> {
    const record = this.records.get(key);
    return record ? { ...record } : null;
  }

  async delete(key: string): Promise<void> {
    this.records.delete(key);
    log.info(`API key supprimée: ${key.slice(0, 8)}...`);
  }

  async list(): Promise<ApiKeyRecord[]> {
    return Array.from(this.records.values()).map(r => ({ ...r }));
  }

  async hasKey(key: string): Promise<boolean> {
    return this.records.has(key);
  }
}
