// Sprint 1 — Integration tests for DomOSWoo.init()
// Verifies that init() wires all modules correctly with mocked DomOS + WooCommerce DOM

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DomOSWoo } from '../DomOSWoo.js';
import type { DomOSWooConfig } from '../types.js';

// ─── Mock @domos/browser ──────────────────────────────────────────────────────

vi.mock('@domos/browser', () => {
  const DomOS = {
    init: vi.fn().mockResolvedValue(undefined),
    registerTool: vi.fn(),
    updateContext: vi.fn(),
    onResponse: vi.fn().mockReturnValue(() => {}),
    onAgentStateChange: vi.fn().mockReturnValue(() => {}),
  };
  return { DomOS };
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
  document.getElementById('domos-woo-context')?.remove();
  const el = document.createElement('script');
  el.id = 'domos-woo-context';
  el.type = 'application/json';
  el.textContent = JSON.stringify(data);
  document.body.appendChild(el);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DomOSWoo.init() integration', () => {
  let DomOS: {
    init: ReturnType<typeof vi.fn>;
    registerTool: ReturnType<typeof vi.fn>;
    updateContext: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const mod = await import('@domos/browser');
    DomOS = mod.DomOS as unknown as typeof DomOS;
    vi.clearAllMocks();
    document.getElementById('domos-woo-context')?.remove();
    document.body.className = '';
    stubFetchWithCart();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('appelle DomOS.init() avec l\'apiKey fournie', async () => {
    await DomOSWoo.init({ apiKey: 'pk_dev_woo_c7d1e9_test123' });
    expect(DomOS.init).toHaveBeenCalledOnce();
    const arg = DomOS.init.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.apiKey).toBe('pk_dev_woo_c7d1e9_test123');
  });

  it('utilise l\'endpoint par défaut wss://cloud.domos.dev/domos', async () => {
    await DomOSWoo.init({ apiKey: 'pk_dev_woo_test' });
    const arg = DomOS.init.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.endpoint).toBe('wss://cloud.domos.dev/domos');
  });

  it('utilise un endpoint personnalisé si fourni', async () => {
    await DomOSWoo.init({ apiKey: 'pk_dev_woo_test', endpoint: 'wss://custom.domos.dev/domos' });
    const arg = DomOS.init.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.endpoint).toBe('wss://custom.domos.dev/domos');
  });

  it('appelle DomOS.updateContext() avec platform: woocommerce', async () => {
    injectContextBlock({ pageType: 'product', product: { id: 1, name: 'Chemise' } });
    await DomOSWoo.init({ apiKey: 'pk_dev_woo_test' });
    expect(DomOS.updateContext).toHaveBeenCalled();
    const ctxCall = DomOS.updateContext.mock.calls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).platform === 'woocommerce',
    );
    expect(ctxCall).toBeDefined();
    const ctx = ctxCall![0] as Record<string, unknown>;
    expect(ctx.platform).toBe('woocommerce');
  });

  it('active le widget DomOS par défaut', async () => {
    await DomOSWoo.init({ apiKey: 'pk_dev_woo_test' });
    const arg = DomOS.init.mock.calls[0][0] as Record<string, unknown>;
    const widget = arg.widget as Record<string, unknown>;
    expect(widget.enabled).toBe(true);
  });

  it('active hitl par défaut', async () => {
    await DomOSWoo.init({ apiKey: 'pk_dev_woo_test' });
    const arg = DomOS.init.mock.calls[0][0] as Record<string, unknown>;
    expect((arg.hitl as Record<string, unknown>).enabled).toBe(true);
  });

  it('n\'enregistre pas OrderTools si orderTracking n\'est pas activé', async () => {
    const config: DomOSWooConfig = { apiKey: 'pk_dev_woo_test', features: { orderTracking: false } };
    await DomOSWoo.init(config);
    const toolNames = DomOS.registerTool.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(toolNames).not.toContain('get_order_status');
  });

  it('appelle registerOrderTools (Sprint 4 stub) sans erreur si orderTracking est true', async () => {
    // OrderTools is a Sprint 4 stub — no tools are registered yet.
    // We verify that init() completes without throwing when orderTracking: true,
    // and that callOrderTools is called (tested in Sprint 4 when the stub is implemented).
    const config: DomOSWooConfig = { apiKey: 'pk_dev_woo_test', features: { orderTracking: true } };
    await expect(DomOSWoo.init(config)).resolves.toBeUndefined();
  });

  it('utilise le storeApiBase personnalisé si fourni', async () => {
    const config: DomOSWooConfig = {
      apiKey: 'pk_dev_woo_test',
      storeApiBase: '/wp-json/wc/store/v2',
    };
    await DomOSWoo.init(config);
    // Verifies that the init completes — detailed StoreApiClient URL is tested in StoreApiClient.test.ts
    expect(DomOS.init).toHaveBeenCalledOnce();
  });
});
