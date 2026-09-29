// Contrat du registre unique cote client (#154) : ajoute par l'audit du lot.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { OwlLayerClient, MessageType, ToolRegistry } from '../src/index.js';

const location = { pathname: '/' };

function createClient({ withSession = true } = {}) {
  (globalThis as any).window = { location };
  location.pathname = '/';
  const client = new OwlLayerClient({ endpoint: 'ws://localhost:3000/owllayer', apiKey: 'pk_test', autoReconnect: false });
  const sendSpy = vi.fn();
  (client as any).send = sendSpy;
  if (withSession) (client as any)._sessionId = 'sess_1';
  return { client, sendSpy };
}

const flush = () => Promise.resolve();
const updates = (spy: ReturnType<typeof vi.fn>) =>
  spy.mock.calls.map(([m]) => m).filter((m) => m.type === MessageType.CONTEXT_UPDATE);
const results = (spy: ReturnType<typeof vi.fn>) =>
  spy.mock.calls.map(([m]) => m).filter((m) => m.type === MessageType.TOOL_RESULT);

describe('audit lot B — registre unique du client', () => {
  afterEach(() => {
    delete (globalThis as any).window;
  });

  it('le client ne garde aucune Map de tools a lui', () => {
    const { client } = createClient();
    const stores = Object.values(client as any).filter((v) => v instanceof ToolRegistry);
    expect(stores).toHaveLength(1);
    expect((client as any).tools).toBeUndefined();
  });

  it('le handler du composant B reste appelable apres le demontage de A', async () => {
    const { client, sendSpy } = createClient();
    const a = vi.fn(async () => 'A');
    const b = vi.fn(async () => 'B');
    client.registerTool({ declaration: { name: 'x', description: 'x', risk: 'none' }, handler: a, componentId: 'A' });
    client.registerTool({ declaration: { name: 'x', description: 'x', risk: 'none' }, handler: b, componentId: 'B' });
    client.unregisterToolsByComponent('A');

    await (client as any).handleToolCall({ callId: 'c1', name: 'x', args: {} });

    expect(client.hasTool('x')).toBe(true);
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).not.toHaveBeenCalled();
    expect(results(sendSpy).at(-1).payload).toMatchObject({ callId: 'c1', status: 'success', result: 'B' });
  });

  it('un outil retire ne s execute plus', async () => {
    const { client, sendSpy } = createClient();
    const handler = vi.fn(async () => 'ok');
    client.registerTool({ declaration: { name: 'pay', description: 'pay', risk: 'none' }, handler, componentId: 'c' });
    client.unregisterTool('pay');

    await (client as any).handleToolCall({ callId: 'c2', name: 'pay', args: {} });

    expect(handler).not.toHaveBeenCalled();
    expect(results(sendSpy).at(-1).payload).toMatchObject({ callId: 'c2', status: 'error' });
  });

  it('un outil global survit au demontage et reste appelable', async () => {
    const { client } = createClient();
    client.registerTool({ declaration: { name: 'nav', description: 'nav', risk: 'none' }, handler: async () => 'went', componentId: 'app', global: true });
    client.unregisterToolsByComponent('app');

    expect(client.registeredTools.map((t) => t.name)).toEqual(['nav']);
    await expect(client.callTool('nav', {})).resolves.toBe('went');
  });

  it('toolsInfo garde le nom du plugin et le flag global', () => {
    const { client } = createClient();
    client.registerTool({ declaration: { name: 'w', description: 'w', risk: 'low' }, handler: async () => 1, componentId: 'p', source: 'weather', global: true });
    client.registerTool({ declaration: { name: 'v', description: 'v', risk: 'none' }, handler: async () => 1, componentId: 'p' });

    expect(client.toolsInfo).toEqual([
      { name: 'w', description: 'w', risk: 'low', source: 'weather', global: true },
      { name: 'v', description: 'v', risk: 'none' },
    ]);
  });

  it('registeredTools renvoie les declarations inchangees', () => {
    const { client } = createClient();
    const declaration = { name: 'find', description: 'Find', risk: 'none' as const, parameters: { type: 'OBJECT' as const, properties: { q: { type: 'STRING' as const } }, required: ['q'] } };
    client.registerTool({ declaration, handler: async () => 1, componentId: 'c' });

    expect(client.registeredTools).toEqual([declaration]);
  });

  it('ajouts et retraits d une meme tache partent dans un seul CONTEXT_UPDATE', async () => {
    const { client, sendSpy } = createClient();
    ['a', 'b', 'c'].forEach((n) => client.registerTool({ declaration: { name: n, description: n, risk: 'none' }, handler: async () => 1, componentId: 'k' }));
    client.unregisterTool('b');
    await flush();

    const u = updates(sendSpy);
    expect(u).toHaveLength(1);
    expect(u[0].payload.activeTools.map((t: any) => t.name)).toEqual(['a', 'c']);
  });

  it('sans session, aucun CONTEXT_UPDATE n est envoye', async () => {
    const { client, sendSpy } = createClient({ withSession: false });
    client.registerTool({ declaration: { name: 'a', description: 'a', risk: 'none' }, handler: async () => 1, componentId: 'k' });
    await flush();

    expect(updates(sendSpy)).toHaveLength(0);
    expect(client.toolCount).toBe(1);
  });

  it('un outil critical approuve execute le handler du registre', async () => {
    const { client, sendSpy } = createClient();
    const handler = vi.fn(async () => ({ paid: true }));
    client.registerTool({ declaration: { name: 'pay', description: 'pay', risk: 'critical' }, handler, componentId: 'c' });

    await (client as any).handleToolCall({ callId: 'c3', name: 'pay', args: { amount: 5 } });
    expect(handler).not.toHaveBeenCalled();

    await client.resolveApproval('c3', true);
    expect(handler).toHaveBeenCalledWith({ amount: 5 });
    const response = sendSpy.mock.calls.map(([m]) => m).find((m) => m.type === MessageType.APPROVAL_RESPONSE);
    expect(response.payload).toMatchObject({ callId: 'c3', approved: true, result: { paid: true } });
  });

  it('destroy vide le registre', () => {
    const { client } = createClient();
    client.registerTool({ declaration: { name: 'a', description: 'a', risk: 'none' }, handler: async () => 1, componentId: 'k' });
    client.destroy();

    expect(client.toolCount).toBe(0);
    expect(client.registeredTools).toEqual([]);
  });
});

