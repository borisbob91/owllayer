# @domos/shopify

Native Shopify integration for **DomOS** — embed a voice/text AI agent directly in any Shopify theme, with full cart sync, product search, checkout and order tracking.

> For the full setup guide see [setup.md](./setup.md).

---

## Installation

### CDN (recommended for themes)

Upload `domos-shopify.min.js` to your theme assets, then add to `theme.liquid` just before `</body>`:

```html
<script src="{{ 'domos-shopify.min.js' | asset_url }}" defer></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    DomOSShopify.init({
      apiKey: '{{ shop.metafields.domos.api_key }}',
      storefrontToken: '{{ shop.metafields.domos.storefront_token }}',
      shopDomain: '{{ shop.permanent_domain }}',
    });
  });
</script>
```

### App Embed Block (Shopify 2.0 — no code)

Copy `embed/blocks/domos-widget.liquid` to your theme's `blocks/` folder. Configure via **Theme Editor > DomOS Chat Widget**.

### NPM

```bash
pnpm add @domos/shopify
```

```ts
import { DomOSShopify } from '@domos/shopify';

await DomOSShopify.init({ apiKey: 'dk_live_xxxx' });
```

---

## Prerequisites

| Requirement | Where to get it |
|------------|-----------------|
| DomOS API Key | [cloud.domos.dev](https://cloud.domos.dev) > Settings > API |
| Shopify Storefront Access Token | Shopify Admin > Apps > Develop apps > Storefront API |
| Shopify store domain | `my-store.myshopify.com` |

Only `apiKey` is strictly required. `storefrontToken` + `shopDomain` unlock product search and order tracking.

---

## Configuration

```ts
DomOSShopify.init({
  // Required
  apiKey: 'dk_live_xxxx',

  // Storefront API — enables search_products, get_product, get_order_status
  storefrontToken: 'shpat_xxxx',
  shopDomain: 'my-store.myshopify.com',

  // API version — '2026-01' (default) | '2024-01' (legacy fallback)
  storefrontApiVersion: '2026-01',

  // WebSocket endpoint (default: wss://cloud.domos.dev/domos)
  endpoint: 'wss://cloud.domos.dev/domos',

  features: {
    orderTracking: true,           // enables get_order_status
    productRecommendations: true,
  },

  widget: {
    agentName: 'Léa',
    agentTitle: 'Assistante boutique',
    mode: 'text',                  // 'text' | 'voice'
  },
});
```

---

## Available Tools

### Cart (Sprint 2)

| Tool | Description | Risk |
|------|-------------|------|
| `add_to_cart` | Add an item to the cart | `low` |
| `update_cart` | Update item quantity | `low` |
| `remove_from_cart` | Remove an item from the cart | `low` |
| `get_cart` | Return current cart state | `none` |

### Products (Sprint 3)

| Tool | Description | Risk |
|------|-------------|------|
| `search_products` | Search with filters (type, tag, price range) | `none` |
| `get_product` | Full product details + variants | `none` |
| `select_variant` | Select a variant on the current product page | `none` |
| `navigate_to_product` | Navigate to a product page | `none` |
| `navigate_to_collection` | Navigate to a collection page | `none` |

> `search_products` and `get_product` require `storefrontToken` + `shopDomain`.

### Checkout & Orders (Sprint 4)

| Tool | Description | Risk |
|------|-------------|------|
| `initiate_checkout` | Redirect to `/checkout` (requires HITL confirmation) | `high` |
| `apply_discount` | Apply a promo code and redirect to checkout | `none` |
| `get_order_status` | Fetch recent orders for the logged-in customer | `none` |

> `initiate_checkout` with `risk: 'high'` automatically shows a confirmation modal before executing.

---

## Order Tracking Setup

For `get_order_status` to return real order data, inject the customer access token in `theme.liquid`:

```liquid
{% if customer %}
  <script>window.__domos_customer_token = {{ customer.access_token | json }};</script>
{% endif %}
```

Without this, the tool returns a link to `/account/orders` instead.

---

## Locale Support

All navigation and AJAX URLs are automatically prefixed with `window.Shopify.routes.root` for locale-aware stores (e.g. `/fr/`, `/de/`, `/en-us/`). No configuration needed.

---

## Compatibility

### `select_variant` — Theme DOM patterns

| Pattern | Themes |
|---------|--------|
| `select[name="id"]` | Debut, legacy themes |
| Per-option selects / radio buttons | Dawn, Prestige, Impulse |
| `CustomEvent('variant:selected')` | Hydrogen, headless |

For headless themes, listen for the event:

```js
document.addEventListener('variant:selected', (e) => {
  const { variantId, options } = e.detail;
});
```

---

## Build

```bash
pnpm build   # ESM bundle + IIFE CDN bundle
pnpm test    # vitest (111 tests)
```

Output:
- `dist/domos-shopify.bundle.mjs` — ESM, `@domos/browser` external
- `dist/domos-shopify.min.js` — IIFE, self-contained for CDN

---

## Package Structure

```
src/
  DomOSShopify.ts          # Main entry point
  types.ts                 # Shared TypeScript types
  context/
    ShopifyContextBuilder.ts
    CartContextSync.ts     # Real-time cart sync (4 layers)
    CustomerContext.ts     # Customer login state
  storefront/
    StorefrontClient.ts    # Storefront GraphQL client
  tools/
    CartTools.ts
    ProductTools.ts
    NavigationTools.ts
    CheckoutTools.ts
    OrderTools.ts
embed/
  snippet-dev.liquid       # Dev snippet for theme.liquid
  blocks/
    domos-widget.liquid    # App Embed Block (Shopify 2.0)
```

---

## License

MIT © DomOS
