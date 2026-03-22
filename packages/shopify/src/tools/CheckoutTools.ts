// Sprint 4 — Checkout tools: initiate_checkout, apply_discount
// Sprint 5+: in-chat PaymentWidget (Shopify Pay / Apple Pay / Google Pay)

import type { BrowserToolDefinition } from '@domos/browser';
import type { DomOSShopifyConfig } from '../types.js';

declare const window: Window & {
  Shopify?: { routes?: { root?: string } };
};

interface DomOSForTools {
  registerTool(name: string, definition: BrowserToolDefinition): void;
}

function navRoot(): string {
  return window.Shopify?.routes?.root ?? '/';
}

export function registerCheckoutTools(domos: DomOSForTools, _config: DomOSShopifyConfig): void {
  domos.registerTool('initiate_checkout', {
    description:
      "Redirige l'utilisateur vers la page de paiement Shopify. À utiliser quand le client veut passer commande. " +
      "Nécessite une confirmation explicite avant exécution (HITL).",
    parameters: { type: 'object', properties: {} },
    risk: 'high',
    handler: async () => {
      try {
        // Verify cart is not empty before redirecting
        const res = await fetch(`${navRoot()}cart.js`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
        });
        if (!res.ok) return { success: false, error: `Impossible de lire le panier (${res.status})` };

        const cart = (await res.json()) as { item_count: number };
        if (cart.item_count === 0) {
          return { success: false, error: 'Le panier est vide. Ajoutez des articles avant de passer commande.' };
        }

        window.location.href = `${navRoot()}checkout`;
        return { success: true, redirecting: true };
      } catch (e) {
        return { success: false, error: String(e) };
      }
    },
  });

  domos.registerTool('apply_discount', {
    description:
      "Applique un code promo et redirige vers le checkout Shopify pour valider la réduction.",
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Code promotionnel à appliquer (ex: "SUMMER20", "BIENVENUE10")',
        },
      },
      required: ['code'],
    },
    risk: 'none',
    handler: (args) => {
      const code = (args.code as string).trim().toUpperCase();
      if (!code) return { success: false, error: 'Code promo vide' };

      // Navigate to checkout with discount query param — Shopify applies it automatically
      const url = `${navRoot()}checkout?discount=${encodeURIComponent(code)}`;
      window.location.href = url;
      return { success: true, code, redirecting: true, url };
    },
  });
}

