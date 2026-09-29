import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { z } from 'zod';
import { OWLLAYER_CLIENT_KEY } from '../src/plugin/OwlLayerPlugin.js';
import { useAgentTool } from '../src/composables/useAgentTool.js';

// Le schema part au client, qui valide avant l'approbation (#160).

function mountTool(schema: z.ZodTypeAny | undefined, callback: (args: any) => unknown) {
  const client = { registerTool: vi.fn(), unregisterTool: vi.fn() };
  const Comp = defineComponent({
    setup() {
      useAgentTool({ name: 'pay', description: 'Pay', risk: 'critical', schema } as any, callback);
      return () => null;
    },
  });
  mount(Comp, { global: { provide: { [OWLLAYER_CLIENT_KEY as unknown as string]: client } } });
  return client;
}

describe('useAgentTool (Vue) — validation deleguee au client', () => {
  it('transmet le schema au client', () => {
    const schema = z.object({ amount: z.number() });
    const client = mountTool(schema, vi.fn());

    expect(client.registerTool).toHaveBeenCalledTimes(1);
    expect(client.registerTool.mock.calls[0][0].schema).toBe(schema);
  });

  it('le handler passe les arguments recus au callback sans les revalider', async () => {
    const callback = vi.fn(async (args) => args);
    const client = mountTool(z.object({ amount: z.number() }), callback);
    const { handler } = client.registerTool.mock.calls[0][0];

    await expect(handler({ amount: 'x' })).resolves.toEqual({ amount: 'x' });
    expect(callback).toHaveBeenCalledWith({ amount: 'x' });
  });
});
