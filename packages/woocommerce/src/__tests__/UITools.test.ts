// Sprint 6 — Unit tests for UITools
// Covers: wooProductToUI, wooCartItemToUI, formatWooPrice, all 6 registered tools dispatch correct events

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatWooPrice,
  wooProductToUI,
  wooCartItemToUI,
  registerUITools,
} from '../tools/UITools.js';
import type { WooProduct, WooCartItem } from '../types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeOwlLayerMock() {
  return { registerTool: vi.fn() };
}

function getHandler(owllayer: ReturnType<typeof makeOwlLayerMock>, name: string) {
  const call = owllayer.registerTool.mock.calls.find((c) => c[0] === name);
  if (!call) throw new Error(`Tool "${name}" was not registered`);
  return call[1].handler as (args: Record<string, unknown>) => unknown;
}

function makeProduct(overrides: Partial<WooProduct> = {}): WooProduct {
  return {
    id: 7,
    name: 'Test Produit',
    slug: 'test-produit',
    parent: 0, type: 'simple', permalink: '/test', sku: 'SKU01',
    short_description: '<p>Description courte</p>',
    description: 'Description longue',
    on_sale: false,
    images: [{ id: 1, src: 'https://example.com/img.jpg' }],
    prices: { price: '1999', regular_price: '2499', sale_price: '1999', price_range: null, currency_code: 'EUR', currency_minor_unit: 2 },
    categories: [],
    attributes: [],
    variations: [{ id: 11, attributes: [{ name: 'Couleur', value: 'Rouge' }] }],
    has_options: true,
    is_purchasable: true,
    is_in_stock: true,
    is_on_backorder: false,
    low_stock_remaining: null,
    ...overrides,
  };
}

function makeCartItem(overrides: Partial<WooCartItem> = {}): WooCartItem {
  return {
    key: 'cart_key_abc',
    id: 7,
    quantity: 2,
    name: 'Test Produit',
    prices: { price: '1999', regular_price: '2499', currency_code: 'EUR' },
    totals: { line_total: '3998' },
    images: [{ id: 1, src: 'https://example.com/img.jpg' }],
    ...overrides,
  };
}

// ─── formatWooPrice ────────────────────────────────────────────────────────────

describe('formatWooPrice()', () => {
  it('convertit un minor-unit en prix affiché', () => {
    expect(formatWooPrice('1999', 'EUR')).toBe('19.99 EUR');
  });

  it('gère les multiples de 100', () => {
    expect(formatWooPrice('10000', 'USD')).toBe('100.00 USD');
  });

  it('retourne la valeur brute si non numérique', () => {
    expect(formatWooPrice('N/A', 'EUR')).toBe('N/A');
  });
});

// ─── wooProductToUI ────────────────────────────────────────────────────────────

describe('wooProductToUI()', () => {
  it('mappe les champs principaux', () => {
    const ui = wooProductToUI(makeProduct());
    expect(ui.id).toBe('7');
    expect(ui.handle).toBe('test-produit');
    expect(ui.title).toBe('Test Produit');
    expect(ui.price).toBe('19.99 EUR');
    expect(ui.available).toBe(true);
    expect(ui.imageUrl).toBe('https://example.com/img.jpg');
  });

  it('calcule compareAtPrice si regular !== price', () => {
    const ui = wooProductToUI(makeProduct());
    expect(ui.compareAtPrice).toBe('24.99 EUR');
  });

  it('compareAtPrice est undefined si regular === price', () => {
    const ui = wooProductToUI(makeProduct({ prices: { price: '1999', regular_price: '1999', sale_price: '1999', price_range: null, currency_code: 'EUR', currency_minor_unit: 2 } }));
    expect(ui.compareAtPrice).toBeUndefined();
  });

  it('strip le HTML de short_description', () => {
    const ui = wooProductToUI(makeProduct());
    expect(ui.description).toBe('Description courte');
  });

  it("imageUrl vide si pas d'images", () => {
    const ui = wooProductToUI(makeProduct({ images: [] }));
    expect(ui.imageUrl).toBe('');
  });

  it('mappe les variations', () => {
    const ui = wooProductToUI(makeProduct());
    expect(ui.variants).toHaveLength(1);
    expect(ui.variants![0].title).toBe('Rouge');
  });
});

// ─── wooCartItemToUI ───────────────────────────────────────────────────────────

