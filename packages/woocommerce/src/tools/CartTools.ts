import type { StoreApiClient } from '../api/StoreApiClient.js';
import type { CartContextSync } from '../context/CartContextSync.js';

interface DomOSInstance {
  registerTool(name: string, def: Record<string, unknown>): void;
  getContext(): Record<string, unknown>;
}

type CartItem = { key: string; id: number; title: string; qty: number };

/** Resolve a WooCommerce cart item key from productId using current DomOS cart context. */
function resolveKey(domos: DomOSInstance, productId: number): string | null {
  const cart = (domos.getContext()?.cart as Record<string, unknown> | undefined);
  const items = cart?.items as CartItem[] | undefined;
  return items?.find(i => i.id === productId)?.key ?? null;
}

export function registerCartTools(domos: unknown, api: StoreApiClient, sync: CartContextSync): void {
  const d = domos as DomOSInstance;

  // ── add_to_cart ──────────────────────────────────────────────────────────
  d.registerTool('add_to_cart', {
    description: "Ajoute un produit au panier WooCommerce.",
    risk: 'low',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'number', description: "ID du produit ou de la variation." },
        quantity:  { type: 'number', description: "Quantité à ajouter." },
        variation: {
          type: 'array',
          description: "Attributs de variation (ex. couleur, taille). Chaque entrée : { attribute, value }.",
          items: {
            type: 'object',
            properties: {
              attribute: { type: 'string' },
              value:     { type: 'string' },
            },
            required: ['attribute', 'value'],
          },
        },
      },
      required: ['productId', 'quantity'],
    },
    handler: async (params: { productId: number; quantity: number; variation?: Array<{ attribute: string; value: string }> }) => {
      await api.post('/cart/add-item', {
        id: params.productId,
        quantity: params.quantity,
        ...(params.variation ? { variation: params.variation } : {}),
      });
      await sync._fetchAndEmit();
      return { success: true, message: `Produit ${params.productId} ajouté au panier (×${params.quantity}).` };
    },
  });

  // ── update_cart_item ─────────────────────────────────────────────────────
  d.registerTool('update_cart_item', {
    description: "Modifie la quantité d'un article dans le panier. Utilise la clé WooCommerce ou l'ID produit.",
    risk: 'low',
    parameters: {
      type: 'object',
      properties: {
        key:       { type: 'string', description: "Clé WooCommerce de l'article (MD5 32 chars)." },
        productId: { type: 'number', description: "ID produit (alternatif à key)." },
        qty:       { type: 'number', description: "Nouvelle quantité." },
      },
      required: ['qty'],
    },
    handler: async (params: { key?: string; productId?: number; qty: number }) => {
      const key = params.key ?? (params.productId ? resolveKey(d, params.productId) : null);
      if (!key) return { success: false, error: "Impossible de trouver l'article dans le panier." };
      await api.put(`/cart/items/${key}`, { quantity: params.qty });
      await sync._fetchAndEmit();
      return { success: true, message: `Quantité mise à jour : ${params.qty}.` };
    },
  });

  // ── remove_cart_item ─────────────────────────────────────────────────────
  d.registerTool('remove_cart_item', {
    description: "Supprime un article du panier WooCommerce.",
    risk: 'low',
    parameters: {
      type: 'object',
      properties: {
        key:       { type: 'string', description: "Clé WooCommerce de l'article." },
        productId: { type: 'number', description: "ID produit (alternatif à key)." },
      },
    },
    handler: async (params: { key?: string; productId?: number }) => {
      const key = params.key ?? (params.productId ? resolveKey(d, params.productId) : null);
      if (!key) return { success: false, error: "Impossible de trouver l'article dans le panier." };
      await api.del(`/cart/items/${key}`);
      await sync._fetchAndEmit();
      return { success: true, message: "Article supprimé du panier." };
    },
  });

  // ── get_cart ─────────────────────────────────────────────────────────────
  d.registerTool('get_cart', {
    description: "Retourne l'état actuel du panier WooCommerce.",
    risk: 'none',
    parameters: { type: 'object', properties: {} },
    handler: async () => {
      await sync._fetchAndEmit();
      return (d.getContext()?.cart) ?? { isEmpty: true, itemCount: 0, items: [] };
    },
  });

  // ── apply_coupon ─────────────────────────────────────────────────────────
  // Endpoint vérifié: POST /cart/coupons (CartCoupons.php) — réponse 201 avec cart mis à jour
  d.registerTool('apply_coupon', {
    description: "Applique un code promo au panier WooCommerce.",
    risk: 'none',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: "Code promo à appliquer." },
      },
      required: ['code'],
    },
    handler: async (params: { code: string }) => {
      const cart = await api.post<Record<string, unknown>>('/cart/coupons', { code: params.code });
      await sync._fetchAndEmit();
      // Extract discount from returned cart coupons array
      const coupons = cart['coupons'] as Array<{ code: string; totals?: { total_discount?: string; currency_code?: string } }> | undefined;
      const applied = coupons?.find(c => c.code === params.code.toLowerCase());
      const discount = applied?.totals?.total_discount
        ? `${(parseInt(applied.totals.total_discount) / 100).toFixed(2)} ${applied.totals.currency_code ?? ''}`
        : '';
      return { success: true, code: params.code, discount };
    },
  });

  // ── remove_coupon ─────────────────────────────────────────────────────────
  d.registerTool('remove_coupon', {
    description: "Supprime un code promo du panier WooCommerce.",
    risk: 'none',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: "Code promo à supprimer." },
      },
      required: ['code'],
    },
    handler: async (params: { code: string }) => {
      await api.del(`/cart/coupons/${encodeURIComponent(params.code)}`);
      await sync._fetchAndEmit();
      return { success: true, message: `Coupon "${params.code}" supprimé.` };
    },
  });
}
