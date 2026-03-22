import type {
  AgentIdentity,
  AgentMemorySnapshot,
  MemoryAdapter,
} from './agent.types.js';

export interface RemoteMemoryTransport {
  load(identity: AgentIdentity): Promise<AgentMemorySnapshot | null>;
  save(identity: AgentIdentity, snapshot: AgentMemorySnapshot): Promise<void>;
  delete(identity: AgentIdentity): Promise<void>;
}

export interface RemoteMemoryAdapterOptions {
  transport: RemoteMemoryTransport;
  cacheKeyPrefix?: string;
}

function cacheKey(identity: AgentIdentity, prefix: string): string {
  return `${prefix}:${identity.userId ?? 'anon'}:${identity.sessionId}`;
}

export class RemoteMemoryAdapter implements MemoryAdapter {
  private readonly transport: RemoteMemoryTransport;
  private readonly cachePrefix: string;

  constructor(options: RemoteMemoryAdapterOptions) {
    this.transport = options.transport;
    this.cachePrefix = options.cacheKeyPrefix ?? 'domos:agent-memory';
  }

  async loadMemory(identity: AgentIdentity): Promise<AgentMemorySnapshot | null> {
    try {
      const remote = await this.transport.load(identity);
      if (remote) {
        this.writeLocalCache(identity, remote);
        return remote;
      }
      return this.readLocalCache(identity);
    } catch {
      return this.readLocalCache(identity);
    }
  }

  async saveMemory(identity: AgentIdentity, snapshot: AgentMemorySnapshot): Promise<void> {
    this.writeLocalCache(identity, snapshot);
    await this.transport.save(identity, snapshot);
  }

  async deleteMemory(identity: AgentIdentity): Promise<void> {
    this.deleteLocalCache(identity);
    await this.transport.delete(identity);
  }

  private readLocalCache(identity: AgentIdentity): AgentMemorySnapshot | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(cacheKey(identity, this.cachePrefix));
      return raw ? (JSON.parse(raw) as AgentMemorySnapshot) : null;
    } catch {
      return null;
    }
  }

  private writeLocalCache(identity: AgentIdentity, snapshot: AgentMemorySnapshot): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(cacheKey(identity, this.cachePrefix), JSON.stringify(snapshot));
    } catch {
      // no-op (quota or disabled storage)
    }
  }

  private deleteLocalCache(identity: AgentIdentity): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(cacheKey(identity, this.cachePrefix));
    } catch {
      // no-op
    }
  }
}
