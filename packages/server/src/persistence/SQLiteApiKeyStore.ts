import { createRequire } from 'node:module';
import { createLogger } from '@domos/core';
import type { ApiKeyStore, ApiKeyRecord } from './types.js';

const log = createLogger('DomOS:SQLiteApiKeyStore');
const require = createRequire(import.meta.url);

export interface SQLiteApiKeyStoreOptions {
  /** Chemin vers le fichier SQLite (défaut: './data/domos.db') */
  path?: string;
  journalMode?: 'WAL' | 'DELETE';
}

/**
 * SQLiteApiKeyStore — Persistance des API keys via SQLite.
 *
 * Utilise better-sqlite3 (déjà installé dans @domos/server).
 *
 * @example
 * ```ts
 * const store = new SQLiteApiKeyStore({ path: './data/domos.db' });
 * const server = new DomOSServer({ apiKeyStore: store, ... });
 * ```
 */
export class SQLiteApiKeyStore implements ApiKeyStore {
  readonly name = 'sqlite';
  private db: any;

  constructor(options: SQLiteApiKeyStoreOptions = {}) {
    const dbPath = options.path ?? './data/domos.db';
    let SQLiteCtor: any;
    try {
      SQLiteCtor = require('better-sqlite3');
    } catch (err) {
      throw new Error(`better-sqlite3 est requis pour SQLiteApiKeyStore: ${String(err)}`);
    }

    this.db = new SQLiteCtor(dbPath);
    const journalMode = options.journalMode ?? 'WAL';
    this.db.pragma(`journal_mode = ${journalMode}`);
    this.db.pragma('synchronous = NORMAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        key         TEXT PRIMARY KEY,
        name        TEXT,
        description TEXT,
        client_type TEXT,
        created_at  INTEGER NOT NULL
      );
    `);
    this.ensureColumn('status', 'TEXT');
    this.ensureColumn('updated_at', 'INTEGER');
    this.ensureColumn('last_used_at', 'INTEGER');
    this.ensureColumn('revoked_at', 'INTEGER');
    this.ensureColumn('rotated_at', 'INTEGER');
    log.info(`SQLiteApiKeyStore initialisé: ${dbPath}`);
  }

  async save(record: ApiKeyRecord): Promise<void> {
    this.db.prepare(`
      INSERT INTO api_keys (
        key,
        name,
        description,
        client_type,
        created_at,
        status,
        updated_at,
        last_used_at,
        revoked_at,
        rotated_at
      )
      VALUES (
        @key,
        @name,
        @description,
        @client_type,
        @created_at,
        @status,
        @updated_at,
        @last_used_at,
        @revoked_at,
        @rotated_at
      )
      ON CONFLICT(key) DO UPDATE SET
        name         = excluded.name,
        description  = excluded.description,
        client_type  = excluded.client_type,
        status       = excluded.status,
        updated_at   = excluded.updated_at,
        last_used_at = excluded.last_used_at,
        revoked_at   = excluded.revoked_at,
        rotated_at   = excluded.rotated_at
    `).run({
      key: record.key,
      name: record.name ?? null,
      description: record.description ?? null,
      client_type: record.clientType ? JSON.stringify(record.clientType) : null,
      created_at: record.createdAt,
      status: record.status ?? 'active',
      updated_at: record.updatedAt ?? null,
      last_used_at: record.lastUsedAt ?? null,
      revoked_at: record.revokedAt ?? null,
      rotated_at: record.rotatedAt ?? null,
    });
  }

  async load(key: string): Promise<ApiKeyRecord | null> {
    const row = this.db.prepare('SELECT * FROM api_keys WHERE key = ?').get(key) as any;
    if (!row) return null;
    return this.rowToRecord(row);
  }

  async delete(key: string): Promise<void> {
    this.db.prepare('DELETE FROM api_keys WHERE key = ?').run(key);
  }

  async list(): Promise<ApiKeyRecord[]> {
    const rows = this.db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC').all() as any[];
    return rows.map(r => this.rowToRecord(r));
  }

  async hasKey(key: string): Promise<boolean> {
    const row = this.db.prepare('SELECT 1 FROM api_keys WHERE key = ?').get(key);
    return row !== undefined;
  }

  async disconnect(): Promise<void> {
    this.db.close();
  }

  private rowToRecord(row: any): ApiKeyRecord {
    return {
      key: row.key,
      name: row.name ?? undefined,
      description: row.description ?? undefined,
      clientType: row.client_type ? JSON.parse(row.client_type) : undefined,
      createdAt: row.created_at,
      status: row.status ?? 'active',
      updatedAt: row.updated_at ?? undefined,
      lastUsedAt: row.last_used_at ?? undefined,
      revokedAt: row.revoked_at ?? undefined,
      rotatedAt: row.rotated_at ?? undefined,
    };
  }

  private ensureColumn(name: string, type: string): void {
    const columns = this.db.prepare('PRAGMA table_info(api_keys)').all() as Array<{ name: string }>;
    if (columns.some((column) => column.name === name)) return;
    this.db.exec(`ALTER TABLE api_keys ADD COLUMN ${name} ${type}`);
  }
}
