import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerProductTools } from '../tools/ProductTools.js';
import type { StorefrontClient } from '../storefront/StorefrontClient.js';
import type { StorefrontProduct } from '../types.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeProduct = (overrides: Partial<StorefrontProduct> = {}): StorefrontProduct => ({
  id: 'gid://shopify/Product/1',
  handle: 'veste-alpine',
  title: 'Veste Alpine',
  description: 'Belle veste.',
  availableForSale: true,
  productType: 'Veste',
  tags: ['outdoor', 'imperméable'],
  vendor: 'AlpineCo',
  priceRange: { minVariantPrice: { amount: '89.00', currencyCode: 'EUR' } },
  compareAtPriceRange: { minVariantPrice: { amount: '120.00' } },
  featuredImage: { url: 'https://cdn.shopify.com/img.jpg', altText: null },
  images: { edges: [{ node: { url: 'https://cdn.shopify.com/img.jpg', altText: null } }] },
  variants: {
    edges: [
      {
        node: {
          id: 'gid://shopify/ProductVariant/100',
          title: 'S / Rouge',
          availableForSale: true,
          quantityAvailable: 3,
          price: { amount: '89.00', currencyCode: 'EUR' },
          selectedOptions: [
            { name: 'Size', value: 'S' },
            { name: 'Color', value: 'Rouge' },
          ],
        },
      },
    ],
  },
  ...overrides,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockClient(overrides: Partial<StorefrontClient> = {}): StorefrontClient {
  return {
    searchProducts: vi.fn().mockResolvedValue([makeProduct()]),
    getProduct: vi.fn().mockResolvedValue(makeProduct()),
    getProductRecommendations: vi.fn().mockResolvedValue([makeProduct()]),
    query: vi.fn(),
    shopDomain: 'test.myshopify.com',
    token: 'test-token',
    apiVersion: '2026-01',
    ...overrides,
  } as unknown as StorefrontClient;
}

