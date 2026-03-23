// Sprint 4 — Unit tests for CheckoutTools
// Covers: initiate_checkout, fill_checkout_field (Classic + Blocks)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerCheckoutTools } from '../tools/CheckoutTools.js';
import type { StoreApiClient } from '../api/StoreApiClient.js';
import type { DomOSWooConfig } from '../types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDomosMock() {
  return { registerTool: vi.fn() };
}

function makeApiMock(overrides: Partial<{
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
}> = {}): StoreApiClient {
  return {
    get: vi.fn().mockResolvedValue({ items_count: 2 }),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    del: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as StoreApiClient;
}

const CONFIG: DomOSWooConfig = { apiKey: 'pk_test_woo_abc123_testkey', nonce: 'abc123' };

function getHandler(domos: ReturnType<typeof makeDomosMock>, name: string) {
  const call = domos.registerTool.mock.calls.find(c => c[0] === name);
  if (!call) throw new Error(`Tool "${name}" was not registered`);
  return call[1].handler as (params: Record<string, unknown>) => Promise<unknown>;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('registerCheckoutTools', () => {
  let domos: ReturnType<typeof makeDomosMock>;
  let api: StoreApiClient;

  beforeEach(() => {
    domos = makeDomosMock();
    api = makeApiMock();
    registerCheckoutTools(domos, api, CONFIG);
  });

  it('enregistre les 2 tools', () => {
    const names = domos.registerTool.mock.calls.map(c => c[0] as string);
    expect(names).toContain('initiate_checkout');
    expect(names).toContain('fill_checkout_field');
  });

  // ── initiate_checkout ──────────────────────────────────────────────────────

  describe('initiate_checkout', () => {
    it('appelle GET /cart pour vérifier items_count', async () => {
      const handler = getHandler(domos, 'initiate_checkout');
      await handler({});
      expect(api.get).toHaveBeenCalledWith('/cart');
    });

    it('retourne success: true et redirecting: true si panier non vide', async () => {
      const handler = getHandler(domos, 'initiate_checkout');
      const result = await handler({}) as Record<string, unknown>;
      expect(result.success).toBe(true);
      expect(result.redirecting).toBe(true);
      expect(result.checkoutUrl).toBe('/checkout');
    });

    it('retourne success: false si panier vide (items_count === 0)', async () => {
      const api2 = makeApiMock({ get: vi.fn().mockResolvedValue({ items_count: 0 }) });
      const domos2 = makeDomosMock();
      registerCheckoutTools(domos2, api2, CONFIG);
      const handler = getHandler(domos2, 'initiate_checkout');
      const result = await handler({}) as Record<string, unknown>;
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('retourne success: false si items_count absent (undefined)', async () => {
      const api2 = makeApiMock({ get: vi.fn().mockResolvedValue({}) });
      const domos2 = makeDomosMock();
      registerCheckoutTools(domos2, api2, CONFIG);
      const handler = getHandler(domos2, 'initiate_checkout');
      const result = await handler({}) as Record<string, unknown>;
      expect(result.success).toBe(false);
    });
  });

  // ── fill_checkout_field — Classic mode ─────────────────────────────────────

  describe('fill_checkout_field (Classic)', () => {
    let savedDocument: typeof globalThis.document;

    beforeEach(() => {
      savedDocument = globalThis.document;
    });

    afterEach(() => {
      globalThis.document = savedDocument;
    });

    it('retourne mode: classic si .wc-block-checkout absent', async () => {
      // document.querySelector returns null (no blocks)
      globalThis.document = {
        querySelector: vi.fn().mockReturnValue(null),
      } as unknown as typeof document;

      const handler = getHandler(domos, 'fill_checkout_field');
      const result = await handler({ field: 'billing_first_name', value: 'Alice' }) as Record<string, unknown>;
      expect(result.mode).toBe('classic');
      expect(result.success).toBe(true);
      expect(result.field).toBe('billing_first_name');
      expect(result.value).toBe('Alice');
    });

    it('mute la valeur du DOM input et dispatche change', async () => {
      const dispatchEvent = vi.fn();
      const mockInput = { value: '', dispatchEvent };
      globalThis.document = {
        querySelector: vi.fn().mockImplementation((sel: string) => {
          if (sel === '.wc-block-checkout') return null;
          if (sel === '#billing_email') return mockInput;
          return null;
        }),
      } as unknown as typeof document;

      const handler = getHandler(domos, 'fill_checkout_field');
      await handler({ field: 'billing_email', value: 'alice@example.com' });
      expect(mockInput.value).toBe('alice@example.com');
      expect(dispatchEvent).toHaveBeenCalled();
    });

    it("ne lève pas d'erreur si l'input n'existe pas dans le DOM", async () => {
      globalThis.document = {
        querySelector: vi.fn().mockReturnValue(null),
      } as unknown as typeof document;

      const handler = getHandler(domos, 'fill_checkout_field');
      const result = await handler({ field: 'nonexistent_field', value: 'test' }) as Record<string, unknown>;
      expect(result.success).toBe(true);
      expect(result.mode).toBe('classic');
    });
  });

  // ── fill_checkout_field — Blocks mode ─────────────────────────────────────

  describe('fill_checkout_field (Blocks)', () => {
    let savedDocument: typeof globalThis.document;
    let blockCheckoutEl: unknown;

    beforeEach(() => {
      savedDocument = globalThis.document;
      blockCheckoutEl = { className: 'wc-block-checkout' };
      globalThis.document = {
        querySelector: vi.fn().mockImplementation((sel: string) => {
          if (sel === '.wc-block-checkout') return blockCheckoutEl;
          return null;
        }),
      } as unknown as typeof document;
    });

    afterEach(() => {
      globalThis.document = savedDocument;
    });

    it('appelle PUT /checkout avec billing_address si fournie', async () => {
      const billingAddress = {
        first_name: 'Alice', last_name: 'Dupont', email: 'alice@example.com',
        phone: '0600000000', address_1: '12 rue des Lilas', address_2: '',
        city: 'Paris', postcode: '75001', country: 'FR',
      };
      const handler = getHandler(domos, 'fill_checkout_field');
      await handler({ field: 'billing_first_name', value: 'Alice', billingAddress });
      expect(api.put).toHaveBeenCalledWith('/checkout', { billing_address: billingAddress });
    });

    it('appelle PUT /checkout avec shipping_address si fournie', async () => {
      const shippingAddress = {
        first_name: 'Alice', last_name: 'Dupont',
        address_1: '12 rue des Lilas', address_2: '',
        city: 'Paris', postcode: '75001', country: 'FR',
      };
      const handler = getHandler(domos, 'fill_checkout_field');
      await handler({ field: 'shipping_first_name', value: 'Alice', shippingAddress });
      expect(api.put).toHaveBeenCalledWith('/checkout', { shipping_address: shippingAddress });
    });

    it('retourne success: true et mode: blocks si adresse fournie', async () => {
      const billingAddress = { first_name: 'Alice', last_name: 'Dupont', email: 'a@b.com',
        phone: '', address_1: '1 rue', address_2: '', city: 'Paris', postcode: '75001', country: 'FR' };
      const handler = getHandler(domos, 'fill_checkout_field');
      const result = await handler({ field: 'billing_first_name', value: 'Alice', billingAddress }) as Record<string, unknown>;
      expect(result.success).toBe(true);
      expect(result.mode).toBe('blocks');
    });

    it('retourne success: false si ni billingAddress ni shippingAddress fournis (mode Blocks)', async () => {
      const handler = getHandler(domos, 'fill_checkout_field');
      const result = await handler({ field: 'billing_first_name', value: 'Alice' }) as Record<string, unknown>;
      expect(result.success).toBe(false);
      expect(result.mode).toBe('blocks');
      expect(typeof result.error).toBe('string');
    });

    it('ne fait pas de requête PUT si billingAddress/shippingAddress absents', async () => {
      const handler = getHandler(domos, 'fill_checkout_field');
      await handler({ field: 'billing_first_name', value: 'Alice' });
      expect(api.put).not.toHaveBeenCalled();
    });
  });
});
