import { afterEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock OwlLayerClient — un seul registre de tools (comme le ToolRegistry core),
// pour verifier que le SDK browser ne garde plus sa propre Map.
// ---------------------------------------------------------------------------

interface MockTool {
  declaration: { name: string };
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

interface MockClient {
  _tools: Map<string, MockTool>;
}

const mockClientRef = vi.hoisted(() => ({ current: null as MockClient | null }));

vi.mock('@owllayer/ui/devtools', () => ({
  mountDevTools: vi.fn(),
}));

vi.mock('@owllayer/core', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;

  class MockOwlLayerClient {
    _handlers: Record<string, (...a: unknown[]) => unknown> = {};
    _tools = new Map<string, MockTool>();
    _anyHandlers = new Set<(event: unknown) => void>();

    constructor() {
      mockClientRef.current = this as unknown as MockClient;
    }

    on(handlers: Record<string, (...a: unknown[]) => unknown>) {
      Object.assign(this._handlers, handlers);
    }

    onAnyEvent() {}
    offAnyEvent() {}
    connect() { return Promise.resolve(); }
    destroy() { this._tools.clear(); }
    disconnect() {}

    registerTool(tool: MockTool) {
      this._tools.set(tool.declaration.name, tool);
      return true;
    }

    unregisterTool(name: string) { this._tools.delete(name); }
    updateContext() {}
    sendText() {}
    syncToolsWithServer() {}

    get sessionId() { return null; }
    get isConnected() { return false; }

    get registeredTools() {
      return Array.from(this._tools.values()).map(t => t.declaration);
    }

    async callTool(name: string, args: Record<string, unknown>) {
      const tool = this._tools.get(name);
      if (!tool) {
        throw new Error(`callTool: outil '${name}' non enregistre`);
      }
      return tool.handler(args);
    }
  }

  return { ...actual, OwlLayerClient: MockOwlLayerClient };
});

// Importer APRES le mock pour que OwlLayer (singleton) utilise MockOwlLayerClient
import { OwlLayer } from '../src/index.js';

const BASE = {
  apiKey: 'pk_test',
  endpoint: 'ws://localhost:4001/owllayer',
  autoConnect: false,
  widget: { enabled: false },
  hitl: { enabled: false },
  autoDiscovery: { enabled: true },
} as const;

afterEach(() => {
  OwlLayer.destroy();
  document.body.innerHTML = '';
});

describe('OwlLayer — registre unique de tools (registry core)', () => {
  it('getRegisteredTools() reflete le registre apres registerTool/unregisterTool', async () => {
    await OwlLayer.init(BASE);

    OwlLayer.registerTool('greet', {
      description: 'dit bonjour',
      handler: async () => 'bonjour',
    });

    expect(OwlLayer.getRegisteredTools().map(t => t.name)).toContain('greet');

    OwlLayer.unregisterTool('greet');

    expect(OwlLayer.getRegisteredTools().map(t => t.name)).not.toContain('greet');
  });

  it('getRegisteredTools() reflete le registre apres retrait d un element auto-discover', async () => {
    const el = document.createElement('button');
    el.setAttribute('data-owllayer-tool', 'auto_tool');
    document.body.appendChild(el);

    await OwlLayer.init(BASE);

    expect(OwlLayer.getRegisteredTools().map(t => t.name)).toContain('auto_tool');

    el.remove();
    await Promise.resolve();

    expect(OwlLayer.getRegisteredTools().map(t => t.name)).not.toContain('auto_tool');
  });

  it('callTool() execute le handler enregistre, retourne son resultat et declenche onToolCall', async () => {
    await OwlLayer.init(BASE);

    const handlerSpy = vi.fn(async (args: Record<string, unknown>) => ({ echoed: args }));
    OwlLayer.registerTool('echo', {
      description: 'echo',
      handler: handlerSpy,
    });

    const toolCallCb = vi.fn();
    OwlLayer.onToolCall(toolCallCb);

    const result = await OwlLayer.callTool('echo', { value: 42 });

    expect(handlerSpy).toHaveBeenCalledWith({ value: 42 });
    expect(result).toEqual({ echoed: { value: 42 } });
    expect(toolCallCb).toHaveBeenCalledWith('echo', { value: 42 });
  });

  it('callTool() rejette pour un tool inconnu', async () => {
    await OwlLayer.init(BASE);

    await expect(OwlLayer.callTool('inconnu', {})).rejects.toThrow();
  });
});
