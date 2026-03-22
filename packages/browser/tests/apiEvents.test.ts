import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveSessionSnapshot, clearSessionSnapshot } from '../src/runtime/sessionPersistence.js';

// ---------------------------------------------------------------------------
// Mock DomOSClient — intercepte les handlers et expose des helpers de test
// ---------------------------------------------------------------------------

interface MockClient {
  _handlers: Record<string, (...a: unknown[]) => unknown>;
  _tools: Map<string, { declaration: unknown; handler: (args: Record<string, unknown>) => Promise<unknown> }>;
  simulateAgentResponse(text: string): void;
  simulateStateChange(state: string): void;
  simulateError(err: Error): void;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
}

const mockClientRef = vi.hoisted(() => ({ current: null as MockClient | null }));

vi.mock('@domos/core', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;

  class MockDomOSClient {
    _handlers: Record<string, (...a: unknown[]) => unknown> = {};
    _tools = new Map<string, { declaration: unknown; handler: (args: Record<string, unknown>) => Promise<unknown> }>();

    constructor() {
      // Expose cette instance aux tests
      mockClientRef.current = this as unknown as MockClient;
    }

    on(handlers: Record<string, (...a: unknown[]) => unknown>) {
      Object.assign(this._handlers, handlers);
    }

    connect() { return Promise.resolve(); }
    destroy() {}
    disconnect() {}

    registerTool(tool: { declaration: { name: string }; handler: (args: Record<string, unknown>) => Promise<unknown> }) {
      this._tools.set(tool.declaration.name, tool);
    }

    unregisterTool(name: string) { this._tools.delete(name); }
    updateContext() {}
    sendText() {}
    syncToolsWithServer() {}

    get sessionId() { return null; }
    get isConnected() { return false; }

    // --- Helpers de simulation ---
    simulateAgentResponse(text: string) {
      this._handlers['onAgentResponse']?.(text, true);
    }
    simulateStateChange(state: string) {
      this._handlers['onStateChange']?.(state);
    }
    simulateError(err: Error) {
      this._handlers['onError']?.(err);
    }
    async callTool(name: string, args: Record<string, unknown>) {
      const tool = this._tools.get(name);
      return tool?.handler(args);
    }
  }

  return { ...actual, DomOSClient: MockDomOSClient };
});

// Importer APRES le mock pour que BrowserDomOS utilise MockDomOSClient
import { BrowserDomOS } from '../src/runtime/BrowserDomOS.js';

// ---------------------------------------------------------------------------
// Config de base — pas de connexion, pas d'UI
// ---------------------------------------------------------------------------

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
});

