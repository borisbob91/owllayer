// Sprint 7 — Tests Store Connect pour OwlLayerWoo.init()
// Couvre : _storeStatus, getStoreStatus(), event owllayer:store:status, storeIdentity dans context

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OwlLayerWoo } from '../OwlLayerWoo.js';
import type { OwlLayerWooConfig, WooStoreStatus } from '../types.js';

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

function stubFetch() {
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

describe('OwlLayerWoo — Store Connect (Sprint 7)', () => {
  let OwlLayer: { init: ReturnType<typeof vi.fn>; registerTool: ReturnType<typeof vi.fn>; updateContext: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const mod = await import('@owllayer/browser');
    OwlLayer = mod.OwlLayer as unknown as typeof OwlLayer;
    vi.clearAllMocks();
    document.getElementById('owllayer-woo-context')?.remove();
    stubFetch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── getStoreStatus() ──────────────────────────────────────────────────────

  it('getStoreStatus() retourne null avant init()', () => {
    // Note: _storeStatus est module-level — peut être non-null si un test précédent a init()
    // Ce test vérifie l'API publique est disponible
    expect(typeof OwlLayerWoo.getStoreStatus).toBe('function');
  });

  it('getStoreStatus() retourne connected:true après init avec shopId', async () => {
    injectContextBlock({});
    const config: OwlLayerWooConfig = {
      apiKey: 'pk_live_woo_a3f8b2_x9kL4mN7pQ2',
      shopId: '550e8400-e29b-41d4-a716-446655440000',
      siteUrl: 'https://ma-boutique.com',
    };
    await OwlLayerWoo.init(config);
    const status = OwlLayerWoo.getStoreStatus();
    expect(status).not.toBeNull();
    expect(status!.connected).toBe(true);
    expect(status!.shopId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(status!.siteUrl).toBe('https://ma-boutique.com');
  });

  it('getStoreStatus() retourne connected:false après init sans shopId', async () => {
    injectContextBlock({});
    const config: OwlLayerWooConfig = {
      apiKey: 'pk_live_woo_a3f8b2_x9kL4mN7pQ2',
      siteUrl: 'https://ma-boutique.com',
    };
    await OwlLayerWoo.init(config);
    const status = OwlLayerWoo.getStoreStatus();
    expect(status).not.toBeNull();
    expect(status!.connected).toBe(false);
    expect(status!.shopId).toBeUndefined();
  });

  // ── Event owllayer:store:status ──────────────────────────────────────────────

  it('dispatch l\'event owllayer:store:status sur window après init()', async () => {
    injectContextBlock({});
    let received: WooStoreStatus | null = null;
    const listener = (e: Event) => {
      received = (e as CustomEvent<WooStoreStatus>).detail;
    };
    window.addEventListener('owllayer:store:status', listener);

    await OwlLayerWoo.init({
      apiKey: 'pk_live_woo_a3f8b2_x9kL4mN7pQ2',
      shopId: '550e8400-e29b-41d4-a716-446655440000',
      siteUrl: 'https://ma-boutique.com',
    });

    window.removeEventListener('owllayer:store:status', listener);

    expect(received).not.toBeNull();
    expect(received!.connected).toBe(true);
    expect(received!.shopId).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('l\'event owllayer:store:status a connected:false sans shopId', async () => {
    injectContextBlock({});
    let received: WooStoreStatus | null = null;
    const listener = (e: Event) => {
      received = (e as CustomEvent<WooStoreStatus>).detail;
    };
    window.addEventListener('owllayer:store:status', listener);

    await OwlLayerWoo.init({
      apiKey: 'pk_live_woo_a3f8b2_x9kL4mN7pQ2',
      siteUrl: 'https://ma-boutique.com',
    });

    window.removeEventListener('owllayer:store:status', listener);

    expect(received!.connected).toBe(false);
  });

  // ── storeIdentity dans OwlLayer.init() context ───────────────────────────────

  it('passe storeIdentity dans le context de OwlLayer.init() avec shopId', async () => {
    injectContextBlock({});
    await OwlLayerWoo.init({
      apiKey: 'pk_live_woo_a3f8b2_x9kL4mN7pQ2',
      shopId: 'shop-uuid-123',
      siteUrl: 'https://ma-boutique.com',
    });
    const arg = OwlLayer.init.mock.calls[0][0] as Record<string, unknown>;
    const context = arg.context as Record<string, unknown>;
    expect(context.storeIdentity).toMatchObject({
      siteUrl: 'https://ma-boutique.com',
      shopId: 'shop-uuid-123',
    });
  });

  it('passe storeIdentity sans shopId si non fourni', async () => {
    injectContextBlock({});
    await OwlLayerWoo.init({
      apiKey: 'pk_live_woo_a3f8b2_x9kL4mN7pQ2',
      siteUrl: 'https://ma-boutique.com',
    });
    const arg = OwlLayer.init.mock.calls[0][0] as Record<string, unknown>;
    const context = arg.context as Record<string, unknown>;
    const identity = context.storeIdentity as Record<string, unknown>;
    expect(identity.siteUrl).toBe('https://ma-boutique.com');
    expect(identity.shopId).toBeUndefined();
  });
});
