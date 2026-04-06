// Sprint 8 - Unit tests for RecommendationTools
// Covers: get_recommendations (related, on_sale, upsell, filters, dispatch, limit)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerRecommendationTools } from '../tools/RecommendationTools.js';
import type { StoreApiClient } from '../api/StoreApiClient.js';
import type { WooProduct } from '../types.js';

// --- Fixtures ----------------------------------------------------------------

function makeProduct(overrides: Partial<WooProduct> = {}): WooProduct {
  return {
    id: 10,
    name: 'Produit Test',
    slug: 'produit-test',
    parent: 0,
    type: 'simple',
    permalink: 'https://shop.example.com/produit/produit-test/',
    sku: 'TEST-001',
    short_description: '',
    description: '',
    on_sale: false,
    prices: {
      price: '2000',
      regular_price: '2000',
      sale_price: '2000',
      price_range: null,
      currency_code: 'EUR',
      currency_minor_unit: 2,
    },
    categories: [{ id: 5, name: 'Robes', slug: 'robes', link: '' }],
    attributes: [],
    variations: [],
    has_options: false,
    is_purchasable: true,
    is_in_stock: true,
    is_on_backorder: false,
    low_stock_remaining: null,
    ...overrides,
  };
}

function makeDomosMock() {
  return { registerTool: vi.fn() };
}

function makeApiMock(products: WooProduct[] = []): StoreApiClient {
  return {
    get: vi.fn().mockResolvedValue(products),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    del: vi.fn().mockResolvedValue({}),
  } as unknown as StoreApiClient;
}

function getHandler(domos: ReturnType<typeof makeDomosMock>, name: string) {
  const call = domos.registerTool.mock.calls.find(c => c[0] === name);
  if (!call) throw new Error(`Tool "${name}" was not registered`);
  return call[1].handler as (params: Record<string, unknown>) => Promise<unknown>;
}

function injectWooContext(data: Record<string, unknown>): HTMLScriptElement {
  const el = document.createElement('script');
  el.id = 'domos-woo-context';
  el.type = 'application/json';
  el.textContent = JSON.stringify(data);
  document.body.appendChild(el);
  return el;
}

// --- Tests -------------------------------------------------------------------

