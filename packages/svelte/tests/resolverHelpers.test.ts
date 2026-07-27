import { describe, expect, it, vi } from 'vitest';
import { createCRUDResolver } from '../src/actions/resolverHelpers.js';

describe('createCRUDResolver', () => {
  it('creates browser-safe CRUD tools with Zod schemas', async () => {
    const onCreate = vi.fn();
    const resolver = createCRUDResolver('product', { onCreate });
    const createTool = resolver.product.tools.create;

    const args = createTool.schema.parse({ data: { name: 'DomOS' } });
    await createTool.handler(args);

    expect(onCreate).toHaveBeenCalledWith({ name: 'DomOS' });
  });
});