describe('wooCartItemToUI()', () => {
  it('mappe les champs correctement', () => {
    const ui = wooCartItemToUI(makeCartItem());
    expect(ui.id).toBe('cart_key_abc');
    expect(ui.title).toBe('Test Produit');
    expect(ui.price).toBe('19.99 EUR');
    expect(ui.quantity).toBe(2);
    expect(ui.imageUrl).toBe('https://example.com/img.jpg');
  });

  it("imageUrl vide si item sans images", () => {
    const ui = wooCartItemToUI(makeCartItem({ images: undefined }));
    expect(ui.imageUrl).toBe('');
  });
});

// ─── registerUITools — events dispatched ──────────────────────────────────────

describe('registerUITools()', () => {
  let dispatched: CustomEvent[] = [];

  beforeEach(() => {
    dispatched = [];
    window.addEventListener('owllayer:ui:show_products', (e) => dispatched.push(e as CustomEvent));
    window.addEventListener('owllayer:ui:show_product_detail', (e) => dispatched.push(e as CustomEvent));
    window.addEventListener('owllayer:ui:show_cart', (e) => dispatched.push(e as CustomEvent));
    window.addEventListener('owllayer:ui:show_notification', (e) => dispatched.push(e as CustomEvent));
    window.addEventListener('owllayer:ui:close_panel', (e) => dispatched.push(e as CustomEvent));
    window.addEventListener('owllayer:ui:show_upsell', (e) => dispatched.push(e as CustomEvent));
  });

  afterEach(() => {
    // remove listeners to avoid cross-test pollution
    dispatched = [];
  });

  it('enregistre les 6 tools', () => {
    const owllayer = makeOwlLayerMock();
    registerUITools(owllayer);
    const names = owllayer.registerTool.mock.calls.map((c) => c[0]);
    expect(names).toContain('show_products');
    expect(names).toContain('show_product_detail');
    expect(names).toContain('show_cart');
    expect(names).toContain('show_notification');
    expect(names).toContain('close_panel');
    expect(names).toContain('show_upsell');
  });

  it('show_products dispatch owllayer:ui:show_products', () => {
    const owllayer = makeOwlLayerMock();
    registerUITools(owllayer);
    getHandler(owllayer, 'show_products')({ query: 'test', products: [] });
    expect(dispatched.find((e) => e.type === 'owllayer:ui:show_products')).toBeDefined();
  });

  it('show_product_detail dispatch avec product', () => {
    const owllayer = makeOwlLayerMock();
    registerUITools(owllayer);
    const product = wooProductToUI(makeProduct());
    getHandler(owllayer, 'show_product_detail')({ product });
    const ev = dispatched.find((e) => e.type === 'owllayer:ui:show_product_detail');
    expect(ev?.detail.product.id).toBe('7');
  });

  it('show_product_detail retourne error si product manquant', () => {
    const owllayer = makeOwlLayerMock();
    registerUITools(owllayer);
    const result = getHandler(owllayer, 'show_product_detail')({}) as { success: boolean };
    expect(result.success).toBe(false);
  });

  it('show_cart dispatch owllayer:ui:show_cart', () => {
    const owllayer = makeOwlLayerMock();
    registerUITools(owllayer);
    getHandler(owllayer, 'show_cart')({});
    expect(dispatched.find((e) => e.type === 'owllayer:ui:show_cart')).toBeDefined();
  });

  it('show_notification dispatch avec variant par défaut "info"', () => {
    const owllayer = makeOwlLayerMock();
    registerUITools(owllayer);
    getHandler(owllayer, 'show_notification')({ message: 'OK' });
    const ev = dispatched.find((e) => e.type === 'owllayer:ui:show_notification');
    expect(ev?.detail.variant).toBe('info');
    expect(ev?.detail.message).toBe('OK');
  });

  it('close_panel dispatch owllayer:ui:close_panel', () => {
    const owllayer = makeOwlLayerMock();
    registerUITools(owllayer);
    getHandler(owllayer, 'close_panel')({});
    expect(dispatched.find((e) => e.type === 'owllayer:ui:close_panel')).toBeDefined();
  });

  it('show_upsell dispatch avec product + reason', () => {
    const owllayer = makeOwlLayerMock();
    registerUITools(owllayer);
    const product = wooProductToUI(makeProduct());
    getHandler(owllayer, 'show_upsell')({ product, reason: 'Complémentaire' });
    const ev = dispatched.find((e) => e.type === 'owllayer:ui:show_upsell');
    expect(ev?.detail.reason).toBe('Complémentaire');
  });
});
