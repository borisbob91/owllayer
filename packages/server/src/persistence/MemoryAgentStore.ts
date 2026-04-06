import { createLogger } from '@domos/core';
import type { AgentStore, AgentRecord } from './types.js';

const log = createLogger('DomOS:MemoryAgentStore');

/**
 * MemoryAgentStore — Store d'agents (system prompts) en mémoire (défaut).
 *
 * Les agents sont perdus au redémarrage du serveur.
 * Utilisez SQLiteAgentStore ou MongoAgentStore pour la persistance.
 */
export class MemoryAgentStore implements AgentStore {
  readonly name = 'memory';
  private records = new Map<string, AgentRecord>();

  async save(record: AgentRecord): Promise<void> {
    this.records.set(record.apiKey, { ...record });
    log.info(`Agent sauvegardé pour key: ${record.apiKey.slice(0, 8)}...`);
  }

  async load(apiKey: string): Promise<AgentRecord | null> {
    const record = this.records.get(apiKey);
    return record ? { ...record } : null;
  }

  async delete(apiKey: string): Promise<void> {
    this.records.delete(apiKey);
    log.info(`Agent supprimé pour key: ${apiKey.slice(0, 8)}...`);
  }

  async list(): Promise<AgentRecord[]> {
    return Array.from(this.records.values()).map(r => ({ ...r }));
  }
}
