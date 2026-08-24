// Sprint 1 — Integration tests for OwlLayerWoo.init()
// Verifies that init() wires all modules correctly with mocked OwlLayer + WooCommerce DOM

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OwlLayerWoo } from '../OwlLayerWoo.js';
import type { OwlLayerWooConfig } from '../types.js';

// ─── Mock @owllayer/browser ──────────────────────────────────────────────────────

vi.mock('@owllayer/browser', () => {
  const OwlLayer = {
    init: vi.fn().mockResolvedValue(undefined),
    registerTool: vi.fn(),
    updateContext: vi.fn(),
    onResponse: vi.fn().mockReturnValue(() => {}),
    onAgentStateChange: vi.fn().mockReturnValue(() => {}),
  };
  return { OwlLayer };
});

// ─── Mock WooCommerce Store API (fetch) ───────────────────────────────────────

function stubFetchWithCart() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({
      items: [],
      items_count: 0,
      totals: { total_price: '0', currency_code: 'EUR' },
    }),
  }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function injectContextBlock(data: Record<string, unknown>): void {
  document.getElementById('owllayer-woo-context')?.remove();
  const el = document.createElement('script');
  el.id = 'owllayer-woo-context';
  el.type = 'application/json';
  el.textContent = JSON.stringify(data);
  document.body.appendChild(el);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OwlLayerWoo.init() integration', () => {
  let OwlLayer: {
    init: ReturnType<typeof vi.fn>;
    registerTool: ReturnType<typeof vi.fn>;
    updateContext: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const mod = await import('@owllayer/browser');
    OwlLayer = mod.OwlLayer as unknown as typeof OwlLayer;
    vi.clearAllMocks();
    document.getElementById('owllayer-woo-context')?.remove();
    document.body.className = '';
    stubFetchWithCart();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('appelle OwlLayer.init() avec l\'apiKey fournie', async () => {
    await OwlLayerWoo.init({ apiKey: 'pk_dev_woo_c7d1e9_test123' });
    expect(OwlLayer.init).toHaveBeenCalledOnce();
    const arg = OwlLayer.init.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.apiKey).toBe('pk_dev_woo_c7d1e9_test123');
  });

  it('utilise l\'endpoint par défaut wss://cloud.owllayer.dev/owllayer', async () => {
    await OwlLayerWoo.init({ apiKey: 'pk_dev_woo_test' });
    const arg = OwlLayer.init.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.endpoint).toBe('wss://cloud.owllayer.dev/owllayer');
  });

  it('utilise un endpoint personnalisé si fourni', async () => {
    await OwlLayerWoo.init({ apiKey: 'pk_dev_woo_test', endpoint: 'wss://custom.owllayer.dev/owllayer' });
    const arg = OwlLayer.init.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.endpoint).toBe('wss://custom.owllayer.dev/owllayer');
  });

  it('appelle OwlLayer.updateContext() avec platform: woocommerce', async () => {
    injectContextBlock({ pageType: 'product', product: { id: 1, name: 'Chemise' } });
    await OwlLayerWoo.init({ apiKey: 'pk_dev_woo_test' });
    expect(OwlLayer.updateContext).toHaveBeenCalled();
    const ctxCall = OwlLayer.updateContext.mock.calls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).platform === 'woocommerce',
    );
    expect(ctxCall).toBeDefined();
    const ctx = ctxCall![0] as Record<string, unknown>;
    expect(ctx.platform).toBe('woocommerce');
  });

  it('active le widget OwlLayer par défaut', async () => {
    await OwlLayerWoo.init({ apiKey: 'pk_dev_woo_test' });
    const arg = OwlLayer.init.mock.calls[0][0] as Record<string, unknown>;
    const widget = arg.widget as Record<string, unknown>;
    expect(widget.enabled).toBe(true);
  });

  it('active hitl par défaut', async () => {
    await OwlLayerWoo.init({ apiKey: 'pk_dev_woo_test' });
    const arg = OwlLayer.init.mock.calls[0][0] as Record<string, unknown>;
    expect((arg.hitl as Record<string, unknown>).enabled).toBe(true);
  });

  it('n\'enregistre pas OrderTools si orderTracking n\'est pas activé', async () => {
    const config: OwlLayerWooConfig = { apiKey: 'pk_dev_woo_test', features: { orderTracking: false } };
    await OwlLayerWoo.init(config);
    const toolNames = OwlLayer.registerTool.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(toolNames).not.toContain('get_order_status');
  });

  it('appelle registerOrderTools (Sprint 4 stub) sans erreur si orderTracking est true', async () => {
    // OrderTools is a Sprint 4 stub — no tools are registered yet.
    // We verify that init() completes without throwing when orderTracking: true,
    // and that callOrderTools is called (tested in Sprint 4 when the stub is implemented).
    const config: OwlLayerWooConfig = { apiKey: 'pk_dev_woo_test', features: { orderTracking: true } };
    await expect(OwlLayerWoo.init(config)).resolves.toBeUndefined();
  });

  it('utilise le storeApiBase personnalisé si fourni', async () => {
    const config: OwlLayerWooConfig = {
      apiKey: 'pk_dev_woo_test',
      storeApiBase: '/wp-json/wc/store/v2',
    };
    await OwlLayerWoo.init(config);
    // Verifies that the init completes — detailed StoreApiClient URL is tested in StoreApiClient.test.ts
    expect(OwlLayer.init).toHaveBeenCalledOnce();
  });
});
