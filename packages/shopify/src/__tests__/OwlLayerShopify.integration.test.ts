// Sprint 5 — Integration tests for OwlLayerShopify.init()
// Verifies that init() wires all modules correctly with mocked OwlLayer + Shopify DOM

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OwlLayerShopify } from '../OwlLayerShopify.js';

// ─── Mock @owllayer/browser ──────────────────────────────────────────────────────

vi.mock('@owllayer/browser', () => {
  const registeredTools: string[] = [];
  const updatedContexts: Record<string, unknown>[] = [];

  return {
    OwlLayer: {
      init: vi.fn().mockResolvedValue(undefined),
      updateContext: vi.fn((ctx: Record<string, unknown>) => updatedContexts.push(ctx)),
      registerTool: vi.fn((name: string) => registeredTools.push(name)),
      onResponse: vi.fn(),
      onAgentStateChange: vi.fn(),
      startVoice: vi.fn().mockResolvedValue(undefined),
      stopVoice: vi.fn(),
      muteMic: vi.fn(),
      sendText: vi.fn(),
      _registeredTools: registeredTools,
      _updatedContexts: updatedContexts,
    },
  };
});

// ─── Mock ShopifyWidget (avoids DOM/Shadow DOM manipulation in tests) ─────────

const { mockWidgetMount, mockWidgetUnmount } = vi.hoisted(() => ({
  mockWidgetMount: vi.fn(),
  mockWidgetUnmount: vi.fn(),
}));

