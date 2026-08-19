import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerNavigationTools } from '../tools/NavigationTools.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

describe('registerNavigationTools', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // reset Shopify global
    if ('Shopify' in window) {
      delete (window as Window & { Shopify?: unknown }).Shopify;
    }
  });

  it('enregistre navigate_to_product et navigate_to_collection', () => {
    const owllayer = makeMockOwlLayer();
    registerNavigationTools(owllayer);

    const names = owllayer.registerTool.mock.calls.map(([n]) => n as string);
    expect(names).toContain('navigate_to_product');
    expect(names).toContain('navigate_to_collection');
  });

  describe('navigate_to_product', () => {
    it('construit une URL avec le chemin /products/{handle}', () => {
      const owllayer = makeMockOwlLayer();
      registerNavigationTools(owllayer);

      // Mock window.location.href setter
      let capturedHref = '';
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window.location, 'href', {
        set: (v: string) => { capturedHref = v; },
        get: () => capturedHref,
        configurable: true,
      });

      const result = owllayer.getHandler('navigate_to_product')!({ handle: 'veste-alpine' }) as {
        navigating: boolean;
        url: string;
      };

      expect(result.navigating).toBe(true);
      expect(result.url).toContain('/products/veste-alpine');
    });

    it('utilise routes.root quand window.Shopify.routes.root est défini', () => {
      (window as Window & { Shopify?: unknown }).Shopify = { routes: { root: '/fr/' } };

      const owllayer = makeMockOwlLayer();
      registerNavigationTools(owllayer);

      let capturedHref = '';
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window.location, 'href', {
        set: (v: string) => { capturedHref = v; },
        get: () => capturedHref,
        configurable: true,
      });

      const result = owllayer.getHandler('navigate_to_product')!({ handle: 'red-shirt' }) as {
        url: string;
      };

      expect(result.url).toBe('/fr/products/red-shirt');
    });

    it('utilise "/" par défaut si window.Shopify non défini', () => {
      const owllayer = makeMockOwlLayer();
      registerNavigationTools(owllayer);

      let capturedHref = '';
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window.location, 'href', {
        set: (v: string) => { capturedHref = v; },
        get: () => capturedHref,
        configurable: true,
      });

      const result = owllayer.getHandler('navigate_to_product')!({ handle: 't-shirt' }) as { url: string };
      expect(result.url).toBe('/products/t-shirt');
    });
  });

  describe('navigate_to_collection', () => {
    it('construit une URL avec le chemin /collections/{handle}', () => {
      const owllayer = makeMockOwlLayer();
      registerNavigationTools(owllayer);

      let capturedHref = '';
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window.location, 'href', {
        set: (v: string) => { capturedHref = v; },
        get: () => capturedHref,
        configurable: true,
      });

      const result = owllayer.getHandler('navigate_to_collection')!({ handle: 'vestes' }) as {
        navigating: boolean;
        url: string;
      };

      expect(result.navigating).toBe(true);
      expect(result.url).toContain('/collections/vestes');
    });

    it('utilise routes.root pour les collections également', () => {
      (window as Window & { Shopify?: unknown }).Shopify = { routes: { root: '/de/' } };

      const owllayer = makeMockOwlLayer();
      registerNavigationTools(owllayer);

      let capturedHref = '';
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window.location, 'href', {
        set: (v: string) => { capturedHref = v; },
        get: () => capturedHref,
        configurable: true,
      });

      const result = owllayer.getHandler('navigate_to_collection')!({ handle: 'soldes' }) as { url: string };
      expect(result.url).toBe('/de/collections/soldes');
    });
  });
});
