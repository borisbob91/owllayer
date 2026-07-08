# Shopify Integration

The `@domos/shopify` package integrates DomOS directly with Shopify themes. It features native cart synchronization, product catalogs querying via the Storefront API, and checkout redirection.

---

## 1. Installation

### CDN Script Injection (Theme assets)
1. Upload the bundled `domos-shopify.min.js` file into your theme's `assets/` directory.
2. Edit your layout file `layout/theme.liquid` and paste the script setup right before the closing `</body>` tag:

```html
<script src="{{ 'domos-shopify.min.js' | asset_url }}" defer></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    DomOSShopify.init({
      apiKey: '{{ shop.metafields.domos.api_key }}',
      storefrontToken: '{{ shop.metafields.domos.storefront_token }}',
      shopDomain: '{{ shop.permanent_domain }}',
      widget: {
        agentName: 'Léa',
        agentTitle: 'Shop Assistant'
      }
    });
  });
</script>
```

### App Embed Block (Theme Editor — Shopify 2.0)
If you prefer not editing theme liquid files directly:
1. Save `embed/blocks/domos-widget.liquid` into your theme's `blocks/` directory.
2. Open your **Shopify Theme Customizer > App Embeds** and enable **DomOS Chat Widget**.
3. Fill in your API Credentials directly within the sidebar inputs.

---

## 2. Configuration Settings

Initialize settings with storefront access tokens to unlock database catalog searches:

```ts
import { DomOSShopify } from '@domos/shopify';

DomOSShopify.init({
  apiKey: 'dk_live_xxxx',
  
  // Credentials required for search_products, get_product
  storefrontToken: 'shpat_xxxxxx',
  shopDomain: 'mystore.myshopify.com',
  storefrontApiVersion: '2026-01',
  
  features: {
    orderTracking: true,
    productRecommendations: true
  }
});
```

---

## 3. Pre-configured Shop Tools

Once initialized, the Shopify SDK automatically registers three groups of tools:

### Shopping Cart Tools
- `add_to_cart` (`risk: 'low'`): Adds variants to the active cart using Ajax APIs.
- `update_cart` (`risk: 'low'`): Updates variant quantities.
- `remove_from_cart` (`risk: 'low'`): Removes an item.
- `get_cart` (`risk: 'none'`): Queries the active cart items and calculations.

### Catalog Exploration Tools
- `search_products` (`risk: 'none'`): Queries variants by collection, price range, type, or tags.
- `get_product` (`risk: 'none'`): Returns details, images, description, and available variant options.
- `select_variant` (`risk: 'none'`): Selects or focuses variants in the DOM on active detail pages.
- `navigate_to_product` (`risk: 'none'`): Redirects viewport.

### Checkout & Accounts
- `initiate_checkout` (`risk: 'high'`): Shows a HITL security confirmation, then redirects the customer to `/checkout`.
- `apply_discount` (`risk: 'none'`): Appends a coupon query string before checkout redirection.
- `get_order_status` (`risk: 'none'`): Returns recent customer purchase status.

---

## 4. Enabling Customer Order Tracking

To allow the `get_order_status` tool to fetch real order logs, inject the customer access token inside `theme.liquid`:

```liquid
{% if customer %}
  <script>
    window.__domos_customer_token = {{ customer.access_token | json }};
  </script>
{% endif %}
```

---

## 5. Variant Selection Theme Compatibility

Theme DOM architectures vary across Shopify. The `select_variant` tool matches multiple layouts:

| Layout Pattern | Targeted Themes | Description |
|---|---|---|
| Select Dropdowns | Debut, older liquid templates | Finds `select[name="id"]` element and updates value. |
| Radio Option buttons | Dawn, Prestige, Impulse | Scans option labels matching variants and dispatches click events. |
| Custom Dispatch | Hydrogen, headless storefronts | Dispatches custom Javascript event: `variant:selected`. |

For headless templates, hook into the event dispatcher to update selection states:
```js
document.addEventListener('variant:selected', (e) => {
  const { variantId, options } = e.detail;
  // Update state
});
```
