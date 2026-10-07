import { describe, it, expect, vi, afterEach } from 'vitest';
import { z } from 'zod';
import { OwlLayerClient } from '@owllayer/core';
import { owlLayerClient } from '../src/stores/owllayer.store.js';
import { agentToolResolver } from '../src/actions/agentToolResolver.js';
import { navigateTool } from '../src/actions/useNavigationTool.js';
import { uiStateTool } from '../src/actions/useViewStateTool.js';

// Le schema part au client, qui valide avant l'approbation (#160).

const schema = z.object({ query: z.string().min(2) });

afterEach(() => {
  owlLayerClient.set(null);
});

function useResolver(client: any, hooks: Record<string, any> = {}, options: Record<string, any> = {}) {
  owlLayerClient.set(client);
  return agentToolResolver(document.createElement('div'), {
    config: { catalog: { prefix: 'catalog_', tools: { search: { description: 'Search', schema, handler: hooks.handler ?? (async (args: any) => args), ...hooks } } } },
    options,
  } as any);
}

const realClient = () =>
  new OwlLayerClient({ endpoint: 'ws://localhost:3000/owllayer', apiKey: 'pk_test', autoReconnect: false });

describe('agentToolResolver (Svelte) — validation deleguee au client', () => {
  it('transmet le schema de chaque tool au client', () => {
    const client = { registerTool: vi.fn(), unregisterTool: vi.fn() };
    useResolver(client);

    expect(client.registerTool).toHaveBeenCalledTimes(1);
    expect(client.registerTool.mock.calls[0][0].declaration.name).toBe('catalog_search');
    expect(client.registerTool.mock.calls[0][0].schema).toBe(schema);
  });

  it('le handler passe les arguments recus sans les revalider', async () => {
    const client = { registerTool: vi.fn(), unregisterTool: vi.fn() };
    const handler = vi.fn(async (args: any) => args);
    useResolver(client, { handler });

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
    useResolver(client, { handler, onBeforeCall, onError }, { onBeforeAnyCall, onErrorAnyCall });

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
    useResolver(client, { handler: async () => { throw new Error('boom'); }, onError }, { onErrorAnyCall });

    await expect(client.callTool('catalog_search', { query: 'owl' })).rejects.toThrow('boom');
    expect(onError).toHaveBeenCalledWith({ query: 'owl' }, expect.objectContaining({ message: 'boom' }));
    expect(onErrorAnyCall).toHaveBeenCalledWith('catalog_search', { query: 'owl' }, expect.objectContaining({ message: 'boom' }));
  });
});

describe('navigateTool / uiStateTool (Svelte) — option global', () => {
  it('navigate est global par defaut : il reste apres le retrait du noeud', () => {
    const client = realClient();
    owlLayerClient.set(client);
    const action = navigateTool(document.createElement('div'), { handler: vi.fn() });

    expect(client.toolsInfo.find((t) => t.name === 'navigate')?.global).toBe(true);
    action!.destroy();
    expect(client.hasTool('navigate')).toBe(true);
  });

  it('navigate avec global: false est retire avec le noeud', () => {
    const client = realClient();
    owlLayerClient.set(client);
    const action = navigateTool(document.createElement('div'), { handler: vi.fn(), global: false });

    action!.destroy();
    expect(client.hasTool('navigate')).toBe(false);
  });

  it('ui_state est local par defaut, global: true le garde', () => {
    const client = realClient();
    owlLayerClient.set(client);
    const local = uiStateTool(document.createElement('div'), { handler: vi.fn() });
    local!.destroy();
    expect(client.hasTool('ui_state')).toBe(false);

    const kept = uiStateTool(document.createElement('div'), { handler: vi.fn(), global: true });
    expect(client.toolsInfo.find((t) => t.name === 'ui_state')?.global).toBe(true);
    kept!.destroy();
    expect(client.hasTool('ui_state')).toBe(true);
  });

  it('le client valide les arguments de navigate et ui_state avant le handler', async () => {
    const client = realClient();
    owlLayerClient.set(client);
    const onNavigate = vi.fn();
    const onViewState = vi.fn();
    navigateTool(document.createElement('div'), { handler: onNavigate });
    uiStateTool(document.createElement('div'), { handler: onViewState });

    await expect(client.callTool('navigate', { url: '' })).rejects.toThrow('Validation args "navigate"');
    await expect(client.callTool('ui_state', { viewId: 'cart' })).rejects.toThrow('Validation args "ui_state"');
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onViewState).not.toHaveBeenCalled();

    await client.callTool('navigate', { url: '/cart' });
    await client.callTool('ui_state', { viewId: 'cart', action: 'open' });
    expect(onNavigate).toHaveBeenCalledWith({ url: '/cart' });
    expect(onViewState).toHaveBeenCalledWith({ viewId: 'cart', action: 'open' });
  });
});
