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
  // Session etablie : pendant un tool call l'agent est en 'thinking', les
  // (de)registrations doivent quand meme envoyer un CONTEXT_UPDATE
  (client as any)._sessionId = 'sess_1';

  return { client, sendSpy };
}

function sentTypes(sendSpy: ReturnType<typeof vi.fn>): string[] {
  return sendSpy.mock.calls.map(([message]) => message.type);
}

describe('OwlLayerClient — synchro des tools apres navigation', () => {
  afterEach(() => {
    delete (globalThis as any).window;
  });

  it('renvoie le resultat immediatement quand le tool ne navigue pas', async () => {
    const { client, sendSpy } = createClient();
    client.registerTool({
      declaration: { name: 'cart_summary', description: 'Resume du panier', risk: 'none' },
      handler: async () => ({ items: [] }),
      componentId: 'home',
    });
    // Laisser partir le CONTEXT_UPDATE groupe de l'enregistrement
    await Promise.resolve();
    sendSpy.mockClear();

    const start = Date.now();
    await (client as any).handleToolCall({ callId: 'call_1', name: 'cart_summary', args: {} });

    expect(Date.now() - start).toBeLessThan(40);
    expect(sentTypes(sendSpy)).toEqual([MessageType.TOOL_RESULT]);
  });

  it('attend l enregistrement des tools de la nouvelle page avant TOOL_RESULT', async () => {
    const { client, sendSpy } = createClient();
    client.registerTool({
      declaration: { name: 'go_to_checkout', description: 'Aller au checkout', risk: 'none' },
      handler: async () => {
        location.pathname = '/checkout';
        // React monte la page checkout apres le retour du handler
        setTimeout(() => {
          client.unregisterToolsByComponent('home');
          client.registerTool({
            declaration: { name: 'fill_address', description: 'Remplir l adresse', risk: 'none' },
            handler: async () => ({ ok: true }),
            componentId: 'checkout',
          });
        }, 20);
        return { success: true };
      },
      componentId: 'home',
    });
    sendSpy.mockClear();

    await (client as any).handleToolCall({ callId: 'call_2', name: 'go_to_checkout', args: {} });

    expect(client.state).toBe('thinking');
    const types = sentTypes(sendSpy);
    expect(types[types.length - 1]).toBe(MessageType.TOOL_RESULT);
    const lastContextUpdate = sendSpy.mock.calls
      .map(([message]) => message)
      .filter((message) => message.type === MessageType.CONTEXT_UPDATE)
      .pop();
    expect(lastContextUpdate.payload.activeTools.map((t: { name: string }) => t.name)).toEqual(['fill_address']);
  });

  it('conserve les tools globaux dans la surface de la nouvelle page', async () => {
    const { client, sendSpy } = createClient();
    // Tool global (ex. resolver de App avec global: true) : disponible sur toutes les pages
    client.registerTool({
      declaration: { name: 'go_to_checkout', description: 'Aller au checkout', risk: 'none' },
      handler: async () => {
        location.pathname = '/checkout';
        setTimeout(() => {
          client.unregisterToolsByComponent('home');
          client.registerTool({
            declaration: { name: 'fill_address', description: 'Remplir l adresse', risk: 'none' },
            handler: async () => ({ ok: true }),
            componentId: 'checkout',
          });
        }, 20);
        return { success: true };
      },
      componentId: 'app',
      global: true,
    });
    client.registerTool({
      declaration: { name: 'search_products', description: 'Rechercher', risk: 'none' },
      handler: async () => [],
      componentId: 'home',
    });
    sendSpy.mockClear();

    await (client as any).handleToolCall({ callId: 'call_4', name: 'go_to_checkout', args: {} });

    const lastContextUpdate = sendSpy.mock.calls
      .map(([message]) => message)
      .filter((message) => message.type === MessageType.CONTEXT_UPDATE)
      .pop();
    expect(lastContextUpdate.payload.activeTools.map((t: { name: string }) => t.name)).toEqual([
      'go_to_checkout',
      'fill_address',
    ]);
    expect(sentTypes(sendSpy).pop()).toBe(MessageType.TOOL_RESULT);
  });

  it('ne depasse pas le delai maximal si le registre change sans cesse', async () => {
    const { client, sendSpy } = createClient();
    let interval: ReturnType<typeof setInterval> | undefined;
    client.registerTool({
      declaration: { name: 'navigate', description: 'Naviguer', risk: 'none' },
      handler: async () => {
        location.pathname = '/busy';
        let i = 0;
        interval = setInterval(() => {
          client.registerTool({
            declaration: { name: `tool_${i++}`, description: 'Tool dynamique', risk: 'none' },
            handler: async () => null,
            componentId: 'busy',
          });
        }, 10);
        return { success: true };
      },
      componentId: 'home',
    });

    const start = Date.now();
    await (client as any).handleToolCall({ callId: 'call_3', name: 'navigate', args: {} });
    clearInterval(interval);

    expect(Date.now() - start).toBeLessThan(700);
    expect(sentTypes(sendSpy).pop()).toBe(MessageType.TOOL_RESULT);
  });
});
