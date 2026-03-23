// Sprint 6 — Unit tests for PaymentTools
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerPaymentTools } from '../tools/PaymentTools.js';
import type { StoreApiClient } from '../api/StoreApiClient.js';

function makeDomosMock() {
  return { registerTool: vi.fn() };
}

function makeApiMock(cartOverride = {}) {
  return {
    get: vi.fn().mockResolvedValue({
      items: [],
      items_count: 0,
      totals: { total_price: '0', currency_code: 'EUR' },
      ...cartOverride,
    }),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    del: vi.fn().mockResolvedValue({}),
  } as unknown as StoreApiClient;
}

function getHandler(domos: ReturnType<typeof makeDomosMock>, name: string) {
  const call = domos.registerTool.mock.calls.find((c) => c[0] === name);
  if (!call) throw new Error(`Tool "${name}" not registered`);
  return call[1].handler as (args: Record<string, unknown>) => Promise<unknown>;
}

describe('registerPaymentTools()', () => {
  let dispatched: CustomEvent[] = [];

  beforeEach(() => {
    dispatched = [];
    window.addEventListener('domos:payment:open', (e) => dispatched.push(e as CustomEvent));
  });

  afterEach(() => {
    dispatched = [];
  });

  it('enregistre le tool initiate_checkout_modal', () => {
    const domos = makeDomosMock();
    registerPaymentTools(domos, makeApiMock());
    const names = domos.registerTool.mock.calls.map((c) => c[0]);
    expect(names).toContain('initiate_checkout_modal');
  });

  it('retourne une erreur si le panier est vide', async () => {
    const domos = makeDomosMock();
    registerPaymentTools(domos, makeApiMock({ items_count: 0 }));
    const result = await getHandler(domos, 'initiate_checkout_modal')({}) as { success: boolean; error?: string };
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/vide/i);
  });

  it('dispatch domos:payment:open si panier non vide', async () => {
    const domos = makeDomosMock();
    registerPaymentTools(domos, makeApiMock({ items_count: 2 }));
    const result = await getHandler(domos, 'initiate_checkout_modal')({}) as { success: boolean };
    expect(result.success).toBe(true);
    expect(dispatched.find((e) => e.type === 'domos:payment:open')).toBeDefined();
  });

  it('le tool est marque risk:high', () => {
    const domos = makeDomosMock();
    registerPaymentTools(domos, makeApiMock());
    const call = domos.registerTool.mock.calls.find((c) => c[0] === 'initiate_checkout_modal');
    expect(call![1].risk).toBe('high');
  });

  it('passe items_count=1 → dispatche event', async () => {
    const domos = makeDomosMock();
    registerPaymentTools(domos, makeApiMock({ items_count: 1 }));
    await getHandler(domos, 'initiate_checkout_modal')({});
    expect(dispatched.length).toBeGreaterThan(0);
  });
});