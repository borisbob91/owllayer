import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { z } from 'zod';
import { OwlLayerClient } from '@owllayer/core';
import { OwlLayerContext } from '../src/provider/OwlLayerContext.js';
import { useAgentToolResolver } from '../src/hooks/useAgentToolResolver.js';

function createContext() {
  return {
    registerTool: vi.fn(),
    unregisterToolsByComponent: vi.fn(),
    debug: false,
  } as any;
}

// Config inline : nouvelle reference a chaque render, comme dans apps/demo-react
function Tools({ description = 'Ajouter au panier', handler }: { description?: string; handler: (args: any) => unknown }) {
  useAgentToolResolver({
    cart: {
      tools: {
        add_to_cart: {
          description,
          schema: z.object({ productId: z.string() }),
          risk: 'low',
          handler,
        },
        cart_summary: {
          description: 'Resume du panier',
          schema: z.object({}),
          risk: 'none',
          handler: async () => ({ items: [] }),
        },
      },
    },
  });
  return null;
}

function renderWith(ctx: any, props: { description?: string; handler: (args: any) => unknown }) {
  const view = render(
    <OwlLayerContext.Provider value={ctx}>
      <Tools {...props} />
    </OwlLayerContext.Provider>
  );
  return {
    ...view,
    rerenderWith: (next: { description?: string; handler: (args: any) => unknown }) =>
      view.rerender(
        <OwlLayerContext.Provider value={{ ...ctx }}>
          <Tools {...next} />
        </OwlLayerContext.Provider>
      ),
  };
}

describe('useAgentToolResolver', () => {
  it('ne re-enregistre pas les tools quand un config inline est re-rendu sans changement', () => {
    const ctx = createContext();
    const handler = vi.fn();
    const view = renderWith(ctx, { handler });

    expect(ctx.registerTool).toHaveBeenCalledTimes(2);

    view.rerenderWith({ handler });
    view.rerenderWith({ handler });

    expect(ctx.registerTool).toHaveBeenCalledTimes(2);
    expect(ctx.unregisterToolsByComponent).not.toHaveBeenCalled();
  });

  it('re-synchronise quand une declaration change', () => {
    const ctx = createContext();
    const handler = vi.fn();
    const view = renderWith(ctx, { handler });

    view.rerenderWith({ handler, description: 'Ajouter un produit au panier' });

    expect(ctx.unregisterToolsByComponent).toHaveBeenCalledTimes(1);
    expect(ctx.registerTool).toHaveBeenCalledTimes(4);
    const lastDeclaration = ctx.registerTool.mock.calls
      .map(([, declaration]: any[]) => declaration)
      .filter((declaration: any) => declaration.name === 'add_to_cart')
      .pop();
    expect(lastDeclaration.description).toBe('Ajouter un produit au panier');
  });

  it('appelle la derniere version du handler sans re-enregistrement', async () => {
    const ctx = createContext();
    const firstHandler = vi.fn().mockResolvedValue('first');
    const latestHandler = vi.fn().mockResolvedValue('latest');
    const view = renderWith(ctx, { handler: firstHandler });

    view.rerenderWith({ handler: latestHandler });

    const [, , registeredHandler] = ctx.registerTool.mock.calls.find(
      ([, declaration]: any[]) => declaration.name === 'add_to_cart'
    );
    const result = await registeredHandler({ productId: 'p_1' });

    expect(result).toBe('latest');
    expect(latestHandler).toHaveBeenCalledWith({ productId: 'p_1' });
    expect(firstHandler).not.toHaveBeenCalled();
    expect(ctx.registerTool).toHaveBeenCalledTimes(2);
  });

  it('desenregistre les tools au demontage', () => {
    const ctx = createContext();
    const view = renderWith(ctx, { handler: vi.fn() });

    view.unmount();

    expect(ctx.unregisterToolsByComponent).toHaveBeenCalledTimes(1);
  });
});

// Le resolver transmet le schema au client, qui valide avant l'approbation (#160).

const schema = z.object({ query: z.string().min(2) });

function renderResolver(ctx: any, hooks: Record<string, any> = {}, options: Record<string, any> = {}) {
  function Resolver() {
    useAgentToolResolver(
      { catalog: { prefix: 'catalog_', tools: { search: { description: 'Search', schema, handler: hooks.handler ?? (async (args: any) => args), ...hooks } } } },
      options
    );
    return null;
  }
  render(
    <OwlLayerContext.Provider value={ctx}>
      <Resolver />
    </OwlLayerContext.Provider>
  );
}

// Contexte branche sur un vrai client du core, comme OwlLayerProvider
function realContext() {
  const client = new OwlLayerClient({ endpoint: 'ws://localhost:3000/owllayer', apiKey: 'pk_test', autoReconnect: false });
  const ctx = {
    registerTool: (componentId: string, declaration: any, handler: any, global?: boolean, toolSchema?: any) =>
      client.registerTool({ declaration, handler, componentId, global, schema: toolSchema }),
    unregisterToolsByComponent: (componentId: string) => client.unregisterToolsByComponent(componentId),
  };
  return { client, ctx };
}

describe('useAgentToolResolver — validation deleguee au client', () => {
  it('transmet le schema de chaque tool au client', () => {
    const ctx = { registerTool: vi.fn(), unregisterToolsByComponent: vi.fn() };
    renderResolver(ctx);

    expect(ctx.registerTool).toHaveBeenCalledTimes(1);
    expect(ctx.registerTool.mock.calls[0][1].name).toBe('catalog_search');
    expect(ctx.registerTool.mock.calls[0][4]).toBe(schema);
  });

  it('le handler passe les arguments recus sans les revalider', async () => {
    const ctx = { registerTool: vi.fn(), unregisterToolsByComponent: vi.fn() };
    const handler = vi.fn(async (args: any) => args);
    renderResolver(ctx, { handler });

    await expect(ctx.registerTool.mock.calls[0][2]({ query: 'x' })).resolves.toEqual({ query: 'x' });
    expect(handler).toHaveBeenCalledWith({ query: 'x' });
  });

  it('avec le vrai client : un appel invalide est refuse sans handler ni hooks', async () => {
    const { client, ctx } = realContext();
    const handler = vi.fn(async (args: any) => args);
    const onBeforeCall = vi.fn();
    const onError = vi.fn();
    const onBeforeAnyCall = vi.fn();
    const onErrorAnyCall = vi.fn();
    renderResolver(ctx, { handler, onBeforeCall, onError }, { onBeforeAnyCall, onErrorAnyCall });

    await expect(client.callTool('catalog_search', { query: 'x' })).rejects.toThrow('Validation args "catalog_search"');
    expect(handler).not.toHaveBeenCalled();
    expect(onBeforeCall).not.toHaveBeenCalled();
    expect(onBeforeAnyCall).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(onErrorAnyCall).not.toHaveBeenCalled();
  });

  it('avec le vrai client : une erreur du handler passe toujours par onError et onErrorAnyCall', async () => {
    const { client, ctx } = realContext();
    const onError = vi.fn();
    const onErrorAnyCall = vi.fn();
    renderResolver(ctx, { handler: async () => { throw new Error('boom'); }, onError }, { onErrorAnyCall });

    await expect(client.callTool('catalog_search', { query: 'owl' })).rejects.toThrow('boom');
    expect(onError).toHaveBeenCalledWith({ query: 'owl' }, expect.objectContaining({ message: 'boom' }));
    expect(onErrorAnyCall).toHaveBeenCalledWith('catalog_search', { query: 'owl' }, expect.objectContaining({ message: 'boom' }));
  });
});
