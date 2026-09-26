import { describe, it, expect, vi, afterEach } from 'vitest';
import { OwlLayerClient, MessageType } from '../src/index.js';

const location = { pathname: '/' };

function createClient({ withSession = true } = {}) {
  (globalThis as any).window = { location };
  location.pathname = '/';

  const client = new OwlLayerClient({
    endpoint: 'ws://localhost:3000/owllayer',
    apiKey: 'pk_test',
    autoReconnect: false,
  });
  const sendSpy = vi.fn();
  (client as any).send = sendSpy;
  if (withSession) (client as any)._sessionId = 'sess_1';

  return { client, sendSpy };
}

function register(client: OwlLayerClient, name: string, componentId: string, global = false) {
  client.registerTool({
    declaration: { name, description: name, risk: 'none' },
    handler: async () => ({ ok: true }),
    componentId,
    global,
  });
}

function contextUpdates(sendSpy: ReturnType<typeof vi.fn>) {
  return sendSpy.mock.calls
    .map(([message]) => message)
    .filter((message) => message.type === MessageType.CONTEXT_UPDATE);
}

function toolNames(message: any): string[] {
  return message.payload.activeTools.map((t: { name: string }) => t.name);
}

// Laisse passer la microtache qui envoie le CONTEXT_UPDATE groupe
const flushMicrotasks = () => Promise.resolve();

describe('OwlLayerClient — CONTEXT_UPDATE groupes', () => {
  afterEach(() => {
    delete (globalThis as any).window;
  });

  it('envoie un seul CONTEXT_UPDATE pour plusieurs tools enregistres dans la meme tache', async () => {
    const { client, sendSpy } = createClient();

    ['a', 'b', 'c', 'd', 'e', 'f'].forEach((name) => register(client, name, 'home'));
    expect(contextUpdates(sendSpy)).toHaveLength(0);

    await flushMicrotasks();

    const updates = contextUpdates(sendSpy);
    expect(updates).toHaveLength(1);
    expect(toolNames(updates[0])).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('regroupe une navigation complete en un message avec l etat final', async () => {
    const { client, sendSpy } = createClient();
    register(client, 'go_to_checkout', 'app', true);
    register(client, 'add_to_cart', 'home');
    await flushMicrotasks();
    sendSpy.mockClear();

    location.pathname = '/checkout';
    client.unregisterToolsByComponent('home');
    ['fill_address', 'apply_coupon', 'confirm_checkout'].forEach((name) => register(client, name, 'checkout'));
    client.updateContext({ cartTotal: 42 });
    await flushMicrotasks();

    const updates = contextUpdates(sendSpy);
    expect(updates).toHaveLength(1);
    expect(updates[0].payload.url).toBe('/checkout');
    expect(toolNames(updates[0])).toEqual(['go_to_checkout', 'fill_address', 'apply_coupon', 'confirm_checkout']);
    expect(updates[0].payload.context).toEqual({ cartTotal: 42 });
  });

  it('envoie un message par tache quand les changements sont separes', async () => {
    const { client, sendSpy } = createClient();

    register(client, 'a', 'home');
    await flushMicrotasks();
    client.unregisterTool('a');
    await flushMicrotasks();
    client.setContext({ step: 2 });
    await flushMicrotasks();

    expect(contextUpdates(sendSpy)).toHaveLength(3);
  });

  it('n envoie rien sans session, ni plus tard', async () => {
    const { client, sendSpy } = createClient({ withSession: false });

    register(client, 'a', 'home');
    client.updateContext({ step: 1 });
    await flushMicrotasks();
    (client as any)._sessionId = 'sess_1';
    await flushMicrotasks();

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('n envoie rien si la session est perdue avant la microtache', async () => {
    const { client, sendSpy } = createClient();

    register(client, 'a', 'home');
    (client as any)._sessionId = null;
    await flushMicrotasks();

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('envoie le CONTEXT_UPDATE avant TOOL_RESULT quand un tool change le contexte sans naviguer', async () => {
    const { client, sendSpy } = createClient();
    client.registerTool({
      declaration: { name: 'set_step', description: 'Etape', risk: 'none' },
      handler: () => {
        client.updateContext({ step: 3 });
        return { ok: true };
      },
      componentId: 'home',
    });
    await flushMicrotasks();
    sendSpy.mockClear();

    await (client as any).handleToolCall({ callId: 'call_1', name: 'set_step', args: {} });

    const types = sendSpy.mock.calls.map(([message]) => message.type);
    expect(types).toEqual([MessageType.CONTEXT_UPDATE, MessageType.TOOL_RESULT]);
    expect(contextUpdates(sendSpy)[0].payload.context).toEqual({ step: 3 });
  });

  it('syncToolsWithServer envoie tout de suite et annule l envoi groupe en attente', async () => {
    const { client, sendSpy } = createClient();

    register(client, 'a', 'home');
    client.syncToolsWithServer();
    expect(contextUpdates(sendSpy)).toHaveLength(1);

    await flushMicrotasks();

    expect(contextUpdates(sendSpy)).toHaveLength(1);
  });

  it('emet tool.registry.synced une fois par rafale', async () => {
    const { client } = createClient();
    const synced = vi.fn();
    client.onEvent('tool.registry.synced', synced);

    ['a', 'b', 'c'].forEach((name) => register(client, name, 'home'));
    await flushMicrotasks();

    expect(synced).toHaveBeenCalledTimes(1);
  });
});