vi.mock('../ui/ShopifyWidget.js', () => ({
  ShopifyWidget: class {
    mount() {}
    unmount() {}
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOwlLayer() {
  const mod = await import('@owllayer/browser');
  return mod.OwlLayer as unknown as {
    init: ReturnType<typeof vi.fn>;
    updateContext: ReturnType<typeof vi.fn>;
    registerTool: ReturnType<typeof vi.fn>;
    _registeredTools: string[];
    _updatedContexts: Record<string, unknown>[];
  };
}

function mockShopifyGlobals() {
  (window as Window & { Shopify?: unknown }).Shopify = {
    shop: 'my-store.myshopify.com',
    currency: { active: 'EUR' },
    locale: 'fr',
    routes: { root: '/fr/' },
  };
  // Simulate cart.js for CartContextSync polling
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ token: 'tok', item_count: 0, total_price: 0, currency: 'EUR', items: [] }),
  }));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OwlLayerShopify.init() integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShopifyGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as Window & { Shopify?: unknown }).Shopify;
    delete (window as Window & { __st?: unknown }).__st;
    delete (window as Window & { __owllayer_customer_token?: unknown }).__owllayer_customer_token;
  });

  it('appelle OwlLayer.init avec la config correcte', async () => {
    const OwlLayer = await getOwlLayer();

    await OwlLayerShopify.init({ apiKey: 'dk_test_123' });

    expect(OwlLayer.init).toHaveBeenCalledOnce();
    const initArg = (OwlLayer.init as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      apiKey: string;
      endpoint: string;
    };
    expect(initArg.apiKey).toBe('dk_test_123');
    expect(initArg.endpoint).toBe('wss://cloud.owllayer.dev/owllayer');
  });

  it('accepte un endpoint custom', async () => {
    const OwlLayer = await getOwlLayer();

    await OwlLayerShopify.init({ apiKey: 'dk_test', endpoint: 'wss://custom.owllayer.dev/owllayer' });

    const initArg = (OwlLayer.init as ReturnType<typeof vi.fn>).mock.calls[0][0] as { endpoint: string };
    expect(initArg.endpoint).toBe('wss://custom.owllayer.dev/owllayer');
  });

  it('injecte le contexte Shopify au démarrage', async () => {
    const OwlLayer = await getOwlLayer();

    await OwlLayerShopify.init({ apiKey: 'dk_test' });

    expect(OwlLayer.updateContext).toHaveBeenCalled();
    const calls = (OwlLayer.updateContext as ReturnType<typeof vi.fn>).mock.calls as [Record<string, unknown>][];
    const shopCtx = calls.find(([ctx]) => 'shop' in ctx || 'domain' in ctx || 'currency' in ctx);
    expect(shopCtx).toBeDefined();
  });

  it('injecte le contexte customer au démarrage', async () => {
    // Simulate logged-in customer
    (window as Window & { __st?: unknown }).__st = { cid: 42 };
    const OwlLayer = await getOwlLayer();

    await OwlLayerShopify.init({ apiKey: 'dk_test' });

    const calls = (OwlLayer.updateContext as ReturnType<typeof vi.fn>).mock.calls as [Record<string, unknown>][];
    const customerCtx = calls.find(([ctx]) => 'customer' in ctx);
    expect(customerCtx).toBeDefined();
    const customer = (customerCtx![0] as { customer: { isLoggedIn: boolean; id: string } }).customer;
    expect(customer.isLoggedIn).toBe(true);
    expect(customer.id).toBe('42');
  });

  it('enregistre les tools cart (toujours actifs)', async () => {
    const OwlLayer = await getOwlLayer();

    await OwlLayerShopify.init({ apiKey: 'dk_test' });

    const names = (OwlLayer.registerTool as ReturnType<typeof vi.fn>).mock.calls.map((args: unknown[]) => args[0] as string);
    expect(names).toContain('add_to_cart');
    expect(names).toContain('update_cart');
    expect(names).toContain('remove_from_cart');
    expect(names).toContain('get_cart');
  });

  it('enregistre les tools navigation (toujours actifs)', async () => {
    const OwlLayer = await getOwlLayer();

    await OwlLayerShopify.init({ apiKey: 'dk_test' });

    const names = (OwlLayer.registerTool as ReturnType<typeof vi.fn>).mock.calls.map((args: unknown[]) => args[0] as string);
    expect(names).toContain('navigate_to_product');
    expect(names).toContain('navigate_to_collection');
  });

  it('enregistre select_variant (toujours actif, DOM pure)', async () => {
    const OwlLayer = await getOwlLayer();

    await OwlLayerShopify.init({ apiKey: 'dk_test' });

    const names = (OwlLayer.registerTool as ReturnType<typeof vi.fn>).mock.calls.map((args: unknown[]) => args[0] as string);
    expect(names).toContain('select_variant');
  });

  it('enregistre les tools checkout (toujours actifs)', async () => {
    const OwlLayer = await getOwlLayer();

    await OwlLayerShopify.init({ apiKey: 'dk_test' });

    const names = (OwlLayer.registerTool as ReturnType<typeof vi.fn>).mock.calls.map((args: unknown[]) => args[0] as string);
    expect(names).toContain('initiate_checkout');
    expect(names).toContain('apply_discount');
  });

  it("n'enregistre pas search_products si storefrontToken absent", async () => {
    const OwlLayer = await getOwlLayer();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await OwlLayerShopify.init({ apiKey: 'dk_test' });

    const names = (OwlLayer.registerTool as ReturnType<typeof vi.fn>).mock.calls.map((args: unknown[]) => args[0] as string);
    expect(names).not.toContain('search_products');
    expect(names).not.toContain('get_product');
  });

  it('enregistre search_products et get_product si storefrontToken + shopDomain fournis', async () => {
    const OwlLayer = await getOwlLayer();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await OwlLayerShopify.init({
      apiKey: 'dk_test',
      storefrontToken: 'shpat_test',
      shopDomain: 'my-store.myshopify.com',
    });

    const names = (OwlLayer.registerTool as ReturnType<typeof vi.fn>).mock.calls.map((args: unknown[]) => args[0] as string);
    expect(names).toContain('search_products');
    expect(names).toContain('get_product');
  });

  it("n'enregistre pas get_order_status si features.orderTracking est false", async () => {
    const OwlLayer = await getOwlLayer();

    await OwlLayerShopify.init({
      apiKey: 'dk_test',
      features: { orderTracking: false },
    });

    const names = (OwlLayer.registerTool as ReturnType<typeof vi.fn>).mock.calls.map((args: unknown[]) => args[0] as string);
    expect(names).not.toContain('get_order_status');
  });

  it('enregistre get_order_status si features.orderTracking est true', async () => {
    const OwlLayer = await getOwlLayer();

    await OwlLayerShopify.init({
      apiKey: 'dk_test',
      features: { orderTracking: true },
    });

    const names = (OwlLayer.registerTool as ReturnType<typeof vi.fn>).mock.calls.map((args: unknown[]) => args[0] as string);
    expect(names).toContain('get_order_status');
  });
});
