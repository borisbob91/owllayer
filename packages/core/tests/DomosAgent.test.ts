import { describe, it, expect, vi } from 'vitest';
import { DomosAgent } from '../src/agent/DomosAgent.js';
import type { AgentIdentity, AgentMemorySnapshot, MemoryAdapter } from '../src/agent/agent.types.js';

class TestAdapter implements MemoryAdapter {
  public saveCalls = 0;
  private store = new Map<string, AgentMemorySnapshot>();

  async loadMemory(identity: AgentIdentity): Promise<AgentMemorySnapshot | null> {
    return this.store.get(identity.sessionId) ?? null;
  }

  async saveMemory(identity: AgentIdentity, snapshot: AgentMemorySnapshot): Promise<void> {
    this.saveCalls += 1;
    this.store.set(identity.sessionId, snapshot);
  }

  async deleteMemory(identity: AgentIdentity): Promise<void> {
    this.store.delete(identity.sessionId);
  }
}

describe('DomosAgent', () => {
  it('hydrate un snapshot existant', async () => {
    const adapter = new TestAdapter();
    await adapter.saveMemory(
      { sessionId: 'sess_1' },
      {
        schemaVersion: 1,
        session: [{ id: 'a', role: 'user', content: 'hello', timestamp: Date.now() }],
        persistent: { preferences: {}, objectives: [], history: [] },
        feedback: [],
        updatedAt: Date.now(),
      }
    );

    const agent = new DomosAgent({ adapter });
    await agent.init({ sessionId: 'sess_1' });
    expect(agent.getMemorySnapshot().session).toHaveLength(1);
  });

  it('met a jour la memoire et flush apres reponse', async () => {
    const adapter = new TestAdapter();
    const agent = new DomosAgent({ adapter, saveDebounceMs: 5 });
    await agent.init({ sessionId: 'sess_2' });

    agent.onUserRequest('bonjour');
    agent.onAgentResponse('salut');
    await new Promise((resolve) => setTimeout(resolve, 20));
    await agent.flush();

    const snapshot = agent.getMemorySnapshot();
    expect(snapshot.session).toHaveLength(2);
    expect(snapshot.session[0].role).toBe('user');
    expect(snapshot.session[1].role).toBe('assistant');
    expect(adapter.saveCalls).toBeGreaterThan(0);
  });

  it('ajoute le feedback et reset la memoire', async () => {
    const adapter = new TestAdapter();
    const agent = new DomosAgent({ adapter });
    await agent.init({ sessionId: 'sess_3' });

    agent.addFeedback({ type: 'positive', message: 'utile' });
    expect(agent.getMemorySnapshot().feedback).toHaveLength(1);

    agent.resetMemory('feedback');
    expect(agent.getMemorySnapshot().feedback).toHaveLength(0);
  });

  it('debounce les sauvegardes', async () => {
    vi.useFakeTimers();
    const adapter = new TestAdapter();
    const agent = new DomosAgent({ adapter, saveDebounceMs: 100 });
    await agent.init({ sessionId: 'sess_4' });

    agent.onUserRequest('a');
    agent.onUserRequest('b');
    agent.onUserRequest('c');
    vi.advanceTimersByTime(100);
    await agent.flush();

    expect(adapter.saveCalls).toBe(1);
    vi.useRealTimers();
  });
});
