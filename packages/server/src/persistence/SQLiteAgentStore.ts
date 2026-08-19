import { createRequire } from 'node:module';
import { createLogger } from '@owllayer/core';
import type { AgentStore, AgentRecord } from './types.js';

const log = createLogger('OwlLayer:SQLiteAgentStore');
const require = createRequire(import.meta.url);

export interface SQLiteAgentStoreOptions {
  /** Chemin vers le fichier SQLite (défaut: './data/owllayer.db') */
  path?: string;
  journalMode?: 'WAL' | 'DELETE';
}

/**
 * SQLiteAgentStore — Persistance des agents (system prompts) via SQLite.
 *
 * Utilise better-sqlite3 (déjà installé dans @owllayer/server).
 *
 * @example
 * ```ts
 * const store = new SQLiteAgentStore({ path: './data/owllayer.db' });
 * const server = new OwlLayerServer({ agentStore: store, ... });
 * ```
 */
export class SQLiteAgentStore implements AgentStore {
  readonly name = 'sqlite';
  private db: any;

  constructor(options: SQLiteAgentStoreOptions = {}) {
    const dbPath = options.path ?? './data/owllayer.db';
    let SQLiteCtor: any;
    try {
      SQLiteCtor = require('better-sqlite3');
    } catch (err) {
      throw new Error(`better-sqlite3 est requis pour SQLiteAgentStore: ${String(err)}`);
    }

    this.db = new SQLiteCtor(dbPath);
    const journalMode = options.journalMode ?? 'WAL';
    this.db.pragma(`journal_mode = ${journalMode}`);
    this.db.pragma('synchronous = NORMAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        api_key     TEXT PRIMARY KEY,
        prompt_json TEXT NOT NULL,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );
    `);
    log.info(`SQLiteAgentStore initialisé: ${dbPath}`);
  }

  async save(record: AgentRecord): Promise<void> {
    this.db.prepare(`
      INSERT INTO agents (api_key, prompt_json, created_at, updated_at)
      VALUES (@api_key, @prompt_json, @created_at, @updated_at)
      ON CONFLICT(api_key) DO UPDATE SET
        prompt_json = excluded.prompt_json,
        updated_at  = excluded.updated_at
    `).run({
      api_key: record.apiKey,
      prompt_json: JSON.stringify(record.prompt),
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    });
  }

  async load(apiKey: string): Promise<AgentRecord | null> {
    const row = this.db.prepare('SELECT * FROM agents WHERE api_key = ?').get(apiKey) as any;
    if (!row) return null;
    return this.rowToRecord(row);
  }

  async delete(apiKey: string): Promise<void> {
    this.db.prepare('DELETE FROM agents WHERE api_key = ?').run(apiKey);
  }

  async list(): Promise<AgentRecord[]> {
    const rows = this.db.prepare('SELECT * FROM agents ORDER BY created_at DESC').all() as any[];
    return rows.map(r => this.rowToRecord(r));
  }

  async disconnect(): Promise<void> {
    this.db.close();
  }

  private rowToRecord(row: any): AgentRecord {
    return {
      apiKey: row.api_key,
      prompt: JSON.parse(row.prompt_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