describe('audit lot B — comportement inchange', () => {
  afterEach(() => {
    delete (globalThis as any).window;
  });

  it('registerTool ne leve jamais d exception, meme au-dela de 30 tools', () => {
    const { client } = createClient();
    expect(() => {
      for (let i = 0; i < 40; i++) {
        client.registerTool({ declaration: { name: `t${i}`, description: 't', risk: 'none' }, handler: async () => 1, componentId: 'k' });
      }
    }).not.toThrow();
  });

  it('un tool sans risk part sans risk dans le CONTEXT_UPDATE', async () => {
    const { client, sendSpy } = createClient();
    client.registerTool({ declaration: { name: 'plain', description: 'plain' }, handler: async () => 1, componentId: 'k' });
    await flush();

    const tool = updates(sendSpy)[0].payload.activeTools[0];
    expect(JSON.parse(JSON.stringify(tool))).toEqual({ name: 'plain', description: 'plain' });
  });

  it('TOOL_CALL et callTool visent le tool nomme parmi plusieurs', async () => {
    const { client, sendSpy } = createClient();
    const first = vi.fn(async () => 'first');
    const second = vi.fn(async () => 'second');
    client.registerTool({ declaration: { name: 'first', description: 'f', risk: 'none' }, handler: first, componentId: 'k' });
    client.registerTool({ declaration: { name: 'second', description: 's', risk: 'none' }, handler: second, componentId: 'k' });

    await (client as any).handleToolCall({ callId: 'c9', name: 'second', args: { q: 1 } });
    await expect(client.callTool('second', {})).resolves.toBe('second');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenNthCalledWith(1, { q: 1 });
    expect(results(sendSpy).at(-1).payload).toMatchObject({ callId: 'c9', result: 'second' });
  });

  it('apres une navigation, attend les tools de la nouvelle page enregistres par vagues', async () => {
    const { client, sendSpy } = createClient();
    client.registerTool({
      declaration: { name: 'go', description: 'go', risk: 'none' },
      handler: async () => {
        location.pathname = '/next';
        [20, 45, 70, 95].forEach((delay, i) => {
          setTimeout(() => {
            client.registerTool({ declaration: { name: `p${i}`, description: 'p', risk: 'none' }, handler: async () => 1, componentId: 'next' });
          }, delay);
        });
        return 'ok';
      },
      componentId: 'app',
      global: true,
    });
    await flush();
    sendSpy.mockClear();

    await (client as any).handleToolCall({ callId: 'c10', name: 'go', args: {} });

    const last = updates(sendSpy).at(-1);
    expect(last.payload.activeTools.map((t: any) => t.name)).toEqual(['go', 'p0', 'p1', 'p2', 'p3']);
    expect(sendSpy.mock.calls.at(-1)[0].type).toBe(MessageType.TOOL_RESULT);
  });
});
