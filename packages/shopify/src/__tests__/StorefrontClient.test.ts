import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorefrontClient } from '../storefront/StorefrontClient.js';

describe('StorefrontClient', () => {
  const client = new StorefrontClient('my-store.myshopify.com', 'test-token-123');

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('envoie la requête GraphQL avec les bons headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { product: { id: 'gid://shopify/Product/1' } } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await client.query<{ product: { id: string } }>('{ product(handle: "test") { id } }');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://my-store.myshopify.com/api/2024-01/graphql.json');
    expect((options.headers as Record<string, string>)['X-Shopify-Storefront-Access-Token']).toBe('test-token-123');
    expect((options.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('retourne les données data de la réponse', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { shop: { name: 'Ma Boutique' } } }),
    }));

    const result = await client.query<{ shop: { name: string } }>('{ shop { name } }');
    expect(result.shop.name).toBe('Ma Boutique');
  });

  it('lève une erreur si HTTP non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(client.query('{ shop { name } }')).rejects.toThrow('Storefront API error: 401');
  });

  it('lève une erreur si la réponse contient des errors GraphQL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: null,
        errors: [{ message: 'Field not found' }],
      }),
    }));
    await expect(client.query('{ invalid }')).rejects.toThrow();
  });

  it('passe les variables en JSON dans le body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await client.query('query Test($id: ID!) { product(id: $id) { id } }', { id: 'gid://shopify/Product/42' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { variables: Record<string, unknown> };
    expect(body.variables).toEqual({ id: 'gid://shopify/Product/42' });
  });
});
