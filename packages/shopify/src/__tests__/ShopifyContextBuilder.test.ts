import { describe, it, expect, beforeEach } from 'vitest';
import { ShopifyContextBuilder } from '../context/ShopifyContextBuilder.js';

// Helper : injecter un <script> dans le DOM jsdom
function injectScript(id: string, content: unknown): void {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const el = document.createElement('script');
  el.id = id;
  el.type = 'application/json';
  el.textContent = JSON.stringify(content);
  document.body.appendChild(el);
}

function cleanupScripts(): void {
  document.getElementById('owllayer-product-json')?.remove();
  document.getElementById('owllayer-collection-json')?.remove();
}

describe('ShopifyContextBuilder', () => {
  let builder: ShopifyContextBuilder;

  beforeEach(() => {
    builder = new ShopifyContextBuilder();
    cleanupScripts();
    // Reset body data attribute
    delete document.body.dataset.pageType;
    // Reset window globals
    (window as unknown as Record<string, unknown>).Shopify = undefined;
    (window as unknown as Record<string, unknown>).ShopifyAnalytics = undefined;
  });

  describe('_detectPageType()', () => {
    it('lit le type depuis ShopifyAnalytics si disponible', () => {
      (window as unknown as Record<string, unknown>).ShopifyAnalytics = {
        meta: { page: { pageType: 'product' } },
      };
      const ctx = builder.build();
      expect(ctx.currentPage).toBe('product');
    });

    it('fallback sur data-page-type du body', () => {
      document.body.dataset.pageType = 'collection';
      const ctx = builder.build();
      expect(ctx.currentPage).toBe('collection');
    });

    it('fallback sur URL /products/', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/products/red-shirt', hostname: 'test.myshopify.com' },
        writable: true,
      });
      const ctx = builder.build();
      expect(ctx.currentPage).toBe('product');
    });

    it('fallback sur URL /cart', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/cart', hostname: 'test.myshopify.com' },
        writable: true,
      });
      const ctx = builder.build();
      expect(ctx.currentPage).toBe('cart');
    });
  });

  describe('_readShopGlobals()', () => {
    it('lit currency et locale depuis window.Shopify', () => {
      (window as unknown as Record<string, unknown>).Shopify = {
        shop: 'my-store.myshopify.com',
        currency: 'EUR',
        locale: 'fr',
      };
      const ctx = builder.build();
      const shop = ctx.shop as Record<string, unknown>;
      expect(shop.currency).toBe('EUR');
      expect(shop.locale).toBe('fr');
      expect(shop.domain).toBe('my-store.myshopify.com');
    });

    it('fallback sur USD si Shopify absent', () => {
      const ctx = builder.build();
      const shop = ctx.shop as Record<string, unknown>;
      expect(shop.currency).toBe('USD');
    });
  });

  describe('_readProductContext()', () => {
    it('lit le produit depuis owllayer-product-json', () => {
      (window as unknown as Record<string, unknown>).Shopify = { currency: 'EUR', locale: 'fr' };
      injectScript('owllayer-product-json', {
        id: 12345,
        handle: 'red-shirt',
        title: 'Red T-Shirt',
        price: 4999,
        compare_at_price: 5999,
        available: true,
        vendor: 'Acme',
        product_type: 'T-Shirt',
        tags: ['red', 'tshirt'],
        variants: [
          { id: 111, title: 'S', price: 4999, available: true },
          { id: 222, title: 'M', price: 4999, available: false },
        ],
      });

      const ctx = builder.build();
      const product = ctx.product as Record<string, unknown>;
      expect(product.handle).toBe('red-shirt');
      expect(product.title).toBe('Red T-Shirt');
      expect(product.price).toBe('49.99 EUR');
      expect(product.compareAtPrice).toBe('59.99 EUR');
      expect(product.available).toBe(true);
      const variants = product.variants as Array<Record<string, unknown>>;
      expect(variants).toHaveLength(2);
      expect(variants[0].title).toBe('S');
      expect(variants[1].available).toBe(false);
    });

    it('retourne null si le script est absent', () => {
      const ctx = builder.build();
      expect(ctx.product).toBeUndefined();
    });

    it('retourne null si le JSON est invalide', () => {
      const el = document.createElement('script');
      el.id = 'owllayer-product-json';
      el.type = 'application/json';
      el.textContent = 'not json {{';
      document.body.appendChild(el);

      const ctx = builder.build();
      expect(ctx.product).toBeUndefined();
    });
  });

  describe('_readCollectionContext()', () => {
    it('lit la collection depuis owllayer-collection-json', () => {
      injectScript('owllayer-collection-json', {
        id: 99,
        handle: 'summer',
        title: 'Summer Collection',
        description: 'Hot picks',
        products_count: 12,
      });

      const ctx = builder.build();
      const collection = ctx.collection as Record<string, unknown>;
      expect(collection.handle).toBe('summer');
      expect(collection.title).toBe('Summer Collection');
      expect(collection.productsCount).toBe(12);
    });

    it('retourne null si le script est absent', () => {
      const ctx = builder.build();
      expect(ctx.collection).toBeUndefined();
    });
  });

  describe('userLocation + availableActions', () => {
    it('construit le userLocation pour une page produit', () => {
      injectScript('owllayer-product-json', {
        id: 1, handle: 'test', title: 'Mon Produit', price: 1000,
        available: true, vendor: '', product_type: '', tags: [], variants: [],
      });
      const ctx = builder.build();
      expect(ctx.userLocation).toContain('Mon Produit');
      const actions = ctx.availableActions as string[];
      expect(actions.some(a => a.includes('add_to_cart'))).toBe(true);
    });

    it('construit le userLocation pour une page collection', () => {
      injectScript('owllayer-collection-json', {
        id: 2, handle: 'men', title: 'Hommes', description: '', products_count: 5,
      });
      const ctx = builder.build();
      expect(ctx.userLocation).toContain('Hommes');
    });
  });
});
