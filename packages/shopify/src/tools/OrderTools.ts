// Sprint 4 — Order tool: get_order_status
// Uses Shopify Storefront API customer.orders query.
// Requires a customer access token injected via Liquid (window.__domos_customer_token).
// When the token is absent, returns a guided link to /account/orders.

import type { BrowserToolDefinition } from '@domos/browser';
import type { StorefrontClient } from '../storefront/StorefrontClient.js';
import { GQL_GET_CUSTOMER_ORDERS } from '../storefront/StorefrontClient.js';
import { getCustomerAccessToken } from '../context/CustomerContext.js';

declare const window: Window & {
  Shopify?: { routes?: { root?: string } };
};

interface DomOSForTools {
  registerTool(name: string, definition: BrowserToolDefinition): void;
}

interface GQLOrderNode {
  name: string;
  orderNumber: number;
  processedAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  lineItems: { edges: Array<{ node: { title: string; quantity: number } }> };
  successfulFulfillments: Array<{
    trackingCompany: string;
    trackingInfo: Array<{ number: string; url: string }>;
  }>;
  totalPriceV2: { amount: string; currencyCode: string };
}

function navRoot(): string {
  return window.Shopify?.routes?.root ?? '/';
}

function normalizeOrder(node: GQLOrderNode): Record<string, unknown> {
  const tracking = node.successfulFulfillments?.[0]?.trackingInfo?.[0];
  return {
    name: node.name,
    orderNumber: node.orderNumber,
    createdAt: node.processedAt,
    financialStatus: node.financialStatus,
    fulfillmentStatus: node.fulfillmentStatus,
    total: `${node.totalPriceV2.amount} ${node.totalPriceV2.currencyCode}`,
    lineItems: node.lineItems.edges.map(({ node: item }) => ({
      title: item.title,
      quantity: item.quantity,
    })),
    trackingUrl: tracking?.url ?? null,
    trackingNumber: tracking?.number ?? null,
    trackingCompany: node.successfulFulfillments?.[0]?.trackingCompany ?? null,
  };
}

export function registerOrderTools(domos: DomOSForTools, client: StorefrontClient | null): void {
  domos.registerTool('get_order_status', {
    description:
      "Récupère le statut des dernières commandes du client connecté. " +
      "Si le client n'est pas connecté ou que les tokens ne sont pas disponibles, " +
      "retourne un lien vers l'espace compte.",
    parameters: {
      type: 'object',
      properties: {
        orderNumber: {
          type: 'string',
          description: 'Numéro de commande spécifique à chercher (ex: "#4821"). Optionnel.',
        },
      },
    },
    risk: 'none',
    handler: async (args) => {
      const token = getCustomerAccessToken();

      // No token available — guide the user to their account page
      if (!token || !client) {
        return {
          found: false,
          loginRequired: true,
          message:
            "Pour consulter vos commandes, connectez-vous à votre espace client.",
          accountUrl: `${navRoot()}account/orders`,
        };
      }

      try {
        const data = await client.query<{
          customer: { orders: { edges: Array<{ node: GQLOrderNode }> } } | null;
        }>(GQL_GET_CUSTOMER_ORDERS, { customerAccessToken: token });

        if (!data.customer) {
          return {
            found: false,
            loginRequired: true,
            message: "Session expirée. Veuillez vous reconnecter.",
            accountUrl: `${navRoot()}account/login`,
          };
        }

        const orders = data.customer.orders.edges.map(({ node }) => normalizeOrder(node));

        if (orders.length === 0) {
          return { found: false, message: "Aucune commande trouvée sur ce compte." };
        }

        // Filter by order number if specified
        const orderNum = args.orderNumber as string | undefined;
        if (orderNum) {
          const needle = orderNum.replace('#', '').trim();
          const match = orders.find(
            (o) =>
              String(o.orderNumber) === needle ||
              (o.name as string).replace('#', '') === needle,
          );
          if (!match) {
            return {
              found: false,
              message: `Commande ${orderNum} introuvable parmi vos 5 dernières commandes.`,
              recentOrders: orders.map((o) => o.name),
            };
          }
          return { found: true, order: match };
        }

        // Return the most recent order by default
        return { found: true, order: orders[0], recentOrders: orders };
      } catch (e) {
        return { found: false, error: String(e) };
      }
    },
  });
}

