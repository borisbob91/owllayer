/**
 * CartTools — registers 4 cart tools on the OwlLayer instance.
 * Uses Shopify Cart AJAX API (no auth token required).
 * All URLs are locale-aware via window.Shopify.routes.root.
 */

import type { BrowserToolDefinition } from '@owllayer/browser';
import type { ShopifyCart, ShopifyCartItem } from '../types.js';
import { buildCartContext } from '../context/CartContextSync.js';

interface OwlLayerForTools {
  registerTool(name: string, definition: BrowserToolDefinition): void;
  updateContext(data: Record<string, unknown>): void;
}

const CART_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
};

function cartRoot(): string {
  return (window as unknown as { Shopify?: { routes?: { root?: string } } }).Shopify?.routes?.root ?? '/';
}

async function cartGet(): Promise<ShopifyCart> {
  const res = await fetch(`${cartRoot()}cart.js`);
  if (!res.ok) throw new Error(`cart.js fetch failed: ${res.status}`);
  return res.json() as Promise<ShopifyCart>;
}

export function registerCartTools(owllayer: OwlLayerForTools): void {
  owllayer.registerTool('add_to_cart', {
    description: "Ajoute un produit au panier. Utilise le variantId (pas le productId). Vérifier la disponibilité avec get_product si incertain.",
    parameters: {
      type: 'object',
      properties: {
        variantId: { type: 'string', description: 'ID de la variante Shopify à ajouter (ex: "41234567890")' },
        qty: { type: 'number', description: 'Quantité à ajouter (défaut: 1)' },
      },
      required: ['variantId'],
    },
    risk: 'low',
    handler: async (args) => {
      try {
        const res = await fetch(`${cartRoot()}cart/add.js`, {
          method: 'POST',
          headers: CART_HEADERS,
          body: JSON.stringify({
            items: [{ id: Number(args.variantId), quantity: Number(args.qty ?? 1) }],
          }),
        });
        if (!res.ok) {
          const err = await res.json() as Record<string, unknown>;
          return { success: false, error: (err.description as string) ?? "Impossible d'ajouter au panier" };
        }
        const { items: addedItems } = await res.json() as { items: ShopifyCartItem[] };
        // cart/add.js doesn't return full cart — need a separate GET
        const cart = await cartGet();
        owllayer.updateContext(buildCartContext(cart));
        return {
          success: true,
          itemCount: cart.item_count,
          cartTotal: `${(cart.total_price / 100).toFixed(2)} ${cart.currency}`,
          addedItem: {
            title: addedItems[0]?.title,
            qty: addedItems[0]?.quantity,
          },
        };
      } catch (e) {
        return { success: false, error: String(e) };
      }
    },
  });

  owllayer.registerTool('update_cart', {
    description: "Modifie la quantité d'un article dans le panier. Utiliser qty=0 pour supprimer (préférer remove_from_cart).",
    parameters: {
      type: 'object',
      properties: {
        variantId: { type: 'string', description: 'ID de la variante à modifier' },
        qty: { type: 'number', description: 'Nouvelle quantité (0 pour supprimer)' },
      },
      required: ['variantId', 'qty'],
    },
    risk: 'low',
    handler: async (args) => {
      try {
        const res = await fetch(`${cartRoot()}cart/change.js`, {
          method: 'POST',
          headers: CART_HEADERS,
          body: JSON.stringify({ id: Number(args.variantId), quantity: Number(args.qty) }),
        });
        if (!res.ok) {
          const err = await res.json() as Record<string, unknown>;
          return { success: false, error: (err.description as string) ?? 'Impossible de modifier le panier' };
        }
        // cart/change.js returns the full cart directly
        const cart = await res.json() as ShopifyCart;
        owllayer.updateContext(buildCartContext(cart));
        return {
          success: true,
          itemCount: cart.item_count,
          cartTotal: `${(cart.total_price / 100).toFixed(2)} ${cart.currency}`,
        };
      } catch (e) {
        return { success: false, error: String(e) };
      }
    },
  });

  owllayer.registerTool('remove_from_cart', {
    description: "Supprime complètement un article du panier.",
    parameters: {
      type: 'object',
      properties: {
        variantId: { type: 'string', description: 'ID de la variante à supprimer du panier' },
      },
      required: ['variantId'],
    },
    risk: 'low',
    handler: async (args) => {
      try {
        // Pre-fetch to get the item title before removal
        let removedTitle = 'Article';
        try {
          const currentCart = await cartGet();
          const item = currentCart.items.find((i) => String(i.variant_id) === String(args.variantId));
          if (item) removedTitle = item.title;
        } catch { /* continue even if pre-fetch fails */ }

        const res = await fetch(`${cartRoot()}cart/change.js`, {
          method: 'POST',
          headers: CART_HEADERS,
          body: JSON.stringify({ id: Number(args.variantId), quantity: 0 }),
        });
        if (!res.ok) {
          const err = await res.json() as Record<string, unknown>;
          return { success: false, error: (err.description as string) ?? "Impossible de supprimer l'article" };
        }
        const cart = await res.json() as ShopifyCart;
        owllayer.updateContext(buildCartContext(cart));
        return {
          success: true,
          removedTitle,
          itemCount: cart.item_count,
        };
      } catch (e) {
        return { success: false, error: String(e) };
      }
    },
  });

  owllayer.registerTool('get_cart', {
    description: "Consulte le contenu actuel du panier. Utiliser pour connaître l'état du panier avant d'agir ou pour répondre à une question du client.",
    parameters: {
      type: 'object',
      properties: {},
    },
    risk: 'none',
    handler: async () => {
      try {
        const cart = await cartGet();
        const ctx = buildCartContext(cart);
        return { success: true, ...(ctx.cart as Record<string, unknown>) };
      } catch (e) {
        return { success: false, error: String(e) };
      }
    },
  });
}
