import { createLogger } from '@owllayer/core';
import type { SessionStore, SessionData, StoreOptions } from './types.js';

const log = createLogger('OwlLayer:MongoStore');

/**
 * Options pour MongoStore.
 */
export interface MongoStoreOptions extends StoreOptions {
  /** URI de connexion MongoDB */
  uri: string;

  /** Nom de la base (defaut: 'owllayer') */
  database?: string;

  /** Nom de la collection (defaut: 'sessions') */
  collection?: string;
}

/**
 * MongoStore — Persistence des sessions via MongoDB.
 *
 * Utilise le driver natif MongoDB (`mongodb` en peer dependency).
 * Les sessions survivent aux redemarrages du serveur.
 *
 * @example
 * ```ts
 * import { MongoStore } from '@owllayer/server';
 *
 * const store = new MongoStore({
 *   uri: 'mongodb://localhost:27017',
 *   database: 'owllayer',
 *   collection: 'sessions',
 *   sessionTTL: 24 * 60 * 60 * 1000, // 24h
 * });
 *
 * await store.connect();
 * ```
 */
export class MongoStore implements SessionStore {
  readonly name = 'mongodb';
  private client: any = null;
  private db: any = null;
  private col: any = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private mongoOptions: MongoStoreOptions) {}

  async connect(): Promise<void> {
    // Import dynamique du driver MongoDB (peer dependency)
    const { MongoClient } = await import('mongodb');

    this.client = new MongoClient(this.mongoOptions.uri);
    await this.client.connect();

    const dbName = this.mongoOptions.database || 'owllayer';
    const colName = this.mongoOptions.collection || 'sessions';

    this.db = this.client.db(dbName);
    this.col = this.db.collection(colName);

    // Creer les index
    await this.col.createIndex({ id: 1 }, { unique: true });
    await this.col.createIndex({ apiKey: 1 });
    await this.col.createIndex({ lastActivityAt: 1 });

    // Nettoyage periodique
    const cleanupInterval = this.mongoOptions.cleanupInterval ?? 3_600_000;
    if (cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        const ttl = this.mongoOptions.sessionTTL ?? 86_400_000;
        this.cleanup(ttl).catch((err) => log.error('Cleanup error:', String(err)));
      }, cleanupInterval);
    }

    log.info(`MongoStore connected: ${dbName}.${colName}`);
  }

  async save(data: SessionData): Promise<void> {
    if (!this.col) throw new Error('MongoStore is not connected. Call connect() first.');

    await this.col.updateOne(
      { id: data.id },
      { $set: data },
      { upsert: true }
    );
  }

  async load(sessionId: string): Promise<SessionData | null> {
    if (!this.col) throw new Error('MongoStore is not connected.');

    const doc = await this.col.findOne({ id: sessionId });
    if (!doc) return null;

    // Retirer les champs MongoDB internes
    const { _id, ...data } = doc;
    return data as SessionData;
  }

  async delete(sessionId: string): Promise<void> {
    if (!this.col) throw new Error('MongoStore is not connected.');
    await this.col.deleteOne({ id: sessionId });
  }

  async list(apiKey?: string): Promise<SessionData[]> {
    if (!this.col) throw new Error('MongoStore is not connected.');

    const filter = apiKey ? { apiKey } : {};
    const docs = await this.col.find(filter).sort({ lastActivityAt: -1 }).toArray();

    return docs.map((doc: any) => {
      const { _id, ...data } = doc;
      return data as SessionData;
    });
  }

  async cleanup(maxAgeMs: number): Promise<number> {
    if (!this.col) return 0;

    const cutoff = Date.now() - maxAgeMs;
    const result = await this.col.deleteMany({ lastActivityAt: { $lt: cutoff } });
    const count = result.deletedCount || 0;

    if (count > 0) {
      log.info(`Cleanup: ${count} expired session(s) removed`);
    }
    return count;
  }

  async disconnect(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.col = null;
      log.info('MongoStore disconnected');
    }
  }
}
