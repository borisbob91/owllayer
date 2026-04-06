import { describe, it, expect, vi, afterEach } from 'vitest';
import { StoreApiClient } from '../api/StoreApiClient.js';

function makeOk(data: unknown) {
  return vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(data) });
}

function makeFail(status: number, message: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({ message }),
  });
}

describe('StoreApiClient', () => {
  const BASE = '/wp-json/wc/store/v1';
  const NONCE = 'test-nonce-abc';

  afterEach(() => { vi.restoreAllMocks(); });

  describe('get()', () => {
    it('fait un GET et retourne les données', async () => {
      const cart = { items_count: 2, totals: { total_price: '4999' } };
      vi.stubGlobal('fetch', makeOk(cart));
      const client = new StoreApiClient(BASE, NONCE);
      const result = await client.get<typeof cart>('/cart');
      expect(result).toEqual(cart);
      expect(fetch).toHaveBeenCalledOnce();
    });

    it('envoie le header Nonce', async () => {
      vi.stubGlobal('fetch', makeOk({}));
      const client = new StoreApiClient(BASE, NONCE);
      await client.get('/cart');
      const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['Nonce']).toBe(NONCE);
    });

    it('fait un GET sans nonce si non fourni', async () => {
      vi.stubGlobal('fetch', makeOk({}));
      const client = new StoreApiClient(BASE);
      await client.get('/products');
      const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['Nonce']).toBeUndefined();
    });

    it('lève une erreur si le status n\'est pas ok', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
      const client = new StoreApiClient(BASE, NONCE);
      await expect(client.get('/cart')).rejects.toThrow('404');
    });

    it('construit l\'URL correctement', async () => {
      vi.stubGlobal('fetch', makeOk([]));
      const client = new StoreApiClient(BASE, NONCE);
      await client.get('/products?search=shirt');
      const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
      expect(url).toBe(`${BASE}/products?search=shirt`);
    });
  });

  describe('post()', () => {
    it('fait un POST avec body JSON', async () => {
      const responseData = { key: 'abc123', id: 42, quantity: 1 };
      vi.stubGlobal('fetch', makeOk(responseData));
      const client = new StoreApiClient(BASE, NONCE);
      const result = await client.post<typeof responseData>('/cart/add-item', { id: 42, quantity: 1 });
      expect(result).toEqual(responseData);
      const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ id: 42, quantity: 1 }));
    });

    it('envoie Content-Type application/json', async () => {
      vi.stubGlobal('fetch', makeOk({}));
      const client = new StoreApiClient(BASE, NONCE);
      await client.post('/cart/coupons', { code: 'PROMO10' });
      const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });

    it('extrait le message d\'erreur WooCommerce en cas d\'échec', async () => {
      vi.stubGlobal('fetch', makeFail(400, 'Produit en rupture de stock'));
      const client = new StoreApiClient(BASE, NONCE);
      await expect(client.post('/cart/add-item', { id: 1, quantity: 99 }))
        .rejects.toThrow('Produit en rupture de stock');
    });

    it('fallback sur le status si pas de message JSON', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('not json')),
      }));
      const client = new StoreApiClient(BASE, NONCE);
      await expect(client.post('/checkout', {})).rejects.toThrow('500');
    });
  });

  describe('del()', () => {
    it('fait un DELETE sans body', async () => {
      vi.stubGlobal('fetch', makeOk({ removed: true }));
      const client = new StoreApiClient(BASE, NONCE);
      await client.del('/cart/items/abc123');
      const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe('DELETE');
      expect(init.body).toBeUndefined();
    });

    it('fait un DELETE avec body si fourni', async () => {
      vi.stubGlobal('fetch', makeOk({}));
      const client = new StoreApiClient(BASE, NONCE);
      await client.del('/cart/items/abc123', { quantity: 0 });
      const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
      expect(init.body).toBe(JSON.stringify({ quantity: 0 }));
    });

    it('lève une erreur si DELETE échoue', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
      const client = new StoreApiClient(BASE, NONCE);
      await expect(client.del('/cart/items/notfound')).rejects.toThrow('404');
    });
  });
});
