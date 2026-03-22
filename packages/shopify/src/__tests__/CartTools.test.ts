import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { registerCartTools } from '../tools/CartTools.js';
import type { ShopifyCart } from '../types.js';

const mockCart: ShopifyCart = {
  token: 'abc123',
  item_count: 1,
  total_price: 4999,
  currency: 'EUR',
  items: [
    { id: 111, variant_id: 111, product_id: 222, title: 'Red T-Shirt - L', quantity: 1, price: 4999, handle: 'red-t-shirt' },
  ],
};

const emptyCart: ShopifyCart = {
  token: 'abc123',
  item_count: 0,
  total_price: 0,
  currency: 'EUR',
  items: [],
};

function makeDomosMock() {
  return {
    registerTool: vi.fn(),
    updateContext: vi.fn(),
  };
}

function getHandler(domos: ReturnType<typeof makeDomosMock>, toolName: string) {
  const call = domos.registerTool.mock.calls.find(([name]: [string]) => name === toolName);
  if (!call) throw new Error(`Tool "${toolName}" non enregistré`);
  return call[1].handler as (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

function makeFetchOk(data: unknown) {
  return vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(data) });
}

function makeFetchFail(description: string) {
  return vi.fn().mockResolvedValue({ ok: false, status: 422, json: vi.fn().mockResolvedValue({ description }) });
}

