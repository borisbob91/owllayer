# @domos/woocommerce

DomOS AI assistant integration for WooCommerce stores — native TypeScript SDK built on `@domos/browser`.

## Overview

This package provides a set of AI tools that allow a DomOS voice/chat agent to interact with a WooCommerce store directly in the browser:

- **CartTools** — add, update, remove items; apply/remove coupons
- **ProductTools** — search, get details, navigate to products/categories
- **CheckoutTools** — initiate checkout, pre-fill address fields (Classic + Blocks)
- **OrderTools** — get order status (logged-in customers + guests via key+email)

---

## Requirements

- WooCommerce 7.0+ (Store API v1)
- WordPress 6.0+
- PHP 8.0+
- DomOS Cloud API key — [https://domos.dev](https://domos.dev)

---

## Installation (WordPress plugin)

1. Run `pnpm build` to produce `dist/domos-woocommerce.min.js` (automatically copied to `plugin/assets/`).
2. Copy or symlink `plugin/` to `/wp-content/plugins/domos-woocommerce/`.
3. Activate in **Plugins > Installed Plugins**.
4. Navigate to **Settings > DomOS** and enter your API key.

The plugin auto-injects the DomOS widget and the WooCommerce context JSON block on every page.

---

## Configuration

Settings are stored under the `domos_woo_settings` WordPress option.

| Field | Description | Default |
|---|---|---|
| `api_key` | DomOS Cloud API key (required) | — |
| `endpoint` | WebSocket endpoint | `wss://cloud.domos.dev/domos` |
| `agent_name` | Internal agent identifier | — |
| `agent_title` | Label shown in widget header | — |
| `order_tracking` | Enable `get_order_status` tool | `false` |
| `in_chat_payments` | Enable PaymentWidget (Sprint 6) | `false` |

---

## Manual usage (without plugin)

```html
<script id="domos-woo-context" type="application/json">
{
  "pageType": "product",
  "siteUrl": "https://shop.example.com",
  "shop": { "name": "My Store", "currency": "EUR" },
  "customer": { "isLoggedIn": false },
  "product": { "id": 42, "name": "T-Shirt", "price": "29.99" }
}
</script>

<script src="/path/to/domos-woocommerce.min.js"></script>
<script>
  DomOSWoo.init({
    apiKey: 'pk_live_...',
    nonce: '<?php echo wp_create_nonce("wc_store_api"); ?>',
    features: { orderTracking: true },
  });
</script>
```

---

## Available tools

| Tool | Risk | API endpoint |
|---|---|---|
| `add_to_cart` | low | `POST /cart/add-item` |
| `update_cart_item` | low | `PUT /cart/items/{key}` |
| `remove_cart_item` | low | `DELETE /cart/items/{key}` |
| `get_cart` | none | `GET /cart` |
| `apply_coupon` | none | `POST /cart/coupons` |
| `remove_coupon` | none | `DELETE /cart/coupons/{code}` |
| `search_products` | none | `GET /products?search=...` |
| `get_product` | none | `GET /products/{id}` |
| `navigate_to_product` | none | `window.location.href` |
| `navigate_to_category` | none | `window.location.href` |
| `initiate_checkout` | high (HITL) | `GET /cart` → redirect `/checkout` |
| `fill_checkout_field` | medium | DOM (Classic) / `PUT /checkout` (Blocks) |
| `get_order_status` | none | `GET /order/{id}` |

> **Note on `fill_checkout_field` in Blocks mode:** WooCommerce Blocks checkout requires `PUT /checkout` with a complete address object. Individual fields cannot be updated in isolation via Store API.

> **Note on `get_order_status` guest auth:** Both `key` (order key) **and** `billing_email` are required for guest access. Either alone returns 401.

---

## Build

```bash
pnpm build      # ESM + IIFE, copies IIFE to plugin/assets/
pnpm test       # 136 tests (vitest)
pnpm lint       # TypeScript type-check
```

**Build outputs:**

| File | Format | Size | Usage |
|---|---|---|---|
| `dist/domos-woocommerce.bundle.mjs` | ESM | ~24 KB | npm/bundler consumers |
| `dist/domos-woocommerce.min.js` | IIFE | ~157 KB | WordPress `wp_enqueue_script` |
| `plugin/assets/domos-woocommerce.min.js` | IIFE | ~157 KB | auto-copied by build |

---

## Architecture

```
src/
├── DomOSWoo.ts              # Entry point — init() wires all modules
├── index.ts                 # Public exports
├── types.ts                 # DomOSWooConfig, WooCart, WooProduct, ...
├── api/
│   └── StoreApiClient.ts    # Fetch wrapper for WC Store API v1
├── context/
│   ├── WooContextBuilder.ts # Reads #domos-woo-context JSON block
│   └── CartContextSync.ts   # Polls GET /cart + emits context updates
└── tools/
    ├── CartTools.ts
    ├── ProductTools.ts
    ├── CheckoutTools.ts
    └── OrderTools.ts
plugin/
├── domos-woocommerce.php    # WP plugin main file
├── includes/
│   ├── class-context-builder.php  # PHP context injection
│   ├── class-admin-settings.php   # WP Admin settings page
│   └── class-sw-registrar.php     # Service Worker registration
└── assets/
    └── domos-woocommerce.min.js   # Built by esbuild (auto-copied)
```
