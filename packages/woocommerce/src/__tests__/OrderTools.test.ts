// Sprint 4 — Unit tests for OrderTools
// Covers: get_order_status (client connecté, invité avec key+email, 401/403/404 fallbacks)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerOrderTools } from '../tools/OrderTools.js';
import type { StoreApiClient } from '../api/StoreApiClient.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_ORDER = {
  id: 1042,
  status: 'processing',
  items: [
    { name: 'Robe d\'été fleurie', quantity: 2, totals: { line_total: '7998' } },
  ],
  totals: {
    total_price: '8498',
    subtotal: '7998',
    total_discount: '0',
    total_shipping: '500',
    total_tax: '0',
    currency_code: 'EUR',
  },
  billing_address: {
    first_name: 'Alice', last_name: 'Dupont', email: 'alice@example.com',
    address_1: '12 rue des Lilas', city: 'Paris', postcode: '75001', country: 'FR',
  },
  shipping_address: {
    first_name: 'Alice', last_name: 'Dupont',
    address_1: '12 rue des Lilas', city: 'Paris', postcode: '75001', country: 'FR',
  },
  coupons: [],
  needs_payment: false,
  needs_shipping: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDomosMock() {
  return { registerTool: vi.fn() };
}

function makeApiMock(overrides: Partial<{ get: ReturnType<typeof vi.fn> }> = {}): StoreApiClient {
  return {
    get: vi.fn().mockResolvedValue(MOCK_ORDER),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    del: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as StoreApiClient;
}

function getHandler(domos: ReturnType<typeof makeDomosMock>, name: string) {
  const call = domos.registerTool.mock.calls.find(c => c[0] === name);
  if (!call) throw new Error(`Tool "${name}" was not registered`);
  return call[1].handler as (params: Record<string, unknown>) => Promise<unknown>;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('registerOrderTools', () => {
  let domos: ReturnType<typeof makeDomosMock>;
  let api: StoreApiClient;

  beforeEach(() => {
    domos = makeDomosMock();
    api = makeApiMock();
    registerOrderTools(domos, api);
  });

  it('enregistre le tool get_order_status', () => {
    const names = domos.registerTool.mock.calls.map(c => c[0] as string);
    expect(names).toContain('get_order_status');
  });

  // ── get_order_status — client connecté ────────────────────────────────────

  describe('get_order_status — client connecté', () => {
    it('appelle GET /order/{id} sans params supplémentaires', async () => {
      const handler = getHandler(domos, 'get_order_status');
      await handler({ orderId: 1042 });
      expect(api.get).toHaveBeenCalledWith('/order/1042');
    });

    it('retourne found: true avec les champs réels de OrderSchema', async () => {
      const handler = getHandler(domos, 'get_order_status');
      const result = await handler({ orderId: 1042 }) as Record<string, unknown>;
      expect(result.found).toBe(true);
      const order = result.order as Record<string, unknown>;
      expect(order.id).toBe(1042);
      expect(order.status).toBe('processing');
      // items[] (pas lineItems)
      expect(Array.isArray(order.items)).toBe(true);
      // totals.total_price (pas total: string)
      const totals = order.totals as Record<string, unknown>;
      expect(totals.total_price).toBe('8498');
      expect(totals.currency_code).toBe('EUR');
      // dateCreated, trackingNumber absents
      expect(order).not.toHaveProperty('dateCreated');
      expect(order).not.toHaveProperty('trackingNumber');
      expect(order).not.toHaveProperty('trackingUrl');
    });

    it('retourne les items avec name, quantity, line_total', async () => {
      const handler = getHandler(domos, 'get_order_status');
      const result = await handler({ orderId: 1042 }) as Record<string, unknown>;
      const order = result.order as Record<string, unknown>;
      const items = order.items as Array<Record<string, unknown>>;
      expect(items[0]).toMatchObject({ name: 'Robe d\'été fleurie', quantity: 2, line_total: '7998' });
    });

    it('retourne billing_address, coupons, needs_payment, needs_shipping', async () => {
      const handler = getHandler(domos, 'get_order_status');
      const result = await handler({ orderId: 1042 }) as Record<string, unknown>;
      const order = result.order as Record<string, unknown>;
      expect(order.billing_address).toBeTruthy();
      expect(order.needs_payment).toBe(false);
      expect(order.needs_shipping).toBe(true);
      expect(Array.isArray(order.coupons)).toBe(true);
    });
  });

  // ── get_order_status — invité avec key + billing_email ────────────────────

  describe('get_order_status — invité', () => {
    it('appelle GET /order/{id}?key=...&billing_email=... si key et billing_email fournis', async () => {
      const handler = getHandler(domos, 'get_order_status');
      await handler({
        orderId: 1042,
        key: 'wc_order_abcXYZ123',
        billing_email: 'alice@example.com',
      });
      expect(api.get).toHaveBeenCalledWith(
        '/order/1042?key=wc_order_abcXYZ123&billing_email=alice%40example.com',
      );
    });

    it("n'ajoute pas les query params si key seul est fourni (billing_email manquant)", async () => {
      const handler = getHandler(domos, 'get_order_status');
      await handler({ orderId: 1042, key: 'wc_order_abcXYZ123' });
      expect(api.get).toHaveBeenCalledWith('/order/1042');
    });

    it("n'ajoute pas les query params si billing_email seul est fourni (key manquant)", async () => {
      const handler = getHandler(domos, 'get_order_status');
      await handler({ orderId: 1042, billing_email: 'alice@example.com' });
      expect(api.get).toHaveBeenCalledWith('/order/1042');
    });
  });

  // ── get_order_status — gestion des erreurs ────────────────────────────────

  describe('get_order_status — erreurs HTTP', () => {
    it('retourne found: false + message si 404', async () => {
      const api2 = makeApiMock({ get: vi.fn().mockRejectedValue({ status: 404 }) });
      const domos2 = makeDomosMock();
      registerOrderTools(domos2, api2);
      const handler = getHandler(domos2, 'get_order_status');
      const result = await handler({ orderId: 9999 }) as Record<string, unknown>;
      expect(result.found).toBe(false);
      expect(typeof result.message).toBe('string');
    });

    it('retourne found: false + message si 403 (autre client)', async () => {
      const api2 = makeApiMock({ get: vi.fn().mockRejectedValue({ status: 403 }) });
      const domos2 = makeDomosMock();
      registerOrderTools(domos2, api2);
      const handler = getHandler(domos2, 'get_order_status');
      const result = await handler({ orderId: 1042 }) as Record<string, unknown>;
      expect(result.found).toBe(false);
      expect(typeof result.message).toBe('string');
    });

    it('retourne found: false + message + my_account_url si 401', async () => {
      const api2 = makeApiMock({ get: vi.fn().mockRejectedValue({ status: 401 }) });
      const domos2 = makeDomosMock();
      registerOrderTools(domos2, api2);
      const handler = getHandler(domos2, 'get_order_status');
      const result = await handler({ orderId: 1042 }) as Record<string, unknown>;
      expect(result.found).toBe(false);
      expect(typeof result.message).toBe('string');
      expect(result.my_account_url).toBe('/my-account/orders');
    });

    it('propage l\'erreur si status inconnu (ex: 500)', async () => {
      const api2 = makeApiMock({ get: vi.fn().mockRejectedValue({ status: 500, message: 'Server Error' }) });
      const domos2 = makeDomosMock();
      registerOrderTools(domos2, api2);
      const handler = getHandler(domos2, 'get_order_status');
      await expect(handler({ orderId: 1042 })).rejects.toMatchObject({ status: 500 });
    });
  });
});
