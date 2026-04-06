// Sprint 4 — Customer context reader
// Reads customer state from window.__st (injected by Shopify on storefronts).
// Scope is intentionally narrow: only isLoggedIn + numeric ID are reliably available
// without explicit Liquid token injection.

import type { ShopifyCustomerContext } from '../types.js';

declare const window: Window & {
  __st?: { cid?: number | string };
  __domos_customer_token?: string;
};

/**
 * Reads the current customer state from Shopify's global `window.__st`.
 * Returns `{ isLoggedIn: false }` if the visitor is a guest or __st is unavailable.
 */
export function readCustomerContext(): ShopifyCustomerContext {
  const cid = window.__st?.cid;
  if (cid == null || cid === 0 || cid === '') {
    return { isLoggedIn: false };
  }
  return { isLoggedIn: true, id: String(cid) };
}

/**
 * Returns the customer access token injected by the merchant via Liquid, if present.
 * To enable: add to theme.liquid —
 *   {% if customer %}
 *     <script>window.__domos_customer_token = {{ customer.access_token | json }};</script>
 *   {% endif %}
 */
export function getCustomerAccessToken(): string | undefined {
  return window.__domos_customer_token ?? undefined;
}
