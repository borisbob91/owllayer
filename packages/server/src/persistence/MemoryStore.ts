import { createLogger } from '@owllayer/core';
import type { SessionStore, SessionData, StoreOptions } from './types.js';

const log = createLogger('OwlLayer:MemoryStore');

/**
 * MemoryStore — Store de sessions en memoire (defaut).
 *
 * Simple et sans dependance externe.
 * Les sessions sont perdues au redemarrage du serveur.
 *
 * @example
 * ```ts
 * const store = new MemoryStore();
 * await store.save({ id: 'sess_abc', ... });
 * const session = await store.load('sess_abc');
 * ```
 */
export class MemoryStore implements SessionStore {
  readonly name = 'memory';
  private sessions = new Map<string, SessionData>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private options: StoreOptions = {}) {
    const cleanupInterval = options.cleanupInterval ?? 3_600_000; // 1h par defaut
    if (cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        const ttl = this.options.sessionTTL ?? 86_400_000; // 24h
        this.cleanup(ttl).catch(() => {});
      }, cleanupInterval);
    }
    log.info('MemoryStore initialized');
  }

  async save(data: SessionData): Promise<void> {
    // Copie profonde pour eviter les mutations externes
    this.sessions.set(data.id, {
      ...data,
      messages: [...data.messages],
      context: { ...data.context },
    });
  }

  async load(sessionId: string): Promise<SessionData | null> {
    const data = this.sessions.get(sessionId);
    if (!data) return null;
    // Retourner une copie
    return {
      ...data,
      messages: [...data.messages],
      context: { ...data.context },
    };
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async list(apiKey?: string): Promise<SessionData[]> {
    const all = Array.from(this.sessions.values());
    if (apiKey) {
      return all.filter((s) => s.apiKey === apiKey);
    }
    return all;
  }

  async cleanup(maxAgeMs: number): Promise<number> {
    const now = Date.now();
    let count = 0;
    for (const [id, data] of this.sessions) {
      if (now - data.lastActivityAt > maxAgeMs) {
        this.sessions.delete(id);
        count++;
      }
    }
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
    this.sessions.clear();
  }
}
