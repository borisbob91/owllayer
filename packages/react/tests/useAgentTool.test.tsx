import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { z } from 'zod';
import { OwlLayerContext } from '../src/provider/OwlLayerContext.js';
import { useAgentTool } from '../src/hooks/useAgentTool.js';

// Le schema part au client, qui valide avant l'approbation (#160).

function Tool({ schema, callback }: { schema?: z.ZodTypeAny; callback: (args: any) => unknown }) {
  useAgentTool({ name: 'pay', description: 'Pay', risk: 'critical', schema }, callback);
  return null;
}

function renderTool(props: { schema?: z.ZodTypeAny; callback: (args: any) => unknown }) {
  const ctx = { registerTool: vi.fn(), unregisterTool: vi.fn() } as any;
  render(
    <OwlLayerContext.Provider value={ctx}>
      <Tool {...props} />
    </OwlLayerContext.Provider>
  );
  return ctx;
}

describe('useAgentTool — validation deleguee au client', () => {
  it('transmet le schema au client', () => {
    const schema = z.object({ amount: z.number() });
    const ctx = renderTool({ schema, callback: vi.fn() });

    expect(ctx.registerTool).toHaveBeenCalledTimes(1);
    expect(ctx.registerTool.mock.calls[0][4]).toBe(schema);
  });

  it('sans schema, l appel garde 4 arguments', () => {
    const ctx = renderTool({ callback: vi.fn() });

    expect(ctx.registerTool.mock.calls[0]).toHaveLength(4);
  });

  it('le handler passe les arguments recus au callback sans les revalider', async () => {
    const callback = vi.fn(async (args) => args);
    const ctx = renderTool({ schema: z.object({ amount: z.number() }), callback });
    const handler = ctx.registerTool.mock.calls[0][2];

    await expect(handler({ amount: 'deja parse par le client' })).resolves.toEqual({ amount: 'deja parse par le client' });
    expect(callback).toHaveBeenCalledWith({ amount: 'deja parse par le client' });
  });
});
