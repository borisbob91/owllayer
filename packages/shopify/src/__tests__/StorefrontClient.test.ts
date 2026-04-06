import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorefrontClient, STOREFRONT_API_VERSION_DEFAULT, STOREFRONT_API_VERSION_LEGACY } from '../storefront/StorefrontClient.js';

describe('StorefrontClient', () => {
  const client = new StorefrontClient('my-store.myshopify.com', 'test-token-123');

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('utilise la version 2026-01 par défaut', () => {
    expect(client.apiVersion).toBe('2026-01');
    expect(STOREFRONT_API_VERSION_DEFAULT).toBe('2026-01');
  });

  it('accepte 2024-01 comme version legacy explicite', () => {
    const legacy = new StorefrontClient('my-store.myshopify.com', 'token', '2024-01');
    expect(legacy.apiVersion).toBe('2024-01');
    expect(STOREFRONT_API_VERSION_LEGACY).toBe('2024-01');
  });

  it('envoie la requête GraphQL avec les bons headers (version par défaut)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { product: { id: 'gid://shopify/Product/1' } } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await client.query<{ product: { id: string } }>('{ product(handle: "test") { id } }');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://my-store.myshopify.com/api/2026-01/graphql.json');
    expect((options.headers as Record<string, string>)['X-Shopify-Storefront-Access-Token']).toBe('test-token-123');
    expect((options.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('utilise la version legacy dans l\'URL si spécifiée', async () => {
    const legacy = new StorefrontClient('my-store.myshopify.com', 'token', '2024-01');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    }));
    await legacy.query('{ shop { name } }');
    const [url] = vi.mocked(fetch).mock.calls[0] as [string];
    expect(url).toBe('https://my-store.myshopify.com/api/2024-01/graphql.json');
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

  // ─── searchProducts ────────────────────────────────────────────────────────

  describe('searchProducts', () => {
    function mockProducts(nodes: unknown[]) {
      return vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { products: { edges: nodes.map((node) => ({ node })) } },
        }),
      });
    }

    it('envoie query texte + first dans les variables', async () => {
      const mockFetch = mockProducts([]);
      vi.stubGlobal('fetch', mockFetch);

      await client.searchProducts('veste imperméable');

      const call = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse((call[1] as RequestInit).body as string) as {
        variables: { query: string; first: number };
      };
      expect(body.variables.query).toBe('veste imperméable');
      expect(body.variables.first).toBe(5);
    });

    it('construit le filtre prix avec variants.price:>=X AND variants.price:<=X', async () => {
      vi.stubGlobal('fetch', mockProducts([]));

      await client.searchProducts('veste', { minPrice: 50, maxPrice: 150 });

      const call = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse((call[1] as RequestInit).body as string) as {
        variables: { query: string };
      };
      expect(body.variables.query).toContain('variants.price:>=50');
      expect(body.variables.query).toContain('variants.price:<=150');
    });

    it('applique les filtres productType et tag', async () => {
      vi.stubGlobal('fetch', mockProducts([]));

      await client.searchProducts('t-shirt', { productType: 'Veste', tag: 'soldes' });

      const call = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse((call[1] as RequestInit).body as string) as {
        variables: { query: string };
      };
      expect(body.variables.query).toContain('product_type:"Veste"');
      expect(body.variables.query).toContain('tag:"soldes"');
    });

    it('plafonne limit à 20', async () => {
      vi.stubGlobal('fetch', mockProducts([]));

      await client.searchProducts('', { limit: 99 });

      const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string) as {
        variables: { first: number };
      };
      expect(body.variables.first).toBe(20);
    });

    it('retourne un tableau de produits mappés depuis edges.node', async () => {
      const fakeProduct = { id: 'gid://shopify/Product/1', handle: 'red-shirt', title: 'Red Shirt' };
      vi.stubGlobal('fetch', mockProducts([fakeProduct]));

      const results = await client.searchProducts('shirt');
      expect(results).toHaveLength(1);
      expect(results[0].handle).toBe('red-shirt');
    });
  });

  // ─── getProduct ────────────────────────────────────────────────────────────

  describe('getProduct', () => {
    it('retourne le produit si trouvé', async () => {
      const fakeProduct = { id: 'gid://shopify/Product/1', handle: 'veste-alpine', title: 'Veste Alpine' };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { product: fakeProduct } }),
      }));

      const p = await client.getProduct('veste-alpine');
      expect(p?.handle).toBe('veste-alpine');
    });

    it('retourne null si produit non trouvé', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { product: null } }),
      }));

      const p = await client.getProduct('inexistant');
      expect(p).toBeNull();
    });

    it('passe le handle dans les variables', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { product: null } }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await client.getProduct('mon-produit');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as {
        variables: { handle: string };
      };
      expect(body.variables.handle).toBe('mon-produit');
    });
  });

  // ─── getProductRecommendations ─────────────────────────────────────────────

  describe('getProductRecommendations', () => {
    it('retourne un tableau direct (pas edges/nodes)', async () => {
      const fakeRecs = [
        { id: 'gid://shopify/Product/2', handle: 'produit-reco', title: 'Reco' },
      ];
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { productRecommendations: fakeRecs } }),
      }));

      const recs = await client.getProductRecommendations('gid://shopify/Product/1');
      expect(recs).toHaveLength(1);
      expect(recs[0].handle).toBe('produit-reco');
    });

    it('passe productId dans les variables', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { productRecommendations: [] } }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await client.getProductRecommendations('gid://shopify/Product/99');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as {
        variables: { productId: string };
      };
      expect(body.variables.productId).toBe('gid://shopify/Product/99');
    });
  });
});
