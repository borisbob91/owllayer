import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';
import { SQLiteStore } from '../src/persistence/SQLiteStore.js';

const tempFiles: string[] = [];
const require = createRequire(import.meta.url);
const hasSQLite = (() => {
  try {
    require('better-sqlite3');
    return true;
  } catch {
    return false;
  }
})();

afterEach(() => {
  while (tempFiles.length > 0) {
    const file = tempFiles.pop();
    if (!file) break;
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
});

function createStore() {
  const dbPath = path.join(os.tmpdir(), `domos-memory-${Date.now()}-${Math.random()}.db`);
  tempFiles.push(dbPath);
  return new SQLiteStore({ path: dbPath });
}

const describeSQLite = hasSQLite ? describe : describe.skip;

describeSQLite('SQLiteStore', () => {
  it('save/load une memoire', async () => {
    const store = createStore();
    const identity = { sessionId: 'sess_sql_1', userId: 'u1' };
    await store.saveMemory(identity, {
      schemaVersion: 1,
      session: [],
      persistent: { preferences: { lang: 'fr' }, objectives: [], history: [] },
      feedback: [],
      updatedAt: Date.now(),
    });

    const loaded = await store.loadMemory(identity);
    expect(loaded?.persistent.preferences.lang).toBe('fr');
    await store.close();
  });

  it('upsert ecrase la valeur precedente', async () => {
    const store = createStore();
    const identity = { sessionId: 'sess_sql_2' };
    await store.saveMemory(identity, {
      schemaVersion: 1,
      session: [{ id: 'a', role: 'user', content: 'old', timestamp: Date.now() }],
      persistent: { preferences: {}, objectives: [], history: [] },
      feedback: [],
      updatedAt: Date.now(),
    });
    await store.saveMemory(identity, {
      schemaVersion: 1,
      session: [{ id: 'b', role: 'assistant', content: 'new', timestamp: Date.now() }],
      persistent: { preferences: {}, objectives: [], history: [] },
      feedback: [],
      updatedAt: Date.now(),
    });

    const loaded = await store.loadMemory(identity);
    expect(loaded?.session[0].content).toBe('new');
    await store.close();
  });

  it('delete supprime la memoire', async () => {
    const store = createStore();
    const identity = { sessionId: 'sess_sql_3' };
    await store.saveMemory(identity, {
      schemaVersion: 1,
      session: [],
      persistent: { preferences: {}, objectives: [], history: [] },
      feedback: [],
      updatedAt: Date.now(),
    });
    await store.deleteMemory(identity);
    const loaded = await store.loadMemory(identity);
    expect(loaded).toBeNull();
    await store.close();
  });

  it('retourne null si JSON invalide en base', async () => {
    const store = createStore() as any;
    store.db
      .prepare('INSERT INTO agent_memory (session_id, user_id, snapshot_json, updated_at) VALUES (?, ?, ?, ?)')
      .run('sess_bad_json', null, '{invalid', Date.now());

    const loaded = await store.loadMemory({ sessionId: 'sess_bad_json' });
    expect(loaded).toBeNull();
    await store.close();
  });
});
