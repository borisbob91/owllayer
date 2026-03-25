import type { AgentIdentity, AgentMemorySnapshot, RemoteMemoryTransport } from '@domos/core';

function storageKey(identity: AgentIdentity, prefix: string): string {
  return `${prefix}:${identity.userId ?? 'anon'}:${identity.sessionId}`;
}

/**
 * LocalStorageTransport — implémentation localStorage de RemoteMemoryTransport.
 *
 * Utilisé par RemoteMemoryAdapter (core) pour persister la mémoire DomosAgent
 * entre les rechargements de page, sans serveur.
 *
 * Résistant aux erreurs de quota et aux environnements sans localStorage (SSR).
 */
export class LocalStorageTransport implements RemoteMemoryTransport {
  constructor(private readonly prefix: string = 'domos:agent-memory') {}

  async load(identity: AgentIdentity): Promise<AgentMemorySnapshot | null> {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(storageKey(identity, this.prefix));
      return raw ? (JSON.parse(raw) as AgentMemorySnapshot) : null;
    } catch {
      return null;
    }
  }

  async save(identity: AgentIdentity, snapshot: AgentMemorySnapshot): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(storageKey(identity, this.prefix), JSON.stringify(snapshot));
    } catch {
      // quota dépassé ou localStorage désactivé — no-op, pas bloquant
    }
  }

  async delete(identity: AgentIdentity): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(storageKey(identity, this.prefix));
    } catch {
      // no-op
    }
  }
}
