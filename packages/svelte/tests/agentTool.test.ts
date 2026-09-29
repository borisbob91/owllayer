import { describe, it, expect, vi, afterEach } from 'vitest';
import { z } from 'zod';
import { owlLayerClient } from '../src/stores/owllayer.store.js';
import { agentTool } from '../src/actions/useAgentTool.js';

// Le schema part au client, qui valide avant l'approbation (#160).

function setup() {
  const client = { registerTool: vi.fn(), unregisterTool: vi.fn() };
  owlLayerClient.set(client as any);
  return client;
}

afterEach(() => {
  owlLayerClient.set(null);
});

describe('agentTool (Svelte) — validation deleguee au client', () => {
  it('transmet le schema au client, aussi apres une mise a jour', () => {
    const client = setup();
    const node = document.createElement('div');
    const first = z.object({ amount: z.number() });
    const second = z.object({ amount: z.number(), note: z.string() });

    const action = agentTool(node, { name: 'pay', description: 'Pay', schema: first, handler: vi.fn() } as any);
    action!.update({ name: 'pay', description: 'Pay v2', schema: second, handler: vi.fn() } as any);

    expect(client.registerTool.mock.calls[0][0].schema).toBe(first);
    expect(client.registerTool.mock.calls[1][0].schema).toBe(second);
  });

  it('le handler passe les arguments recus sans les revalider', async () => {
    const client = setup();
    const handler = vi.fn(async (args) => args);
    agentTool(document.createElement('div'), { name: 'pay', description: 'Pay', schema: z.object({ amount: z.number() }), handler } as any);

    const registered = client.registerTool.mock.calls[0][0].handler;
    await expect(registered({ amount: 'x' })).resolves.toEqual({ amount: 'x' });
    expect(handler).toHaveBeenCalledWith({ amount: 'x' });
  });
});
