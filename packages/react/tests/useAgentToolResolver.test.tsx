import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { z } from 'zod';
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
