// Sprint 3 — Unit tests for ProductTools
// Covers: search_products, get_product, navigate_to_product, navigate_to_category

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerProductTools } from '../tools/ProductTools.js';
import type { StoreApiClient } from '../api/StoreApiClient.js';
import type { WooProduct } from '../types.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<WooProduct> = {}): WooProduct {
  return {
    id: 42,
    name: 'Robe d\'été fleurie',
    slug: 'robe-ete-fleurie',
    parent: 0,
    type: 'simple',
    permalink: 'https://shop.example.com/produit/robe-ete-fleurie/',
    sku: 'ROBE-ETE-001',
    short_description: '<p>Robe légère pour l\'été.</p>',
    description: '<p>Description complète de la robe.</p>',
    on_sale: true,
    prices: {
      price: '3999',
      regular_price: '4999',
      sale_price: '3999',
      price_range: null,
      currency_code: 'EUR',
      currency_minor_unit: 2,
    },
    categories: [
      { id: 5, name: 'Robes', slug: 'robes', link: 'https://shop.example.com/product-category/robes/' },
    ],
    attributes: [
      {
        id: 1,
        name: 'Taille',
        taxonomy: 'pa_taille',
        has_variations: true,
        terms: [
          { id: 10, name: 'S', slug: 's' },
          { id: 11, name: 'M', slug: 'm' },
          { id: 12, name: 'L', slug: 'l' },
        ],
      },
    ],
    variations: [
      { id: 101, attributes: [{ name: 'Taille', value: 'S' }] },
      { id: 102, attributes: [{ name: 'Taille', value: 'M' }] },
      { id: 103, attributes: [{ name: 'Taille', value: 'L' }] },
    ],
    has_options: true,
    is_purchasable: true,
    is_in_stock: true,
    is_on_backorder: false,
    low_stock_remaining: null,
    ...overrides,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDomosMock() {
  return { registerTool: vi.fn() };
}

function makeApiMock(overrides: Partial<{ get: ReturnType<typeof vi.fn> }> = {}): StoreApiClient {
  return {
    get:  vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({}),
    put:  vi.fn().mockResolvedValue({}),
    del:  vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as StoreApiClient;
}

function getHandler(domos: ReturnType<typeof makeDomosMock>, name: string) {
  const call = domos.registerTool.mock.calls.find(c => c[0] === name);
  if (!call) throw new Error(`Tool "${name}" was not registered`);
  return call[1].handler as (params: Record<string, unknown>) => unknown;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('registerProductTools', () => {
  let domos: ReturnType<typeof makeDomosMock>;
  let api: StoreApiClient;

  beforeEach(() => {
    domos = makeDomosMock();
    api = makeApiMock();
    registerProductTools(domos, api);
  });

  it('enregistre les 4 tools', () => {
    const names = domos.registerTool.mock.calls.map(c => c[0] as string);
    expect(names).toContain('search_products');
    expect(names).toContain('get_product');
    expect(names).toContain('navigate_to_product');
    expect(names).toContain('navigate_to_category');
    expect(names).toHaveLength(4);
  });

  // ── search_products ────────────────────────────────────────────────────────

  describe('search_products', () => {
    it('appelle GET /products avec search et per_page par défaut (5)', async () => {
      const handler = getHandler(domos, 'search_products');
      await handler({ query: 'robe' });
      const url = (api.get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toContain('search=robe');
      expect(url).toContain('per_page=5');
    });

    it('respecte le paramètre limit', async () => {
      const handler = getHandler(domos, 'search_products');
      await handler({ query: 'robe', limit: 10 });
      const url = (api.get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toContain('per_page=10');
    });

    it('convertit minPrice en minor units ×100', async () => {
      const handler = getHandler(domos, 'search_products');
      await handler({ query: 'robe', minPrice: 50 });
      const url = (api.get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toContain('min_price=5000');
      expect(url).not.toContain('min_price=50&');
    });

    it('convertit maxPrice en minor units ×100', async () => {
      const handler = getHandler(domos, 'search_products');
      await handler({ query: 'robe', maxPrice: 99.99 });
      const url = (api.get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toContain('max_price=9999');
    });

    it('passe le paramètre category (slug ou ID)', async () => {
      const handler = getHandler(domos, 'search_products');
      await handler({ query: 'robe', category: 'robes' });
      const url = (api.get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toContain('category=robes');
    });

    it('passe on_sale=true si onSale est true', async () => {
      const handler = getHandler(domos, 'search_products');
      await handler({ query: 'robe', onSale: true });
      const url = (api.get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toContain('on_sale=true');
    });

    it('n\'inclut pas on_sale si onSale est false/absent', async () => {
      const handler = getHandler(domos, 'search_products');
      await handler({ query: 'robe' });
      const url = (api.get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).not.toContain('on_sale');
    });

    it('mappe les résultats avec is_in_stock (pas inStock)', async () => {
      const api2 = makeApiMock({ get: vi.fn().mockResolvedValue([makeProduct()]) });
      const d2 = makeDomosMock();
      registerProductTools(d2, api2);
      const handler = getHandler(d2, 'search_products');
      const result = await handler({ query: 'robe' }) as { results: Record<string, unknown>[] };
      expect(result.results[0]).toHaveProperty('is_in_stock', true);
      expect(result.results[0]).not.toHaveProperty('inStock');
    });

    it('mappe les résultats avec low_stock_remaining (pas stockQuantity)', async () => {
      const api2 = makeApiMock({ get: vi.fn().mockResolvedValue([makeProduct({ low_stock_remaining: 3 })]) });
      const d2 = makeDomosMock();
      registerProductTools(d2, api2);
      const handler = getHandler(d2, 'search_products');
      const result = await handler({ query: 'robe' }) as { results: Record<string, unknown>[] };
      expect(result.results[0]).toHaveProperty('low_stock_remaining', 3);
      expect(result.results[0]).not.toHaveProperty('stockQuantity');
    });

    it('mappe categories en tableau d\'objets {id, name, slug}', async () => {
      const api2 = makeApiMock({ get: vi.fn().mockResolvedValue([makeProduct()]) });
      const d2 = makeDomosMock();
      registerProductTools(d2, api2);
      const handler = getHandler(d2, 'search_products');
      const result = await handler({ query: 'robe' }) as { results: Record<string, unknown>[] };
      const cats = result.results[0].categories as Array<Record<string, unknown>>;
      expect(cats[0]).toEqual({ id: 5, name: 'Robes', slug: 'robes' });
    });

    it('retourne un tableau vide si aucun résultat', async () => {
      const handler = getHandler(domos, 'search_products');
      const result = await handler({ query: 'xyz_inexistant' }) as { results: unknown[] };
      expect(result.results).toHaveLength(0);
    });
  });

  // ── get_product ────────────────────────────────────────────────────────────

  describe('get_product', () => {
    it('appelle GET /products/{id} si id fourni', async () => {
      const api2 = makeApiMock({ get: vi.fn().mockResolvedValue(makeProduct()) });
      const d2 = makeDomosMock();
      registerProductTools(d2, api2);
      const handler = getHandler(d2, 'get_product');
      await handler({ id: 42 });
      expect(api2.get).toHaveBeenCalledWith('/products/42');
    });

    it('appelle GET /products?slug=... si slug fourni', async () => {
      const api2 = makeApiMock({ get: vi.fn().mockResolvedValue([makeProduct()]) });
      const d2 = makeDomosMock();
      registerProductTools(d2, api2);
      const handler = getHandler(d2, 'get_product');
      await handler({ slug: 'robe-ete-fleurie' });
      expect(api2.get).toHaveBeenCalledWith('/products?slug=robe-ete-fleurie');
    });

    it('retourne erreur si slug introuvable (liste vide)', async () => {
      const api2 = makeApiMock({ get: vi.fn().mockResolvedValue([]) });
      const d2 = makeDomosMock();
      registerProductTools(d2, api2);
      const handler = getHandler(d2, 'get_product');
      const result = await handler({ slug: 'inexistant' }) as Record<string, unknown>;
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('inexistant');
    });

    it('retourne erreur si ni id ni slug fourni', async () => {
      const handler = getHandler(domos, 'get_product');
      const result = await handler({}) as Record<string, unknown>;
      expect(result).toHaveProperty('error');
    });

    it('retourne is_in_stock et not inStock', async () => {
      const api2 = makeApiMock({ get: vi.fn().mockResolvedValue(makeProduct({ is_in_stock: false })) });
      const d2 = makeDomosMock();
      registerProductTools(d2, api2);
      const handler = getHandler(d2, 'get_product');
      const result = await handler({ id: 42 }) as Record<string, unknown>;
      expect(result).toHaveProperty('is_in_stock', false);
      expect(result).not.toHaveProperty('inStock');
    });

    it('retourne is_on_backorder', async () => {
      const api2 = makeApiMock({ get: vi.fn().mockResolvedValue(makeProduct({ is_on_backorder: true })) });
      const d2 = makeDomosMock();
      registerProductTools(d2, api2);
      const handler = getHandler(d2, 'get_product');
      const result = await handler({ id: 42 }) as Record<string, unknown>;
      expect(result).toHaveProperty('is_on_backorder', true);
    });

    it('retourne attributes avec options[] (noms des termes)', async () => {
      const api2 = makeApiMock({ get: vi.fn().mockResolvedValue(makeProduct()) });
      const d2 = makeDomosMock();
      registerProductTools(d2, api2);
      const handler = getHandler(d2, 'get_product');
      const result = await handler({ id: 42 }) as Record<string, unknown>;
      const attrs = result.attributes as Array<Record<string, unknown>>;
      expect(attrs[0]).toMatchObject({ id: 1, name: 'Taille', has_variations: true });
      expect(attrs[0].options).toEqual(['S', 'M', 'L']);
    });

    it('retourne variations embarquées avec attributes en Record', async () => {
      const api2 = makeApiMock({ get: vi.fn().mockResolvedValue(makeProduct()) });
      const d2 = makeDomosMock();
      registerProductTools(d2, api2);
      const handler = getHandler(d2, 'get_product');
      const result = await handler({ id: 42 }) as Record<string, unknown>;
      const vars = result.variations as Array<Record<string, unknown>>;
      expect(vars).toHaveLength(3);
      expect(vars[0]).toEqual({ id: 101, attributes: { Taille: 'S' } });
      expect(vars[1]).toEqual({ id: 102, attributes: { Taille: 'M' } });
    });

    it('retourne categories en tableau d\'objets (pas string[])', async () => {
      const api2 = makeApiMock({ get: vi.fn().mockResolvedValue(makeProduct()) });
      const d2 = makeDomosMock();
      registerProductTools(d2, api2);
      const handler = getHandler(d2, 'get_product');
      const result = await handler({ id: 42 }) as Record<string, unknown>;
      const cats = result.categories as Array<Record<string, unknown>>;
      expect(cats[0]).toEqual({ id: 5, name: 'Robes', slug: 'robes' });
    });

    it('retourne priceRange null pour produit simple', async () => {
      const api2 = makeApiMock({ get: vi.fn().mockResolvedValue(makeProduct()) });
      const d2 = makeDomosMock();
      registerProductTools(d2, api2);
      const handler = getHandler(d2, 'get_product');
      const result = await handler({ id: 42 }) as Record<string, unknown>;
      expect(result.priceRange).toBeNull();
    });

    it('retourne priceRange pour produit variable', async () => {
      const product = makeProduct({
        type: 'variable',
        prices: {
          price: '3999',
          regular_price: '4999',
          sale_price: '3999',
          price_range: { min_amount: '3999', max_amount: '7999' },
          currency_code: 'EUR',
          currency_minor_unit: 2,
        },
      });
      const api2 = makeApiMock({ get: vi.fn().mockResolvedValue(product) });
      const d2 = makeDomosMock();
      registerProductTools(d2, api2);
      const handler = getHandler(d2, 'get_product');
      const result = await handler({ id: 42 }) as Record<string, unknown>;
      expect(result.priceRange).toEqual({ min_amount: '3999', max_amount: '7999' });
    });
  });

  // ── navigate_to_product ────────────────────────────────────────────────────

  describe('navigate_to_product', () => {
    let windowMock: { location: { href: string } };

    beforeEach(() => {
      windowMock = { location: { href: '' } };
      vi.stubGlobal('window', windowMock);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('navigue via permalink si fourni', () => {
      const handler = getHandler(domos, 'navigate_to_product');
      const url = 'https://shop.example.com/produit/robe-ete-fleurie/';
      handler({ permalink: url });
      expect(windowMock.location.href).toBe(url);
    });

    it('retourne navigated: true et l\'url avec permalink', () => {
      const handler = getHandler(domos, 'navigate_to_product');
      const url = 'https://shop.example.com/produit/robe-ete-fleurie/';
      const result = handler({ permalink: url }) as Record<string, unknown>;
      expect(result).toEqual({ navigated: true, url });
    });

    it('navigue via /product/{slug} si seulement slug fourni', () => {
      const handler = getHandler(domos, 'navigate_to_product');
      handler({ slug: 'robe-ete-fleurie' });
      expect(windowMock.location.href).toBe('/product/robe-ete-fleurie');
    });

    it('préfère permalink sur slug si les deux fournis', () => {
      const handler = getHandler(domos, 'navigate_to_product');
      const url = 'https://shop.example.com/produit/robe/';
      handler({ permalink: url, slug: 'robe-ete-fleurie' });
      expect(windowMock.location.href).toBe(url);
    });

    it('retourne erreur si ni permalink ni slug fourni', () => {
      const handler = getHandler(domos, 'navigate_to_product');
      const result = handler({}) as Record<string, unknown>;
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });
  });

  // ── navigate_to_category ───────────────────────────────────────────────────

  describe('navigate_to_category', () => {
    let windowMock: { location: { href: string } };

    beforeEach(() => {
      windowMock = { location: { href: '' } };
      vi.stubGlobal('window', windowMock);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('navigue vers /product-category/{slug}', () => {
      const handler = getHandler(domos, 'navigate_to_category');
      handler({ slug: 'robes' });
      expect(windowMock.location.href).toBe('/product-category/robes');
    });

    it('retourne navigated: true et l\'url', () => {
      const handler = getHandler(domos, 'navigate_to_category');
      const result = handler({ slug: 'robes' }) as Record<string, unknown>;
      expect(result).toEqual({ navigated: true, url: '/product-category/robes' });
    });

    it('construit correctement l\'url avec un slug composé', () => {
      const handler = getHandler(domos, 'navigate_to_category');
      handler({ slug: 'robes-ete' });
      expect(windowMock.location.href).toBe('/product-category/robes-ete');
    });
  });
});