describe('registerCartTools', () => {
  let domos: ReturnType<typeof makeDomosMock>;

  beforeEach(() => {
    domos = makeDomosMock();
    (window as unknown as Record<string, unknown>).Shopify = { routes: { root: '/' } };
    registerCartTools(domos);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as unknown as Record<string, unknown>).Shopify;
  });

  it('enregistre exactement 4 tools', () => {
    const names = domos.registerTool.mock.calls.map(([name]: [string]) => name);
    expect(names).toContain('add_to_cart');
    expect(names).toContain('update_cart');
    expect(names).toContain('remove_from_cart');
    expect(names).toContain('get_cart');
    expect(names).toHaveLength(4);
  });

  it('add_to_cart a risk: low', () => {
    const call = domos.registerTool.mock.calls.find(([n]: [string]) => n === 'add_to_cart');
    expect(call?.[1].risk).toBe('low');
  });

  it('update_cart a risk: low', () => {
    const call = domos.registerTool.mock.calls.find(([n]: [string]) => n === 'update_cart');
    expect(call?.[1].risk).toBe('low');
  });

  it('remove_from_cart a risk: low', () => {
    const call = domos.registerTool.mock.calls.find(([n]: [string]) => n === 'remove_from_cart');
    expect(call?.[1].risk).toBe('low');
  });

  it('get_cart a risk: none', () => {
    const call = domos.registerTool.mock.calls.find(([n]: [string]) => n === 'get_cart');
    expect(call?.[1].risk).toBe('none');
  });

  describe('add_to_cart handler', () => {
    it('ajoute un article et retourne le succès avec itemCount et cartTotal', async () => {
      vi.stubGlobal('fetch', vi.fn()
        // Premier appel: POST cart/add.js → items ajoutés
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ items: [{ title: 'Red T-Shirt - L', quantity: 1, variant_id: 111, price: 4999 }] }) })
        // Deuxième appel: GET cart.js → état complet
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(mockCart) }),
      );
      const result = await getHandler(domos, 'add_to_cart')({ variantId: '111', qty: 1 });
      expect(result.success).toBe(true);
      expect(result.itemCount).toBe(1);
      expect(result.cartTotal).toBe('49.99 EUR');
      expect((result.addedItem as Record<string, unknown>).title).toBe('Red T-Shirt - L');
      expect(domos.updateContext).toHaveBeenCalledTimes(1);
    });

    it('utilise qty=1 par défaut si absent', async () => {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ items: [{ title: 'Shirt', quantity: 1, variant_id: 111, price: 4999 }] }) })
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(mockCart) }),
      );
      const result = await getHandler(domos, 'add_to_cart')({ variantId: '111' });
      expect(result.success).toBe(true);
      const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string) as { items: Array<{ quantity: number }> };
      expect(body.items[0].quantity).toBe(1);
    });

    it('retourne { success: false } si variante out-of-stock (422)', async () => {
      vi.stubGlobal('fetch', makeFetchFail('Ce produit est épuisé.'));
      const result = await getHandler(domos, 'add_to_cart')({ variantId: '999', qty: 1 });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Ce produit est épuisé.');
      expect(domos.updateContext).not.toHaveBeenCalled();
    });

    it('retourne { success: false } sur erreur réseau', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const result = await getHandler(domos, 'add_to_cart')({ variantId: '111', qty: 1 });
      expect(result.success).toBe(false);
      expect(String(result.error)).toContain('Network error');
    });

    it('utilise la locale-aware URL', async () => {
      (window as unknown as Record<string, unknown>).Shopify = { routes: { root: '/fr/' } };
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ items: [{ title: 'Shirt', quantity: 1, variant_id: 111, price: 4999 }] }) })
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(mockCart) }),
      );
      await getHandler(domos, 'add_to_cart')({ variantId: '111', qty: 1 });
      expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/fr/cart/add.js');
    });
  });

  describe('update_cart handler', () => {
    it('modifie la quantité et met à jour le contexte', async () => {
      vi.stubGlobal('fetch', makeFetchOk(mockCart));
      const result = await getHandler(domos, 'update_cart')({ variantId: '111', qty: 2 });
      expect(result.success).toBe(true);
      expect(result.itemCount).toBe(1);
      expect(result.cartTotal).toBe('49.99 EUR');
      expect(domos.updateContext).toHaveBeenCalledTimes(1);
    });

    it('envoie les bons headers et body', async () => {
      vi.stubGlobal('fetch', makeFetchOk(mockCart));
      await getHandler(domos, 'update_cart')({ variantId: '111', qty: 3 });
      const [url, opts] = vi.mocked(fetch).mock.calls[0];
      expect(url).toBe('/cart/change.js');
      expect((opts?.headers as Record<string, string>)?.['X-Requested-With']).toBe('XMLHttpRequest');
      const body = JSON.parse(opts?.body as string) as { id: number; quantity: number };
      expect(body.id).toBe(111);
      expect(body.quantity).toBe(3);
    });

    it('retourne { success: false } sur erreur API', async () => {
      vi.stubGlobal('fetch', makeFetchFail('Variante introuvable'));
      const result = await getHandler(domos, 'update_cart')({ variantId: '999', qty: 1 });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Variante introuvable');
    });

    it('retourne { success: false } sur erreur réseau', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const result = await getHandler(domos, 'update_cart')({ variantId: '111', qty: 1 });
      expect(result.success).toBe(false);
    });
  });

  describe('remove_from_cart handler', () => {
    it('supprime l\'article et retourne removedTitle + itemCount', async () => {
      vi.stubGlobal('fetch', vi.fn()
        // Pre-fetch GET cart.js pour récupérer le titre
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(mockCart) })
        // POST cart/change.js qty=0 → cart vide
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(emptyCart) }),
      );
      const result = await getHandler(domos, 'remove_from_cart')({ variantId: '111' });
      expect(result.success).toBe(true);
      expect(result.removedTitle).toBe('Red T-Shirt - L');
      expect(result.itemCount).toBe(0);
      expect(domos.updateContext).toHaveBeenCalledTimes(1);
    });

    it('continue même si le pre-fetch échoue', async () => {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 503 }) // pre-fetch échoue
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(emptyCart) }),
      );
      const result = await getHandler(domos, 'remove_from_cart')({ variantId: '111' });
      expect(result.success).toBe(true);
      expect(result.removedTitle).toBe('Article'); // fallback title
    });

    it('retourne { success: false } si la suppression échoue', async () => {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(mockCart) })
        .mockResolvedValueOnce({ ok: false, status: 422, json: vi.fn().mockResolvedValue({ description: 'Erreur' }) }),
      );
      const result = await getHandler(domos, 'remove_from_cart')({ variantId: '111' });
      expect(result.success).toBe(false);
    });
  });

  describe('get_cart handler', () => {
    it('retourne le contenu du panier au format DomOS', async () => {
      vi.stubGlobal('fetch', makeFetchOk(mockCart));
      const result = await getHandler(domos, 'get_cart')({});
      expect(result.success).toBe(true);
      expect(result.isEmpty).toBe(false);
      expect(result.itemCount).toBe(1);
      expect(result.total).toBe('49.99 EUR');
      expect(result.currency).toBe('EUR');
    });

    it('retourne isEmpty=true pour un panier vide', async () => {
      vi.stubGlobal('fetch', makeFetchOk(emptyCart));
      const result = await getHandler(domos, 'get_cart')({});
      expect(result.isEmpty).toBe(true);
      expect(result.itemCount).toBe(0);
    });

    it('n\'appelle pas updateContext (lecture seule)', async () => {
      vi.stubGlobal('fetch', makeFetchOk(mockCart));
      await getHandler(domos, 'get_cart')({});
      expect(domos.updateContext).not.toHaveBeenCalled();
    });

    it('retourne { success: false } si fetch échoue', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
      const result = await getHandler(domos, 'get_cart')({});
      expect(result.success).toBe(false);
    });
  });
});
