import { createRequire } from 'node:module';
import { createLogger, type AgentIdentity, type AgentMemorySnapshot } from '@owllayer/core';
import type { AgentMemoryStore } from './agentMemory.types.js';

const log = createLogger('OwlLayer:SQLiteStore');
const require = createRequire(import.meta.url);

export interface SQLiteStoreOptions {
  path?: string;
  journalMode?: 'WAL' | 'DELETE';
}

export class SQLiteStore implements AgentMemoryStore {
  readonly name = 'sqlite';
  private db: any;
  private closed = false;

  constructor(options: SQLiteStoreOptions = {}) {
    const dbPath = options.path ?? './data/owllayer-memory.db';
    let SQLiteCtor: any;
    try {
      SQLiteCtor = require('better-sqlite3');
    } catch (error) {
      throw new Error(`better-sqlite3 est requis pour SQLiteStore: ${String(error)}`);
    }

    this.db = new SQLiteCtor(dbPath);
    const journalMode = options.journalMode ?? 'WAL';
    this.db.pragma(`journal_mode = ${journalMode}`);
    this.db.pragma('synchronous = NORMAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_memory (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NULL,
        snapshot_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_agent_memory_user_id ON agent_memory(user_id);
      CREATE INDEX IF NOT EXISTS idx_agent_memory_updated_at ON agent_memory(updated_at);
    `);
  }

  async loadMemory(identity: AgentIdentity): Promise<AgentMemorySnapshot | null> {
    this.ensureOpen();
    const row = this.db
      .prepare(
        'SELECT snapshot_json FROM agent_memory WHERE session_id = ?'
      )
      .get(identity.sessionId) as { snapshot_json: string } | undefined;

    if (!row) {
      return null;
    }

    try {
      return JSON.parse(row.snapshot_json) as AgentMemorySnapshot;
    } catch (error) {
      log.warn(`Snapshot JSON invalide pour ${identity.sessionId}: ${String(error)}`);
      return null;
    }
  }

  async saveMemory(identity: AgentIdentity, snapshot: AgentMemorySnapshot): Promise<void> {
    this.ensureOpen();
    const now = Date.now();
    const payload = JSON.stringify(snapshot);
    this.db
      .prepare(`
        INSERT INTO agent_memory (session_id, user_id, snapshot_json, updated_at)
        VALUES (@session_id, @user_id, @snapshot_json, @updated_at)
        ON CONFLICT(session_id) DO UPDATE SET
          user_id = excluded.user_id,
          snapshot_json = excluded.snapshot_json,
          updated_at = excluded.updated_at
      `)
      .run({
        session_id: identity.sessionId,
        user_id: identity.userId ?? null,
        snapshot_json: payload,
        updated_at: now,
      });
  }

  async deleteMemory(identity: AgentIdentity): Promise<void> {
    this.ensureOpen();
    this.db
      .prepare('DELETE FROM agent_memory WHERE session_id = ?')
      .run(identity.sessionId);
  }

  async listMemories(filter?: { userId?: string; updatedAfter?: number; limit?: number }): Promise<Array<{ sessionId: string; userId?: string; updatedAt: number }>> {
    this.ensureOpen();
    const clauses: string[] = [];
    const params: Array<string | number> = [];

    if (filter?.userId) {
      clauses.push('user_id = ?');
      params.push(filter.userId);
    }
    if (typeof filter?.updatedAfter === 'number') {
      clauses.push('updated_at >= ?');
      params.push(filter.updatedAfter);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const limit = typeof filter?.limit === 'number' ? `LIMIT ${Math.max(1, filter.limit)}` : '';
    const rows = this.db
      .prepare(
        `SELECT session_id, user_id, updated_at FROM agent_memory ${where} ORDER BY updated_at DESC ${limit}`
      )
      .all(...params) as Array<{ session_id: string; user_id: string | null; updated_at: number }>;

    return rows.map((row) => ({
      sessionId: row.session_id,
      userId: row.user_id ?? undefined,
      updatedAt: row.updated_at,
    }));
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.db.close();
    this.closed = true;
  }

  private ensureOpen(): void {
    if (this.closed) {
      throw new Error('SQLiteStore est ferme');
    }
  }
}