afterEach(() => {
  sdk.destroy();
  document.body.innerHTML = '';
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// getSession()
// ---------------------------------------------------------------------------

describe('getSession()', () => {
  it('retourne disconnected et messageCount=0 avant init', () => {
    const s = sdk.getSession();
    expect(s.sessionId).toBeNull();
    expect(s.status).toBe('disconnected');
    expect(s.messageCount).toBe(0);
  });

  it('retourne connected apres init (initialized=true)', async () => {
    await sdk.init(BASE);
    const s = sdk.getSession();
    expect(s.status).toBe('connected');
    expect(s.messageCount).toBe(0);
  });

  it('incremente messageCount apres une reponse agent', async () => {
    await sdk.init(BASE);
    mockClientRef.current!.simulateAgentResponse('Bonjour');
    expect(sdk.getSession().messageCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// onResponse()
// ---------------------------------------------------------------------------

describe('onResponse()', () => {
  it('appelle le callback avec (text, done=true) quand agent repond', async () => {
    await sdk.init(BASE);
    const cb = vi.fn();
    sdk.onResponse(cb);

    mockClientRef.current!.simulateAgentResponse('Réponse ici');

    expect(cb).toHaveBeenCalledWith('Réponse ici', true);
  });

  it('supporte plusieurs callbacks onResponse', async () => {
    await sdk.init(BASE);
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    sdk.onResponse(cb1);
    sdk.onResponse(cb2);

    mockClientRef.current!.simulateAgentResponse('Multi');

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it('appelle chaque callback pour chaque reponse successive', async () => {
    await sdk.init(BASE);
    const cb = vi.fn();
    sdk.onResponse(cb);

    mockClientRef.current!.simulateAgentResponse('R1');
    mockClientRef.current!.simulateAgentResponse('R2');

    expect(cb).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// onError()
// ---------------------------------------------------------------------------

describe('onError()', () => {
  it('appelle le callback quand le client emet une erreur', async () => {
    await sdk.init(BASE);
    const cb = vi.fn();
    sdk.onError(cb);

    const err = new Error('connexion perdue');
    mockClientRef.current!.simulateError(err);

    expect(cb).toHaveBeenCalledWith(err);
  });

  it('accepte le callback passe via config.onError', async () => {
    const cb = vi.fn();
    await sdk.init({ ...BASE, onError: cb });

    const err = new Error('erreur init');
    mockClientRef.current!.simulateError(err);

    expect(cb).toHaveBeenCalledWith(err);
  });

  it('supporte plusieurs callbacks onError', async () => {
    await sdk.init(BASE);
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    sdk.onError(cb1);
    sdk.onError(cb2);

    mockClientRef.current!.simulateError(new Error('boom'));

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// onReady()
// ---------------------------------------------------------------------------

describe('onReady()', () => {
  it('appelle le callback au premier etat connected', async () => {
    await sdk.init(BASE);
    const cb = vi.fn();
    sdk.onReady(cb);

    mockClientRef.current!.simulateStateChange('connected');

    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('ne se declenche pas une deuxieme fois — fire once', async () => {
    await sdk.init(BASE);
    const cb = vi.fn();
    sdk.onReady(cb);

    mockClientRef.current!.simulateStateChange('connected');
    mockClientRef.current!.simulateStateChange('connected'); // reconnexion simulee

    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('ne se declenche pas sur les autres etats', async () => {
    await sdk.init(BASE);
    const cb = vi.fn();
    sdk.onReady(cb);

    mockClientRef.current!.simulateStateChange('thinking');
    mockClientRef.current!.simulateStateChange('error');
    mockClientRef.current!.simulateStateChange('disconnected');

    expect(cb).not.toHaveBeenCalled();
  });

  it('accepte le callback passe via config.onReady', async () => {
    const cb = vi.fn();
    await sdk.init({ ...BASE, onReady: cb });

    mockClientRef.current!.simulateStateChange('connected');

    expect(cb).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// onToolCall()
// ---------------------------------------------------------------------------

describe('onToolCall()', () => {
  it('appelle le callback AVANT le handler du tool', async () => {
    await sdk.init(BASE);
    const order: string[] = [];

    sdk.onToolCall((name) => { order.push(`event:${name}`); });
    sdk.registerTool('my_tool', {
      description: 'test',
      handler: async () => { order.push('handler'); return 'ok'; },
    });

    await mockClientRef.current!.callTool('my_tool', {});

    expect(order[0]).toBe('event:my_tool');
    expect(order[1]).toBe('handler');
  });

  it('passe le nom et les args au callback', async () => {
    await sdk.init(BASE);
    const cb = vi.fn();
    sdk.onToolCall(cb);

    sdk.registerTool('arg_tool', {
      description: 'test',
      handler: async () => 'ok',
    });

    await mockClientRef.current!.callTool('arg_tool', { param: 'valeur', n: 42 });

    expect(cb).toHaveBeenCalledWith('arg_tool', { param: 'valeur', n: 42 });
  });

  it('supporte plusieurs callbacks onToolCall', async () => {
    await sdk.init(BASE);
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    sdk.onToolCall(cb1);
    sdk.onToolCall(cb2);

    sdk.registerTool('multi_tool', {
      description: 'test',
      handler: async () => 'ok',
    });

    await mockClientRef.current!.callTool('multi_tool', {});

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// setContext() vs updateContext()
// ---------------------------------------------------------------------------

describe('setContext() et updateContext()', () => {
  it('setContext ne leve pas d erreur', async () => {
    await sdk.init(BASE);
    expect(() => sdk.setContext({ a: 1, b: 2 })).not.toThrow();
  });

  it('updateContext ne leve pas d erreur', async () => {
    await sdk.init(BASE);
    expect(() => sdk.updateContext({ extra: true })).not.toThrow();
  });

  it('les deux methodes existent sur DomOS', async () => {
    await sdk.init(BASE);
    expect(typeof sdk.setContext).toBe('function');
    expect(typeof sdk.updateContext).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// disconnect()
// ---------------------------------------------------------------------------

describe('disconnect()', () => {
  it('ne leve pas d erreur apres init', async () => {
    await sdk.init(BASE);
    expect(() => sdk.disconnect()).not.toThrow();
  });

  it('ne leve pas d erreur avant init', () => {
    expect(() => sdk.disconnect()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// normalizeParameters() — JSON Schema natif EF-B02
// ---------------------------------------------------------------------------

describe('registerTool() — JSON Schema natif', () => {
  it('accepte un JSON Schema standard (type lowercase)', async () => {
    await sdk.init(BASE);
    expect(() => {
      sdk.registerTool('json_tool', {
        description: 'test JSON Schema',
        parameters: {
          type: 'object',
          properties: {
            name:  { type: 'string',  description: 'le nom' },
            count: { type: 'number' },
            flag:  { type: 'boolean' },
          },
          required: ['name'],
        },
        handler: async () => 'ok',
      });
    }).not.toThrow();
  });

  it('accepte le format ToolParameters natif DomOS (type OBJECT uppercase)', async () => {
    await sdk.init(BASE);
    expect(() => {
      sdk.registerTool('native_tool', {
        description: 'test ToolParameters',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'terme de recherche' },
          },
        },
        handler: async () => 'ok',
      });
    }).not.toThrow();
  });

  it('accepte un tool sans parameters', async () => {
    await sdk.init(BASE);
    expect(() => {
      sdk.registerTool('no_params_tool', {
        description: 'pas de params',
        handler: async () => 'ok',
      });
    }).not.toThrow();
  });

  it('le tool JSON Schema est bien appelable', async () => {
    await sdk.init(BASE);
    const handlerSpy = vi.fn(async () => 'result');

    sdk.registerTool('callable_json', {
      description: 'test',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      handler: handlerSpy,
    });

    await mockClientRef.current!.callTool('callable_json', { id: 'abc' });
    expect(handlerSpy).toHaveBeenCalledWith({ id: 'abc' });
  });
});

// ---------------------------------------------------------------------------
// Session — beforeunload, autoResume, storageKey, maxHistoryMessages
// ---------------------------------------------------------------------------

describe('Session — robustesse EF-B04', () => {
  it('sauvegarde le snapshot localStorage au beforeunload', async () => {
    const key = 'domos_test_beforeunload_ev';
    await sdk.init({ ...BASE, session: { storageKey: key } });

    window.dispatchEvent(new Event('beforeunload'));

    expect(localStorage.getItem(key)).not.toBeNull();
  });

  it('utilise la storageKey custom dans localStorage', async () => {
    const key = 'domos_custom_key_xyz';
    await sdk.init({ ...BASE, session: { storageKey: key } });

    window.dispatchEvent(new Event('beforeunload'));

    expect(localStorage.getItem(key)).not.toBeNull();
    // La cle par defaut ne doit pas etre utilisee
    expect(localStorage.getItem('domos_browser_session_v1')).toBeNull();
  });

  it('ignore le snapshot existant si autoResume: false', async () => {
    const key = 'domos_test_autoresume';
    saveSessionSnapshot(key, {
      sessionId: 's_old',
      context: { page: 'old' },
      recentMessages: [
        { role: 'user', content: 'ancien message', timestamp: Date.now() },
        { role: 'agent', content: 'ancienne reponse', timestamp: Date.now() },
      ],
    }, 60_000);

    await sdk.init({ ...BASE, session: { storageKey: key, autoResume: false } });

    expect(sdk.getSession().messageCount).toBe(0);

    clearSessionSnapshot(key);
  });

  it('restaure les messages si autoResume: true (defaut)', async () => {
    const key = 'domos_test_autoresume_true';
    saveSessionSnapshot(key, {
      sessionId: 's_old',
      context: {},
      recentMessages: [
        { role: 'user',  content: 'msg 1', timestamp: Date.now() },
        { role: 'agent', content: 'rep 1', timestamp: Date.now() },
      ],
    }, 60_000);

    await sdk.init({ ...BASE, session: { storageKey: key, autoResume: true } });

    expect(sdk.getSession().messageCount).toBe(2);

    clearSessionSnapshot(key);
  });

  it('respecte maxHistoryMessages', async () => {
    await sdk.init({ ...BASE, session: { maxHistoryMessages: 3 } });

    // sendText appelle pushMessage -> incremente recentMessages
    sdk.sendText('msg 1');
    sdk.sendText('msg 2');
    sdk.sendText('msg 3');
    sdk.sendText('msg 4');
    sdk.sendText('msg 5');

    expect(sdk.getSession().messageCount).toBe(3);
  });

  it('retire le listener beforeunload apres destroy', async () => {
    const key = 'domos_test_destroy_bl';
    await sdk.init({ ...BASE, session: { storageKey: key } });

    sdk.destroy();
    localStorage.removeItem(key);

    // Apres destroy, beforeunload ne doit plus rien sauvegarder
    window.dispatchEvent(new Event('beforeunload'));

    expect(localStorage.getItem(key)).toBeNull();
  });
});
