import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerOrderTools } from '../tools/OrderTools.js';
import * as CustomerContext from '../context/CustomerContext.js';
import type { StorefrontClient } from '../storefront/StorefrontClient.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockClient(queryResult: unknown): StorefrontClient {
  return {
    query: vi.fn().mockResolvedValue(queryResult),
    apiVersion: '2026-01',
  } as unknown as StorefrontClient;
}

function makeMockDomos() {
  const tools: Record<string, { handler: (args: Record<string, unknown>) => unknown }> = {};
  return {
    registerTool: vi.fn((name: string, def: { handler: (a: Record<string, unknown>) => unknown }) => {
      tools[name] = def;
    }),
    getHandler: (name: string) => tools[name]?.handler,
  };
}

function makeOrderNode(overrides: Record<string, unknown> = {}) {
  return {
    name: '#4821',
    orderNumber: 4821,
    processedAt: '2026-03-01T10:00:00Z',
    financialStatus: 'paid',
    fulfillmentStatus: 'fulfilled',
    lineItems: { edges: [{ node: { title: 'Veste Alpine', quantity: 1 } }] },
    successfulFulfillments: [{
      trackingCompany: 'Colissimo',
      trackingInfo: [{ number: 'FR123456', url: 'https://colissimo.fr/FR123456' }],
    }],
    totalPriceV2: { amount: '89.00', currencyCode: 'EUR' },
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('registerOrderTools', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if ('Shopify' in window) delete (window as Window & { Shopify?: unknown }).Shopify;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('enregistre get_order_status', () => {
    const domos = makeMockDomos();
    registerOrderTools(domos, null);

    const names = domos.registerTool.mock.calls.map(([n]) => n as string);
    expect(names).toContain('get_order_status');
  });

  describe('get_order_status — sans token', () => {
    it('retourne loginRequired si aucun customer token disponible', async () => {
      vi.spyOn(CustomerContext, 'getCustomerAccessToken').mockReturnValue(undefined);

      const domos = makeMockDomos();
      registerOrderTools(domos, null);

      const result = (await domos.getHandler('get_order_status')!({})) as {
        found: boolean;
        loginRequired: boolean;
        accountUrl: string;
      };

      expect(result.found).toBe(false);
      expect(result.loginRequired).toBe(true);
      expect(result.accountUrl).toContain('/account/orders');
    });

    it("utilise routes.root dans l'URL account", async () => {
      vi.spyOn(CustomerContext, 'getCustomerAccessToken').mockReturnValue(undefined);
      (window as Window & { Shopify?: unknown }).Shopify = { routes: { root: '/fr/' } };

      const domos = makeMockDomos();
      registerOrderTools(domos, null);

      const result = (await domos.getHandler('get_order_status')!({})) as { accountUrl: string };
      expect(result.accountUrl).toBe('/fr/account/orders');
    });
  });

  describe('get_order_status — avec token valide', () => {
    beforeEach(() => {
      vi.spyOn(CustomerContext, 'getCustomerAccessToken').mockReturnValue('test-access-token');
    });

    it('retourne la commande la plus récente par défaut', async () => {
      const client = makeMockClient({
        customer: { orders: { edges: [{ node: makeOrderNode() }] } },
      });
      const domos = makeMockDomos();
      registerOrderTools(domos, client);

      const result = (await domos.getHandler('get_order_status')!({})) as {
        found: boolean;
        order: { name: string; financialStatus: string };
      };

      expect(result.found).toBe(true);
      expect(result.order.name).toBe('#4821');
      expect(result.order.financialStatus).toBe('paid');
    });

    it('inclut les infos de tracking dans la réponse', async () => {
      const client = makeMockClient({
        customer: { orders: { edges: [{ node: makeOrderNode() }] } },
      });
      const domos = makeMockDomos();
      registerOrderTools(domos, client);

      const result = (await domos.getHandler('get_order_status')!({})) as {
        order: { trackingUrl: string; trackingCompany: string };
      };

      expect(result.order.trackingUrl).toBe('https://colissimo.fr/FR123456');
      expect(result.order.trackingCompany).toBe('Colissimo');
    });

    it('filtre par numéro de commande si spécifié (avec #)', async () => {
      const client = makeMockClient({
        customer: {
          orders: {
            edges: [
              { node: makeOrderNode({ name: '#4821', orderNumber: 4821 }) },
              { node: makeOrderNode({ name: '#4820', orderNumber: 4820 }) },
            ],
          },
        },
      });
      const domos = makeMockDomos();
      registerOrderTools(domos, client);

      const result = (await domos.getHandler('get_order_status')!({ orderNumber: '#4820' })) as {
        found: boolean;
        order: { name: string };
      };

      expect(result.found).toBe(true);
      expect(result.order.name).toBe('#4820');
    });

    it("retourne found: false si le numéro de commande n'existe pas", async () => {
      const client = makeMockClient({
        customer: { orders: { edges: [{ node: makeOrderNode() }] } },
      });
      const domos = makeMockDomos();
      registerOrderTools(domos, client);

      const result = (await domos.getHandler('get_order_status')!({ orderNumber: '#9999' })) as {
        found: boolean;
        recentOrders: unknown[];
      };

      expect(result.found).toBe(false);
      expect(result.recentOrders).toBeDefined();
    });

    it('retourne loginRequired si customer est null (token expiré)', async () => {
      const client = makeMockClient({ customer: null });
      const domos = makeMockDomos();
      registerOrderTools(domos, client);

      const result = (await domos.getHandler('get_order_status')!({})) as {
        found: boolean;
        loginRequired: boolean;
      };

      expect(result.found).toBe(false);
      expect(result.loginRequired).toBe(true);
    });

    it("retourne found: false si aucune commande sur le compte", async () => {
      const client = makeMockClient({
        customer: { orders: { edges: [] } },
      });
      const domos = makeMockDomos();
      registerOrderTools(domos, client);

      const result = (await domos.getHandler('get_order_status')!({})) as { found: boolean };
      expect(result.found).toBe(false);
    });

    it('retourne found: false en cas d\'erreur GQL', async () => {
      const client = {
        query: vi.fn().mockRejectedValue(new Error('réseau KO')),
        apiVersion: '2026-01',
      } as unknown as StorefrontClient;
      const domos = makeMockDomos();
      registerOrderTools(domos, client);

      const result = (await domos.getHandler('get_order_status')!({})) as {
        found: boolean;
        error: string;
      };

      expect(result.found).toBe(false);
      expect(result.error).toContain('réseau KO');
    });
  });
});
