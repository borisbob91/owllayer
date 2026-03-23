// Sprint 4 — Order tools: get_order_status
// Uses WooCommerce Store API v1: GET /order/{id}
// Auth (OrderAuthorizationTrait.php):
//   - Client connecté + propriétaire → cookie session WP (pas de params supplémentaires)
//   - Invité → ?key={orderKey}&billing_email={email} — les DEUX obligatoires
//   - Commande d'un autre client → 403 Forbidden
// Champs réels (OrderSchema.php): items[], totals.total_price, billing_address, etc.
// ABSENTS de Store API v1: dateCreated, trackingNumber, trackingUrl

import type { StoreApiClient } from '../api/StoreApiClient.js';

interface DomOSInstance {
  registerTool(name: string, def: Record<string, unknown>): void;
}

interface WooOrderItem {
  name: string;
  quantity: number;
  totals: { line_total: string };
}

interface WooOrderTotals {
  total_price: string;
  subtotal: string;
  total_discount: string;
  total_shipping: string | null;
  total_tax: string;
  currency_code: string;
}

interface WooOrder {
  id: number;
  status: string;
  items: WooOrderItem[];
  totals: WooOrderTotals;
  billing_address: Record<string, string>;
  shipping_address: Record<string, string>;
  coupons: Array<{ code: string }>;
  needs_payment: boolean;
  needs_shipping: boolean;
}

export function registerOrderTools(domos: unknown, api: StoreApiClient): void {
  const d = domos as DomOSInstance;

  // ── get_order_status ──────────────────────────────────────────────────
  d.registerTool('get_order_status', {
    description:
      "Récupère le statut et le détail d'une commande WooCommerce via Store API v1. " +
      "Pour les clients connectés : requête directe (cookie session). " +
      "Pour les invités : fournissez key (order key) ET billing_email — les deux sont obligatoires.",
    risk: 'none',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'number', description: "ID numérique de la commande WooCommerce." },
        key: {
          type: 'string',
          description:
            "Order key WooCommerce (invités uniquement). " +
            "Format: wc_order_XXXXXXXXXXXXXXXX. Obligatoire avec billing_email pour les invités.",
        },
        billing_email: {
          type: 'string',
          description: "Email de facturation de la commande (invités uniquement). Obligatoire avec key.",
        },
      },
      required: ['orderId'],
    },
    handler: async (params: { orderId: number; key?: string; billing_email?: string }) => {
      let endpoint = `/order/${params.orderId}`;
      if (params.key && params.billing_email) {
        endpoint += `?key=${encodeURIComponent(params.key)}&billing_email=${encodeURIComponent(params.billing_email)}`;
      }

      let order: WooOrder;
      try {
        order = await api.get<WooOrder>(endpoint);
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        if (status === 404) {
          return { found: false, message: "Commande introuvable." };
        }
        if (status === 403) {
          return {
            found: false,
            message: "Accès refusé — cette commande appartient à un autre client.",
          };
        }
        if (status === 401) {
          return {
            found: false,
            message:
              "Non autorisé. Pour les invités, fournissez key + billing_email. " +
              "Vous pouvez aussi consulter vos commandes sur votre espace client.",
            my_account_url: '/my-account/orders',
          };
        }
        throw err;
      }

      return {
        found: true,
        order: {
          id: order.id,
          status: order.status,
          items: order.items.map(i => ({
            name: i.name,
            quantity: i.quantity,
            line_total: i.totals.line_total,
          })),
          totals: {
            total_price: order.totals.total_price,
            subtotal: order.totals.subtotal,
            total_discount: order.totals.total_discount,
            total_shipping: order.totals.total_shipping,
            total_tax: order.totals.total_tax,
            currency_code: order.totals.currency_code,
          },
          billing_address: order.billing_address,
          coupons: order.coupons,
          needs_payment: order.needs_payment,
          needs_shipping: order.needs_shipping,
        },
      };
    },
  });
}