describe('registerRecommendationTools', () => {
  let domos: ReturnType<typeof makeDomosMock>;
  let api: StoreApiClient;

  beforeEach(() => {
    domos = makeDomosMock();
    api = makeApiMock();
    registerRecommendationTools(domos, api);
  });

  afterEach(() => {
    // Nettoyer le contexte injecte
    const el = document.getElementById('domos-woo-context');
    if (el) el.remove();
    vi.unstubAllGlobals();
  });

  it('enregistre le tool get_recommendations', () => {
    const names = domos.registerTool.mock.calls.map(c => c[0] as string);
    expect(names).toContain('get_recommendations');
  });

  it('a risk: "none" defini sur le tool', () => {
    const call = domos.registerTool.mock.calls.find(c => c[0] === 'get_recommendations');
    expect(call![1].risk).toBe('none');
  });

  // -- context related -------------------------------------------------------

  it('context "related" envoie category= dans la query string', async () => {
    injectWooContext({ product: { id: 1, categories: [{ id: 5 }] } });
    const api2 = makeApiMock([makeProduct({ id: 2 })]);
    const domos2 = makeDomosMock();
    registerRecommendationTools(domos2, api2);
    const handler = getHandler(domos2, 'get_recommendations');
    await handler({ context: 'related' });
    const url = (api2.get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('category=5');
  });

  // -- context on_sale -------------------------------------------------------

  it('context "on_sale" envoie on_sale=true dans la query string', async () => {
    const api2 = makeApiMock([makeProduct()]);
    const domos2 = makeDomosMock();
    registerRecommendationTools(domos2, api2);
    const handler = getHandler(domos2, 'get_recommendations');
    await handler({ context: 'on_sale' });
    const url = (api2.get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('on_sale=true');
  });

  // -- context upsell --------------------------------------------------------

  it('context "upsell" n\'envoie pas on_sale ni category', async () => {
    const api2 = makeApiMock([makeProduct()]);
    const domos2 = makeDomosMock();
    registerRecommendationTools(domos2, api2);
    const handler = getHandler(domos2, 'get_recommendations');
    await handler({ context: 'upsell' });
    const url = (api2.get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).not.toContain('on_sale');
    expect(url).not.toContain('category');
  });

  // -- filtre produit courant ------------------------------------------------

  it('filtre le produit actuellement consulte (meme id)', async () => {
    injectWooContext({ product: { id: 42, categories: [{ id: 5 }] } });
    const api2 = makeApiMock([makeProduct({ id: 42 }), makeProduct({ id: 99, name: 'Autre' })]);
    const domos2 = makeDomosMock();
    registerRecommendationTools(domos2, api2);
    const handler = getHandler(domos2, 'get_recommendations');
    const result = await handler({ context: 'related' }) as Record<string, unknown>;
    const products = result.products as Array<{ id: number }>;
    expect(products.find(p => p.id === 42)).toBeUndefined();
    expect(products.find(p => p.id === 99)).toBeDefined();
  });

  // -- filtre is_in_stock ----------------------------------------------------

  it('filtre les produits hors stock', async () => {
    const api2 = makeApiMock([
      makeProduct({ id: 1, is_in_stock: true }),
      makeProduct({ id: 2, is_in_stock: false }),
    ]);
    const domos2 = makeDomosMock();
    registerRecommendationTools(domos2, api2);
    const handler = getHandler(domos2, 'get_recommendations');
    const result = await handler({ context: 'upsell' }) as Record<string, unknown>;
    const products = result.products as Array<{ id: number }>;
    expect(products.every(p => p.id !== 2)).toBe(true);
    expect(products.find(p => p.id === 1)).toBeDefined();
  });

  // -- limit cap -------------------------------------------------------------

  it('plafonne limit a 8 meme si on envoie 20', async () => {
    const many = Array.from({ length: 15 }, (_, i) => makeProduct({ id: i + 1 }));
    const api2 = makeApiMock(many);
    const domos2 = makeDomosMock();
    registerRecommendationTools(domos2, api2);
    const handler = getHandler(domos2, 'get_recommendations');
    const result = await handler({ context: 'upsell', limit: 20 }) as Record<string, unknown>;
    const products = result.products as unknown[];
    expect(products.length).toBeLessThanOrEqual(8);
    const url = (api2.get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('per_page=8');
  });

  // -- 0 resultats -----------------------------------------------------------

  it('retourne success:true avec products:[] si aucun produit disponible', async () => {
    const handler = getHandler(domos, 'get_recommendations');
    const result = await handler({ context: 'on_sale' }) as Record<string, unknown>;
    expect(result.success).toBe(true);
    expect(result.products).toEqual([]);
    expect(typeof result.message).toBe('string');
  });

  // -- dispatch domos:ui:show_products ---------------------------------------

  it('dispatche domos:ui:show_products avec les produits filtrés', async () => {
    const api2 = makeApiMock([makeProduct({ id: 7, name: 'T-shirt', is_in_stock: true })]);
    const domos2 = makeDomosMock();
    registerRecommendationTools(domos2, api2);
    const handler = getHandler(domos2, 'get_recommendations');

    const events: CustomEvent[] = [];
    window.addEventListener('domos:ui:show_products', (e) => events.push(e as CustomEvent));
    await handler({ context: 'upsell' });
    window.removeEventListener('domos:ui:show_products', (e) => events.push(e as CustomEvent));

    expect(events).toHaveLength(1);
    expect(events[0].detail.products).toBeInstanceOf(Array);
    expect(events[0].detail.products.length).toBeGreaterThan(0);
  });

  // -- structure de la reponse -----------------------------------------------

  it('retourne success, count, context et products[{id,name}]', async () => {
    const api2 = makeApiMock([makeProduct({ id: 3, name: 'Jupe fleurie', is_in_stock: true })]);
    const domos2 = makeDomosMock();
    registerRecommendationTools(domos2, api2);
    const handler = getHandler(domos2, 'get_recommendations');
    const result = await handler({ context: 'on_sale' }) as Record<string, unknown>;
    expect(result.success).toBe(true);
    expect(typeof result.count).toBe('number');
    expect(result.context).toBe('on_sale');
    const products = result.products as Array<{ id: number; name: string }>;
    expect(products[0]).toMatchObject({ id: 3, name: 'Jupe fleurie' });
  });
});