function makeMockOwlLayer() {
  const tools: Record<string, { handler: (args: Record<string, unknown>) => unknown }> = {};
  return {
    registerTool: vi.fn((name: string, def: { handler: (a: Record<string, unknown>) => unknown }) => {
      tools[name] = def;
    }),
    getHandler: (name: string) => tools[name]?.handler,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('registerProductTools', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('avec client null', () => {
    it("n'enregistre pas search_products ni get_product", () => {
      const owllayer = makeMockOwlLayer();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      registerProductTools(owllayer, null);

      const names = owllayer.registerTool.mock.calls.map(([n]) => n as string);
      expect(names).not.toContain('search_products');
      expect(names).not.toContain('get_product');
      expect(warnSpy).toHaveBeenCalled();
    });

    it('enregistre quand même select_variant (DOM pure)', () => {
      const owllayer = makeMockOwlLayer();
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      registerProductTools(owllayer, null);

      const names = owllayer.registerTool.mock.calls.map(([n]) => n as string);
      expect(names).toContain('select_variant');
    });
  });

  describe('avec client valide', () => {
    it('enregistre les 3 tools', () => {
      const owllayer = makeMockOwlLayer();
      registerProductTools(owllayer, makeMockClient());

      const names = owllayer.registerTool.mock.calls.map(([n]) => n as string);
      expect(names).toContain('search_products');
      expect(names).toContain('get_product');
      expect(names).toContain('select_variant');
    });

    // ── search_products ──────────────────────────────────────────────────────

    describe('search_products', () => {
      it('appelle client.searchProducts et retourne les résultats normalisés', async () => {
        const client = makeMockClient();
        const owllayer = makeMockOwlLayer();
        registerProductTools(owllayer, client);

        const result = (await owllayer.getHandler('search_products')!({
          query: 'veste',
        })) as Record<string, unknown>;

        expect(client.searchProducts).toHaveBeenCalledWith('veste', {
          limit: 5,
          productType: undefined,
          tag: undefined,
          minPrice: undefined,
          maxPrice: undefined,
        });
        expect(result.success).toBe(true);
        expect((result.results as unknown[]).length).toBeGreaterThan(0);
      });

      it('plafonne limit à 20', async () => {
        const client = makeMockClient();
        const owllayer = makeMockOwlLayer();
        registerProductTools(owllayer, client);

        await owllayer.getHandler('search_products')!({ query: 'test', limit: 99 });

        const options = (client.searchProducts as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
          limit: number;
        };
        expect(options.limit).toBe(20);
      });

      it('retourne success: false si le client lève une erreur', async () => {
        const client = makeMockClient({
          searchProducts: vi.fn().mockRejectedValue(new Error('réseau KO')),
        } as unknown as Partial<StorefrontClient>);
        const owllayer = makeMockOwlLayer();
        registerProductTools(owllayer, client);

        const result = (await owllayer.getHandler('search_products')!({
          query: 'veste',
        })) as { success: boolean; error: string };

        expect(result.success).toBe(false);
        expect(result.error).toContain('réseau KO');
      });
    });

    // ── get_product ──────────────────────────────────────────────────────────

    describe('get_product', () => {
      it('retourne les détails du produit avec ses variantes', async () => {
        const owllayer = makeMockOwlLayer();
        registerProductTools(owllayer, makeMockClient());

        const result = (await owllayer.getHandler('get_product')!({
          handle: 'veste-alpine',
        })) as { success: boolean; product: { handle: string; variants: unknown[] } };

        expect(result.success).toBe(true);
        expect(result.product.handle).toBe('veste-alpine');
        expect(result.product.variants).toHaveLength(1);
      });

      it('retourne success: false si produit introuvable', async () => {
        const client = makeMockClient({
          getProduct: vi.fn().mockResolvedValue(null),
        } as unknown as Partial<StorefrontClient>);
        const owllayer = makeMockOwlLayer();
        registerProductTools(owllayer, client);

        const result = (await owllayer.getHandler('get_product')!({
          handle: 'inexistant',
        })) as { success: boolean; error: string };

        expect(result.success).toBe(false);
        expect(result.error).toContain('inexistant');
      });
    });
  });

  // ── select_variant ─────────────────────────────────────────────────────────

  describe('select_variant', () => {
    it('retourne error si ni variantId ni options fournis', async () => {
      const owllayer = makeMockOwlLayer();
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      registerProductTools(owllayer, null);

      const result = (await owllayer.getHandler('select_variant')!({})) as {
        success: boolean;
        error: string;
      };
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('Pattern 1: sélectionne via select[name="id"] et dispatch un change event', async () => {
      const owllayer = makeMockOwlLayer();
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      registerProductTools(owllayer, null);

      const select = document.createElement('select');
      select.name = 'id';
      select.innerHTML = `<option value="100">S</option>`;
      document.body.appendChild(select);

      const changeListener = vi.fn();
      select.addEventListener('change', changeListener);

      const result = (await owllayer.getHandler('select_variant')!({
        variantId: '100',
      })) as { success: boolean };

      expect(select.value).toBe('100');
      expect(changeListener).toHaveBeenCalled();
      expect(result.success).toBe(true);

      document.body.removeChild(select);
    });

    it('Pattern 3: dispatch CustomEvent variant:selected', async () => {
      const owllayer = makeMockOwlLayer();
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      registerProductTools(owllayer, null);

      const eventListener = vi.fn();
      document.addEventListener('variant:selected', eventListener);

      await owllayer.getHandler('select_variant')!({ variantId: '42' });

      expect(eventListener).toHaveBeenCalled();
      const evt = eventListener.mock.calls[0][0] as CustomEvent<{ variantId: string }>;
      expect(evt.detail.variantId).toBe('42');

      document.removeEventListener('variant:selected', eventListener);
    });

    it('Pattern 2B: sélectionne via radio button quand options fournies', async () => {
      const owllayer = makeMockOwlLayer();
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      registerProductTools(owllayer, null);

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'option1';
      radio.value = 'L';
      document.body.appendChild(radio);

      await owllayer.getHandler('select_variant')!({
        variantId: '99',
        options: { Size: 'L' },
      });

      expect(radio.checked).toBe(true);
      document.body.removeChild(radio);
    });

    it('résout variantId depuis #owllayer-product-json si options seules fournies', async () => {
      const owllayer = makeMockOwlLayer();
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      registerProductTools(owllayer, null);

      const script = document.createElement('script');
      script.id = 'owllayer-product-json';
      script.type = 'application/json';
      script.textContent = JSON.stringify({
        variants: [
          { id: 200, options: ['L', 'Bleu'] },
          { id: 201, options: ['S', 'Rouge'] },
        ],
      });
      document.body.appendChild(script);

      const eventListener = vi.fn();
      document.addEventListener('variant:selected', eventListener);

      await owllayer.getHandler('select_variant')!({ options: { Size: 'L', Color: 'Bleu' } });

      expect(eventListener).toHaveBeenCalled();
      const evt = eventListener.mock.calls[0][0] as CustomEvent<{ variantId: string }>;
      expect(evt.detail.variantId).toBe('200');

      document.removeEventListener('variant:selected', eventListener);
      document.body.removeChild(script);
    });
  });
});
