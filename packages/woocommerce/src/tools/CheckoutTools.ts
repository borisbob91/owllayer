// Sprint 4 — Checkout tools: initiate_checkout, fill_checkout_field
// Uses WooCommerce Store API v1:
//   GET /cart     — vérifier items_count > 0
//   PUT /checkout — mettre à jour le draft (adresses, payment_method)
// ⚠️ POST /checkout finalise la commande (ne PAS utiliser pour pré-remplir des champs)
// Sources vérifiées: Checkout.php, CheckoutSchema.php

import type { StoreApiClient } from '../api/StoreApiClient.js';
import type { OwlLayerWooConfig } from '../types.js';

interface OwlLayerInstance {
  registerTool(name: string, def: Record<string, unknown>): void;
}

export function registerCheckoutTools(
  owllayer: unknown,
  api: StoreApiClient,
  _config: OwlLayerWooConfig,
): void {
  const d = owllayer as OwlLayerInstance;

  // ── initiate_checkout ───────────────────────────────────────────────────
  d.registerTool('initiate_checkout', {
    description:
      "Lance le processus de checkout WooCommerce. " +
      "Vérifie que le panier n'est pas vide puis redirige vers /checkout.",
    risk: 'high',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async () => {
      const cart = await api.get<{ items_count: number }>('/cart');
      if (!cart.items_count || cart.items_count === 0) {
        return { success: false, error: 'Panier vide — impossible de procéder au checkout.' };
      }
      const checkoutUrl = '/checkout';
      if (typeof window !== 'undefined') {
        window.location.href = checkoutUrl;
      }
      return { success: true, redirecting: true, checkoutUrl };
    },
  });

  // ── fill_checkout_field ─────────────────────────────────────────────────
  d.registerTool('fill_checkout_field', {
    description:
      "Pré-remplit un champ du formulaire de checkout WooCommerce. " +
      "Mode Classic : mutation directe du DOM (input#field). " +
      "Mode Blocks : PUT /checkout avec l'objet adresse complet (pas de champ individuel possible).",
    risk: 'medium',
    parameters: {
      type: 'object',
      properties: {
        field: { type: 'string', description: "Nom du champ (ex: billing_first_name, billing_email)." },
        value: { type: 'string', description: "Valeur à insérer." },
        billingAddress: {
          type: 'object',
          description: "Adresse de facturation complète (mode Blocks — tous les champs requis par Store API).",
          properties: {
            first_name: { type: 'string' }, last_name: { type: 'string' },
            email: { type: 'string' }, phone: { type: 'string' },
            address_1: { type: 'string' }, address_2: { type: 'string' },
            city: { type: 'string' }, postcode: { type: 'string' }, country: { type: 'string' },
          },
        },
        shippingAddress: {
          type: 'object',
          description: "Adresse de livraison complète (mode Blocks).",
          properties: {
            first_name: { type: 'string' }, last_name: { type: 'string' },
            address_1: { type: 'string' }, address_2: { type: 'string' },
            city: { type: 'string' }, postcode: { type: 'string' }, country: { type: 'string' },
          },
        },
      },
      required: ['field', 'value'],
    },
    handler: async (params: {
      field: string;
      value: string;
      billingAddress?: Record<string, string>;
      shippingAddress?: Record<string, string>;
    }) => {
      const isBlocks =
        typeof document !== 'undefined' &&
        document.querySelector('.wc-block-checkout') !== null;

      if (!isBlocks) {
        // Classic checkout — mutation directe du DOM
        if (typeof document !== 'undefined') {
          const el = document.querySelector<HTMLInputElement>(`#${params.field}`);
          if (el) {
            el.value = params.value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        return { success: true, field: params.field, value: params.value, mode: 'classic' };
      }

      // Blocks checkout — PUT /checkout avec l'objet adresse complet
      // Store API v1 ne permet pas la mise à jour d'un champ individuel
      const body: Record<string, unknown> = {};
      if (params.billingAddress) {
        body['billing_address'] = params.billingAddress;
      } else if (params.shippingAddress) {
        body['shipping_address'] = params.shippingAddress;
      } else {
        return {
          success: false,
          field: params.field,
          mode: 'blocks',
          error:
            "Mode Blocks : PUT /checkout requiert l'objet adresse complet. " +
            "Fournissez billingAddress ou shippingAddress.",
        };
      }
      await api.put('/checkout', body);
      return { success: true, field: params.field, value: params.value, mode: 'blocks' };
    },
  });
}
