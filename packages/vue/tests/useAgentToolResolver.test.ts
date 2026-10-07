import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { z } from 'zod';
import { OwlLayerClient } from '@owllayer/core';
import { OWLLAYER_CLIENT_KEY } from '../src/plugin/OwlLayerPlugin.js';
import { useAgentToolResolver } from '../src/composables/useAgentToolResolver.js';

// Le resolver transmet le schema au client, qui valide avant l'approbation (#160).

const schema = z.object({ query: z.string().min(2) });

function mountResolver(client: any, hooks: Record<string, any> = {}, options: Record<string, any> = {}) {
  const Comp = defineComponent({
    setup() {
      useAgentToolResolver(
        { catalog: { prefix: 'catalog_', tools: { search: { description: 'Search', schema, handler: hooks.handler ?? (async (args: any) => args), ...hooks } } } },
        options
      );
      return () => null;
    },
  });
  mount(Comp, { global: { provide: { [OWLLAYER_CLIENT_KEY as unknown as string]: client } } });
}

const realClient = () =>
  new OwlLayerClient({ endpoint: 'ws://localhost:3000/owllayer', apiKey: 'pk_test', autoReconnect: false });

describe('useAgentToolResolver (Vue) — validation deleguee au client', () => {
  it('transmet le schema de chaque tool au client', () => {
    const client = { registerTool: vi.fn(), unregisterTool: vi.fn() };
    mountResolver(client);

    expect(client.registerTool).toHaveBeenCalledTimes(1);
    expect(client.registerTool.mock.calls[0][0].declaration.name).toBe('catalog_search');
    expect(client.registerTool.mock.calls[0][0].schema).toBe(schema);
  });

  it('le handler passe les arguments recus sans les revalider', async () => {
    const client = { registerTool: vi.fn(), unregisterTool: vi.fn() };
    const handler = vi.fn(async (args: any) => args);
    mountResolver(client, { handler });

    await expect(client.registerTool.mock.calls[0][0].handler({ query: 'x' })).resolves.toEqual({ query: 'x' });
    expect(handler).toHaveBeenCalledWith({ query: 'x' });
  });

  it('avec le vrai client : un appel invalide est refuse sans handler ni hooks', async () => {
    const client = realClient();
    const handler = vi.fn(async (args: any) => args);
    const onBeforeCall = vi.fn();
    const onError = vi.fn();
    const onBeforeAnyCall = vi.fn();
    const onErrorAnyCall = vi.fn();
    mountResolver(client, { handler, onBeforeCall, onError }, { onBeforeAnyCall, onErrorAnyCall });

    await expect(client.callTool('catalog_search', { query: 'x' })).rejects.toThrow('Validation args "catalog_search"');
    expect(handler).not.toHaveBeenCalled();
    expect(onBeforeCall).not.toHaveBeenCalled();
    expect(onBeforeAnyCall).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(onErrorAnyCall).not.toHaveBeenCalled();
  });

  it('avec le vrai client : une erreur du handler passe toujours par onError et onErrorAnyCall', async () => {
    const client = realClient();
    const onError = vi.fn();
    const onErrorAnyCall = vi.fn();
    mountResolver(client, { handler: async () => { throw new Error('boom'); }, onError }, { onErrorAnyCall });

    await expect(client.callTool('catalog_search', { query: 'owl' })).rejects.toThrow('boom');
    expect(onError).toHaveBeenCalledWith({ query: 'owl' }, expect.objectContaining({ message: 'boom' }));
    expect(onErrorAnyCall).toHaveBeenCalledWith('catalog_search', { query: 'owl' }, expect.objectContaining({ message: 'boom' }));
  });
});
