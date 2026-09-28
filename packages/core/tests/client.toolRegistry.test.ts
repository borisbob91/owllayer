import { describe, it, expect, vi, afterEach } from 'vitest';
import { OwlLayerClient, MessageType } from '../src/index.js';

const location = { pathname: '/' };

function createClient() {
  (globalThis as any).window = { location };
  location.pathname = '/';

  const client = new OwlLayerClient({
    endpoint: 'ws://localhost:3000/owllayer',
    apiKey: 'pk_test',
    autoReconnect: false,
  });
  const sendSpy = vi.fn();
  (client as any).send = sendSpy;
  (client as any)._sessionId = 'sess_1';

  return { client, sendSpy };
}

describe('OwlLayerClient — stockage des tools dans ToolRegistry', () => {
  afterEach(() => {
    delete (globalThis as any).window;
  });

  it('stocke handler, risk, componentId et plugin ; toolsInfo expose source et global', () => {
    const { client } = createClient();

    const handlerA = vi.fn().mockResolvedValue({ ok: true });
    client.registerTool({
      declaration: { name: 'search', description: 'Rechercher', risk: 'low' },
      handler: handlerA,
      componentId: 'home',
      source: '@acme/crm',
    });

    const handlerB = vi.fn().mockResolvedValue(null);
    client.registerTool({
      declaration: { name: 'go_home', description: 'Aller a l accueil', risk: 'none' },
      handler: handlerB,
      componentId: 'app',
      global: true,
      source: '@acme/nav',
    });

    const info = client.toolsInfo;
    const search = info.find((t) => t.name === 'search');
    const goHome = info.find((t) => t.name === 'go_home');

    expect(search).toMatchObject({ name: 'search', description: 'Rechercher', risk: 'low', source: '@acme/crm' });
    expect(search?.global).toBeUndefined();
    expect(goHome).toMatchObject({ name: 'go_home', source: '@acme/nav', global: true });

    // Le handler reste appelable directement (callTool)
    expect((client as any).toolRegistry.get('search').handler).toBe(handlerA);
    expect((client as any).toolRegistry.get('go_home').componentId).toBe('app');
  });

  it('enregistrer deux fois le meme nom garde une seule entree a la meme position', () => {
    const { client } = createClient();

    client.registerTool({
      declaration: { name: 'a', description: 'A', risk: 'none' },
      handler: async () => 1,
      componentId: 'home',
    });
    client.registerTool({
      declaration: { name: 'b', description: 'B', risk: 'none' },
      handler: async () => 2,
      componentId: 'home',
    });
    client.registerTool({
      declaration: { name: 'a', description: 'A bis', risk: 'low' },
      handler: async () => 3,
      componentId: 'home',
    });

    expect(client.toolCount).toBe(2);
    expect(client.registeredTools.map((t) => t.name)).toEqual(['a', 'b']);
    expect(client.registeredTools[0].description).toBe('A bis');
  });

  it('unregisterToolsByComponent retire les tools locaux et garde les globaux', () => {
    const { client } = createClient();

    client.registerTool({
      declaration: { name: 'local_tool', description: 'Local', risk: 'none' },
      handler: async () => null,
      componentId: 'home',
    });
    client.registerTool({
      declaration: { name: 'global_tool', description: 'Global', risk: 'none' },
      handler: async () => null,
      componentId: 'home',
      global: true,
    });

    client.unregisterToolsByComponent('home');

    expect(client.hasTool('local_tool')).toBe(false);
    expect(client.hasTool('global_tool')).toBe(true);
  });

  it('un composant B qui enregistre "x" apres A survit au demontage de A', () => {
    const { client } = createClient();

    client.registerTool({
      declaration: { name: 'x', description: 'De A', risk: 'none' },
      handler: async () => 'A',
      componentId: 'A',
    });
    client.registerTool({
      declaration: { name: 'x', description: 'De B', risk: 'none' },
      handler: async () => 'B',
      componentId: 'B',
    });

    client.unregisterToolsByComponent('A');

    expect(client.hasTool('x')).toBe(true);
    expect((client as any).toolRegistry.get('x').componentId).toBe('B');
  });

  it('un TOOL_CALL pour un nom non enregistre produit le meme TOOL_RESULT d erreur qu avant', async () => {
    const { client, sendSpy } = createClient();

    await (client as any).handleToolCall({ callId: 'call_unknown', name: 'ghost_tool', args: {} });

    expect(sendSpy).toHaveBeenCalledTimes(1);
    const [message] = sendSpy.mock.calls[0];
    expect(message.type).toBe(MessageType.TOOL_RESULT);
    expect(message.payload).toMatchObject({
      callId: 'call_unknown',
      status: 'error',
      error: 'Tool "ghost_tool" non trouve',
    });
  });
});
