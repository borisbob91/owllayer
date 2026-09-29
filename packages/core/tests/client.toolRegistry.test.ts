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

describe('OwlLayerClient — limite de tools (#155)', () => {
  afterEach(() => {
    delete (globalThis as any).window;
  });

  function makeTool(name: string) {
    return {
      declaration: { name, description: name, risk: 'none' as const },
      handler: async () => null,
      componentId: 'k',
    };
  }

  it('le 31e tool est refuse : registerTool renvoie false, un evenement est emis et onError est appele', async () => {
    const { client, sendSpy } = createClient();
    // Handshake d'un serveur qui n'annonce pas de limite : 30 par defaut
    (client as any).handleMessage({ type: MessageType.HANDSHAKE_ACK, payload: { sessionId: 'sess_1', serverVersion: '1.0.0', protocolVersion: '1.0.0', capabilities: [] } });
    const onError = vi.fn();
    const onLimit = vi.fn();
    client.on({ onError });
    client.onEvent('tool.registry.limit', onLimit);

    let lastResult = true;
    for (let i = 0; i < 31; i++) {
      lastResult = client.registerTool(makeTool(`t${i}`));
    }

    expect(lastResult).toBe(false);
    expect(onLimit).toHaveBeenCalledTimes(1);
    expect(onLimit).toHaveBeenCalledWith({ refused: ['t30'], limit: 30 }, expect.anything());
    expect(onError).toHaveBeenCalledTimes(1);

    await Promise.resolve();
    const lastUpdate = sendSpy.mock.calls
      .map(([m]) => m)
      .filter((m) => m.type === MessageType.CONTEXT_UPDATE)
      .pop();
    expect(lastUpdate.payload.activeTools.map((t: any) => t.name)).not.toContain('t30');
    expect(lastUpdate.payload.activeTools).toHaveLength(30);
  });

  it('apres un HANDSHAKE_ACK annoncant maxActiveTools: 50, 50 tools peuvent s enregistrer', () => {
    const { client } = createClient();

    (client as any).handleMessage({
      type: MessageType.HANDSHAKE_ACK,
      payload: { sessionId: 'sess_2', serverVersion: '1.0.0', protocolVersion: '1.0.0', capabilities: [], maxActiveTools: 50 },
    });

    let allRegistered = true;
    for (let i = 0; i < 50; i++) {
      allRegistered = client.registerTool(makeTool(`u${i}`)) && allRegistered;
    }

    expect(allRegistered).toBe(true);
    expect(client.toolCount).toBe(50);
  });

  it('12 tools enregistres avant une ACK annoncant 10 : un seul evenement avec les 2 derniers noms, et le premier CONTEXT_UPDATE apres l ACK contient les 10 premiers', async () => {
    const { client, sendSpy } = createClient();
    // Pas de session avant l'ACK : simule l'etat reel avant handshake
    (client as any)._sessionId = null;
    const onLimit = vi.fn();
    client.onEvent('tool.registry.limit', onLimit);

    for (let i = 0; i < 12; i++) {
      client.registerTool(makeTool(`v${i}`));
    }
    sendSpy.mockClear();

    (client as any).handleMessage({
      type: MessageType.HANDSHAKE_ACK,
      payload: { sessionId: 'sess_3', serverVersion: '1.0.0', protocolVersion: '1.0.0', capabilities: [], maxActiveTools: 10 },
    });

    expect(onLimit).toHaveBeenCalledTimes(1);
    expect(onLimit).toHaveBeenCalledWith({ refused: ['v10', 'v11'], limit: 10 }, expect.anything());

    const firstUpdate = sendSpy.mock.calls
      .map(([m]) => m)
      .find((m) => m.type === MessageType.CONTEXT_UPDATE);
    expect(firstUpdate.payload.activeTools.map((t: any) => t.name)).toEqual(
      Array.from({ length: 10 }, (_, i) => `v${i}`)
    );
  });

  it('avant le handshake, aucun tool n est refuse ; une ACK a 50 garde les 40 tools montes', async () => {
    const { client, sendSpy } = createClient();
    (client as any)._sessionId = null;
    const onLimit = vi.fn();
    client.onEvent('tool.registry.limit', onLimit);

    const results = Array.from({ length: 40 }, (_, i) => client.registerTool(makeTool(`w${i}`)));
    expect(results.every(Boolean)).toBe(true);

    (client as any).handleMessage({
      type: MessageType.HANDSHAKE_ACK,
      payload: { sessionId: 'sess_4', serverVersion: '1.0.0', protocolVersion: '1.0.0', capabilities: [], maxActiveTools: 50 },
    });

    expect(onLimit).not.toHaveBeenCalled();
    const firstUpdate = sendSpy.mock.calls.map(([m]) => m).find((m) => m.type === MessageType.CONTEXT_UPDATE);
    expect(firstUpdate.payload.activeTools).toHaveLength(40);
  });

  it('une ACK sans maxActiveTools applique 30 et signale les tools en trop', () => {
    const { client } = createClient();
    (client as any)._sessionId = null;
    const onLimit = vi.fn();
    client.onEvent('tool.registry.limit', onLimit);
    for (let i = 0; i < 32; i++) client.registerTool(makeTool(`z${i}`));

    (client as any).handleMessage({
      type: MessageType.HANDSHAKE_ACK,
      payload: { sessionId: 'sess_5', serverVersion: '1.0.0', protocolVersion: '1.0.0', capabilities: [] },
    });

    expect(client.toolCount).toBe(30);
    expect(onLimit).toHaveBeenCalledWith({ refused: ['z30', 'z31'], limit: 30 }, expect.anything());
  });
});
