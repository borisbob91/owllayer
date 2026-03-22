/**
 * tests/memory.test.ts
 *
 * Vérifie l'intégration de DomosAgent (mémoire standalone) dans BrowserDomOS :
 *  - init() avec memory.enabled crée un DomosAgent et injecte les préférences
 *  - getMemorySnapshot() retourne null si memory.enabled est absent
 *  - getMemorySnapshot() retourne un snapshot valide si activé
 *  - addFeedback() délègue à DomosAgent sans erreur
 *  - sendText() appelle onUserRequest sur DomosAgent
 *  - Les réponses agent appellent onAgentResponse sur DomosAgent
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock DomosAgent + DomOSClient
// ---------------------------------------------------------------------------

interface MockClient {
  _handlers: Record<string, (...a: unknown[]) => unknown>;
  simulateAgentResponse(text: string): void;
}

const mockClientRef = vi.hoisted(() => ({ current: null as MockClient | null }));
const mockAgentRef = vi.hoisted(() => ({
  current: null as {
    initCalled: boolean;
    flushCalled: boolean;
    userRequests: string[];
    agentResponses: string[];
    feedbacks: unknown[];
    snapshot: { session: unknown[]; persistent: { preferences: Record<string, unknown>; objectives: string[]; history: unknown[] }; feedback: unknown[] };
  } | null,
}));

vi.mock('@domos/core', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;

  class MockDomOSClient {
    _handlers: Record<string, (...a: unknown[]) => unknown> = {};

    constructor() {
      mockClientRef.current = this as unknown as MockClient;
    }

    on(handlers: Record<string, (...a: unknown[]) => unknown>) {
      Object.assign(this._handlers, handlers);
    }

    connect() { return Promise.resolve(); }
    destroy() {}
    disconnect() {}
    registerTool() {}
    unregisterTool() {}
    updateContext() {}
    sendText() {}
    get sessionId() { return null; }
    get isConnected() { return false; }

    simulateAgentResponse(text: string) {
      this._handlers['onAgentResponse']?.(text);
    }
  }

  class MockDomosAgent {
    private _snapshot = {
      session: [] as unknown[],
      persistent: { preferences: { theme: 'dark' } as Record<string, unknown>, objectives: [] as string[], history: [] as unknown[] },
      feedback: [] as unknown[],
    };

    constructor() {
      mockAgentRef.current = {
        initCalled: false,
        flushCalled: false,
        userRequests: [],
        agentResponses: [],
        feedbacks: [],
        snapshot: this._snapshot,
      };
    }

    async init() {
      mockAgentRef.current!.initCalled = true;
    }

    async flush() {
      mockAgentRef.current!.flushCalled = true;
    }

    getMemorySnapshot() {
      return this._snapshot;
    }

    onUserRequest(text: string) {
      mockAgentRef.current!.userRequests.push(text);
    }

    onAgentResponse(text: string) {
      mockAgentRef.current!.agentResponses.push(text);
    }

    addFeedback(fb: unknown) {
      mockAgentRef.current!.feedbacks.push(fb);
    }
  }

  return { ...actual, DomOSClient: MockDomOSClient, DomosAgent: MockDomosAgent };
});

import { BrowserDomOS } from '../src/runtime/BrowserDomOS.js';

const BASE = {
  apiKey: 'pk_test',
  endpoint: 'ws://localhost:4001/domos',
  autoConnect: false,
  widget: { enabled: false },
  hitl: { enabled: false },
  autoDiscovery: { enabled: false },
} as const;

let sdk: BrowserDomOS;

beforeEach(() => {
  sdk = new BrowserDomOS();
  mockAgentRef.current = null;
  localStorage.clear();
});

afterEach(() => {
  sdk.destroy();
  document.body.innerHTML = '';
  localStorage.clear();
});

// ---------------------------------------------------------------------------

describe('getMemorySnapshot() sans memory.enabled', () => {
  it('retourne null si memory n\'est pas active', async () => {
    await sdk.init(BASE);
    expect(sdk.getMemorySnapshot()).toBeNull();
  });
});

describe('DomosAgent — initialisation avec memory.enabled', () => {
  const CFG_WITH_MEM = {
    ...BASE,
    memory: { enabled: true, storageKey: 'test_domos_id' },
  };

  it('DomosAgent.init() est appele lors du init() SDK', async () => {
    await sdk.init(CFG_WITH_MEM);
    expect(mockAgentRef.current?.initCalled).toBe(true);
  });

  it('getMemorySnapshot() retourne un snapshot valide', async () => {
    await sdk.init(CFG_WITH_MEM);
    const snap = sdk.getMemorySnapshot();
    expect(snap).not.toBeNull();
    expect(snap!.persistent).toBeDefined();
    expect(snap!.persistent.preferences).toMatchObject({ theme: 'dark' });
  });

  it('persiste le sessionId dans localStorage', async () => {
    await sdk.init(CFG_WITH_MEM);
    const stored = localStorage.getItem('test_domos_id');
    expect(stored).toBeTruthy();
    expect(typeof stored).toBe('string');
  });

  it('reutilise le meme sessionId entre deux inits', async () => {
    localStorage.setItem('test_domos_id', 'reused_session_42');
    await sdk.init(CFG_WITH_MEM);
    // Le localStorage doit toujours contenir la meme valeur
    expect(localStorage.getItem('test_domos_id')).toBe('reused_session_42');
  });
});

describe('Alimentation de DomosAgent via sendText() et reponse agent', () => {
  const CFG_WITH_MEM = {
    ...BASE,
    memory: { enabled: true, storageKey: 'test_domos_id' },
  };

  it('sendText() appelle onUserRequest sur DomosAgent', async () => {
    await sdk.init(CFG_WITH_MEM);
    sdk.sendText('Bonjour agent');
    expect(mockAgentRef.current?.userRequests).toContain('Bonjour agent');
  });

  it('reponse agent appelle onAgentResponse sur DomosAgent', async () => {
    await sdk.init(CFG_WITH_MEM);
    mockClientRef.current!.simulateAgentResponse('Bonjour utilisateur');
    expect(mockAgentRef.current?.agentResponses).toContain('Bonjour utilisateur');
  });
});

describe('addFeedback()', () => {
  it('ne plante pas si memory n\'est pas active', async () => {
    await sdk.init(BASE);
    expect(() => sdk.addFeedback({ type: 'positive', message: 'Super' })).not.toThrow();
  });

  it('delègue a DomosAgent si actif', async () => {
    await sdk.init({ ...BASE, memory: { enabled: true, storageKey: 'test_domos_id' } });
    sdk.addFeedback({ type: 'negative', message: 'Trop lent', score: 2 });
    expect(mockAgentRef.current?.feedbacks).toHaveLength(1);
    expect(mockAgentRef.current!.feedbacks[0]).toMatchObject({ type: 'negative', message: 'Trop lent' });
  });
});
