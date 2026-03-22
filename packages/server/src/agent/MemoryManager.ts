import {
  createLogger,
  type AgentIdentity,
  type AgentMemorySnapshot,
  type MemorySummary,
} from '@domos/core';
import { SQLiteStore } from '../persistence/SQLiteStore.js';
import type {
  AgentMemoryConfig,
  AgentMemoryStore,
  MongoProviderConfig,
} from '../persistence/agentMemory.types.js';

const log = createLogger('DomOS:MemoryManager');

class InMemoryAgentStore implements AgentMemoryStore {
  readonly name = 'memory';
  private data = new Map<string, { identity: AgentIdentity; snapshot: AgentMemorySnapshot; updatedAt: number }>();

  async loadMemory(identity: AgentIdentity): Promise<AgentMemorySnapshot | null> {
    const entry = this.data.get(identity.sessionId);
    return entry ? JSON.parse(JSON.stringify(entry.snapshot)) as AgentMemorySnapshot : null;
  }

  async saveMemory(identity: AgentIdentity, snapshot: AgentMemorySnapshot): Promise<void> {
    this.data.set(identity.sessionId, {
      identity: { ...identity },
      snapshot: JSON.parse(JSON.stringify(snapshot)) as AgentMemorySnapshot,
      updatedAt: Date.now(),
    });
  }

  async deleteMemory(identity: AgentIdentity): Promise<void> {
    this.data.delete(identity.sessionId);
  }

  async listMemories(filter?: { userId?: string; updatedAfter?: number; limit?: number }): Promise<MemorySummary[]> {
    let rows = Array.from(this.data.entries()).map(([sessionId, row]) => ({
      sessionId,
      userId: row.identity.userId,
      updatedAt: row.updatedAt,
    }));
    if (filter?.userId) {
      rows = rows.filter((row) => row.userId === filter.userId);
    }
    const updatedAfter = filter?.updatedAfter;
    if (typeof updatedAfter === 'number') {
      rows = rows.filter((row) => row.updatedAt >= updatedAfter);
    }
    rows.sort((a, b) => b.updatedAt - a.updatedAt);
    if (typeof filter?.limit === 'number') {
      rows = rows.slice(0, Math.max(1, filter.limit));
    }
    return rows;
  }
}

class MongoAgentStore implements AgentMemoryStore {
  readonly name = 'mongo';
  private client: any = null;
  private collection: any = null;

  constructor(private config: MongoProviderConfig) {}

  async connect(): Promise<void> {
    const { MongoClient } = await import('mongodb');
    this.client = new MongoClient(this.config.uri);
    await this.client.connect();
    const db = this.client.db(this.config.database || 'domos');
    this.collection = db.collection(this.config.collection || 'agent_memory');
    await this.collection.createIndex({ sessionId: 1 }, { unique: true });
    await this.collection.createIndex({ userId: 1 });
    await this.collection.createIndex({ updatedAt: 1 });
  }

  async loadMemory(identity: AgentIdentity): Promise<AgentMemorySnapshot | null> {
    if (!this.collection) throw new Error('MongoAgentStore non connecte');
    const doc = await this.collection.findOne({ sessionId: identity.sessionId });
    return doc?.snapshot ?? null;
  }

  async saveMemory(identity: AgentIdentity, snapshot: AgentMemorySnapshot): Promise<void> {
    if (!this.collection) throw new Error('MongoAgentStore non connecte');
    await this.collection.updateOne(
      { sessionId: identity.sessionId },
      {
        $set: {
          sessionId: identity.sessionId,
          userId: identity.userId ?? null,
          snapshot,
          updatedAt: Date.now(),
        },
      },
      { upsert: true }
    );
  }

  async deleteMemory(identity: AgentIdentity): Promise<void> {
    if (!this.collection) throw new Error('MongoAgentStore non connecte');
    await this.collection.deleteOne({ sessionId: identity.sessionId });
  }

  async listMemories(filter?: { userId?: string; updatedAfter?: number; limit?: number }): Promise<MemorySummary[]> {
    if (!this.collection) throw new Error('MongoAgentStore non connecte');
    const query: Record<string, unknown> = {};
    if (filter?.userId) query.userId = filter.userId;
    const updatedAfter = filter?.updatedAfter;
    if (typeof updatedAfter === 'number') query.updatedAt = { $gte: updatedAfter };
    const limit = Math.max(1, filter?.limit ?? 100);
    const rows = await this.collection.find(query).sort({ updatedAt: -1 }).limit(limit).toArray();
    return rows.map((row: any) => ({
      sessionId: row.sessionId,
      userId: row.userId ?? undefined,
      updatedAt: row.updatedAt,
    }));
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.collection = null;
    }
  }
}

export class MemoryManager {
  private adapter: AgentMemoryStore;
  private config: AgentMemoryConfig;
  private initPromise: Promise<void> | null = null;
  private initialized = false;

  constructor(config?: AgentMemoryConfig) {
    this.config = config ?? { provider: 'memory' };
    this.adapter = this.createAdapter(this.config);
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const candidate = this.adapter as AgentMemoryStore & { connect?: () => Promise<void> };
      if (candidate.connect) {
        await candidate.connect();
      }
      this.initialized = true;
      const adapterName = typeof (this.adapter as any).name === 'string' ? (this.adapter as any).name : 'unknown';
      log.info(`Agent memory provider actif: ${adapterName}`);
    })();

    return this.initPromise;
  }

  getAdapter(): AgentMemoryStore {
    return this.adapter;
  }

  async loadMemory(identity: AgentIdentity): Promise<AgentMemorySnapshot | null> {
    return this.adapter.loadMemory(identity);
  }

  async saveMemory(identity: AgentIdentity, snapshot: AgentMemorySnapshot): Promise<void> {
    return this.adapter.saveMemory(identity, snapshot);
  }

  async deleteMemory(identity: AgentIdentity): Promise<void> {
    return this.adapter.deleteMemory(identity);
  }

  async listMemories(filter?: { userId?: string; updatedAfter?: number; limit?: number }): Promise<MemorySummary[]> {
    if (this.adapter.listMemories) {
      return this.adapter.listMemories(filter);
    }
    return [];
  }

  async close(): Promise<void> {
    await this.adapter.close?.();
  }

  private createAdapter(config: AgentMemoryConfig): AgentMemoryStore {
    switch (config.provider) {
      case 'memory':
        return new InMemoryAgentStore();
      case 'sqlite':
        return new SQLiteStore({
          path: config.sqlitePath,
          journalMode: config.journalMode,
        });
      case 'mongo':
        return new MongoAgentStore(config);
      default: {
        const exhaustivenessCheck: never = config;
        throw new Error(`Provider memoire inconnu: ${String(exhaustivenessCheck)}`);
      }
    }
  }
}
