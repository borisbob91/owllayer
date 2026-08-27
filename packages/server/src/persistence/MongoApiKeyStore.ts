import { createLogger } from '@owllayer/core';
import type { ApiKeyStore, ApiKeyRecord } from './types.js';

const log = createLogger('OwlLayer:MongoApiKeyStore');

export interface MongoApiKeyStoreOptions {
  /** URI de connexion MongoDB */
  uri: string;
  /** Nom de la base (défaut: 'owllayer') */
  database?: string;
  /** Nom de la collection (défaut: 'api_keys') */
  collection?: string;
}

/**
 * MongoApiKeyStore — Persistance des API keys via MongoDB.
 *
 * Utilise le driver natif MongoDB (peer dependency optionnelle).
 *
 * @example
 * ```ts
 * const store = new MongoApiKeyStore({ uri: 'mongodb://localhost:27017' });
 * await store.connect();
 * const server = new OwlLayerServer({ apiKeyStore: store, ... });
 * ```
 */
export class MongoApiKeyStore implements ApiKeyStore {
  readonly name = 'mongodb';
  private client: any = null;
  private col: any = null;

  constructor(private mongoOptions: MongoApiKeyStoreOptions) {}

  async connect(): Promise<void> {
    const { MongoClient } = await import('mongodb');
    this.client = new MongoClient(this.mongoOptions.uri);
    await this.client.connect();

    const dbName = this.mongoOptions.database ?? 'owllayer';
    const colName = this.mongoOptions.collection ?? 'api_keys';
    this.col = this.client.db(dbName).collection(colName);

    await this.col.createIndex({ key: 1 }, { unique: true });
    log.info(`MongoApiKeyStore connected: ${dbName}.${colName}`);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.col = null;
      log.info('MongoApiKeyStore disconnected');
    }
  }

  async save(record: ApiKeyRecord): Promise<void> {
    this.ensureConnected();
    await this.col.updateOne(
      { key: record.key },
      { $set: record },
      { upsert: true }
    );
  }

  async load(key: string): Promise<ApiKeyRecord | null> {
    this.ensureConnected();
    const doc = await this.col.findOne({ key });
    if (!doc) return null;
    const { _id, ...record } = doc;
    return record as ApiKeyRecord;
  }

  async delete(key: string): Promise<void> {
    this.ensureConnected();
    await this.col.deleteOne({ key });
  }

  async list(): Promise<ApiKeyRecord[]> {
    this.ensureConnected();
    const docs = await this.col.find({}).sort({ createdAt: -1 }).toArray();
    return docs.map((doc: any) => {
      const { _id, ...record } = doc;
      return record as ApiKeyRecord;
    });
  }

  async hasKey(key: string): Promise<boolean> {
    this.ensureConnected();
    const count = await this.col.countDocuments({ key }, { limit: 1 });
    return count > 0;
  }

  private ensureConnected(): void {
    if (!this.col) throw new Error('MongoApiKeyStore is not connected. Call connect() first.');
  }
}
