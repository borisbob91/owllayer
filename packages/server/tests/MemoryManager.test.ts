import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';
import { MemoryManager } from '../src/persistence/MemoryManager.js';

const require = createRequire(import.meta.url);
const hasSQLite = (() => {
  try {
    require('better-sqlite3');
    return true;
  } catch {
    return false;
  }
})();

describe('MemoryManager', () => {
  it('selectionne provider memory par defaut', async () => {
    const manager = new MemoryManager();
    await manager.init();

    await manager.saveMemory(
      { sessionId: 'sess_mem_1' },
      {
        schemaVersion: 1,
        session: [],
        persistent: { preferences: { theme: 'light' }, objectives: [], history: [] },
        feedback: [],
        updatedAt: Date.now(),
      }
    );
    const loaded = await manager.loadMemory({ sessionId: 'sess_mem_1' });
    expect(loaded?.persistent.preferences.theme).toBe('light');
    await manager.close();
  });

  const sqliteIt = hasSQLite ? it : it.skip;
  sqliteIt('selectionne provider sqlite et persiste', async () => {
    const dbPath = path.join(os.tmpdir(), `domos-memory-manager-${Date.now()}.db`);
    const manager = new MemoryManager({
      provider: 'sqlite',
      sqlitePath: dbPath,
      journalMode: 'WAL',
    });
    await manager.init();

    await manager.saveMemory(
      { sessionId: 'sess_sql_mm', userId: 'u42' },
      {
        schemaVersion: 1,
        session: [],
        persistent: { preferences: { locale: 'fr' }, objectives: [], history: [] },
        feedback: [],
        updatedAt: Date.now(),
      }
    );
    const loaded = await manager.loadMemory({ sessionId: 'sess_sql_mm' });
    expect(loaded?.persistent.preferences.locale).toBe('fr');

    await manager.close();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });
});
