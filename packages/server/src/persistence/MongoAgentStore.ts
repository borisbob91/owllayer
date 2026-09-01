import { createLogger } from '@owllayer/core';
import type { AgentStore, AgentRecord } from './types.js';

const log = createLogger('OwlLayer:MongoAgentStore');

export interface MongoAgentStoreOptions {
  /** URI de connexion MongoDB */
  uri: string;
  /** Nom de la base (défaut: 'owllayer') */
  database?: string;
  /** Nom de la collection (défaut: 'agents') */
  collection?: string;
}

/**
 * MongoAgentStore — Persistance des agents (system prompts) via MongoDB.
 *
 * Utilise le driver natif MongoDB (peer dependency optionnelle).
 *
 * @example
 * ```ts
 * const store = new MongoAgentStore({ uri: 'mongodb://localhost:27017' });
 * await store.connect();
 * const server = new OwlLayerServer({ agentStore: store, ... });
 * ```
 */
export class MongoAgentStore implements AgentStore {
  readonly name = 'mongodb';
  private client: any = null;
  private col: any = null;

  constructor(private mongoOptions: MongoAgentStoreOptions) {}

  async connect(): Promise<void> {
    const { MongoClient } = await import('mongodb');
    this.client = new MongoClient(this.mongoOptions.uri);
    await this.client.connect();

    const dbName = this.mongoOptions.database ?? 'owllayer';
    const colName = this.mongoOptions.collection ?? 'agents';
    this.col = this.client.db(dbName).collection(colName);

    await this.col.createIndex({ apiKey: 1 }, { unique: true });
    log.info(`MongoAgentStore connected: ${dbName}.${colName}`);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.col = null;
      log.info('MongoAgentStore disconnected');
    }
  }

  async save(record: AgentRecord): Promise<void> {
    this.ensureConnected();
    await this.col.updateOne(
      { apiKey: record.apiKey },
      { $set: record },
      { upsert: true }
    );
  }

  async load(apiKey: string): Promise<AgentRecord | null> {
    this.ensureConnected();
    const doc = await this.col.findOne({ apiKey });
    if (!doc) return null;
    const { _id, ...record } = doc;
    return record as AgentRecord;
  }

  async delete(apiKey: string): Promise<void> {
    this.ensureConnected();
    await this.col.deleteOne({ apiKey });
  }

  async list(): Promise<AgentRecord[]> {
    this.ensureConnected();
    const docs = await this.col.find({}).sort({ createdAt: -1 }).toArray();
    return docs.map((doc: any) => {
      const { _id, ...record } = doc;
      return record as AgentRecord;
    });
  }

  private ensureConnected(): void {
    if (!this.col) throw new Error('MongoAgentStore is not connected. Call connect() first.');
  }
}
