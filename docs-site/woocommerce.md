# WooCommerce Integration

The `@domos/woocommerce` package integrates the Agentic UI SDK with WordPress-powered WooCommerce stores. It relies on the WooCommerce Store API v1.

---

## 1. Installation

### As a WordPress Plugin
1. Build the JavaScript package assets:
   ```bash
   pnpm --filter @domos/woocommerce build
   ```
   This compiles the asset files and copies them into the `plugin/assets/` directory.
2. Copy or symlink the `plugin/` directory to your WordPress plugins directory:
   ```bash
   cp -r packages/woocommerce/plugin /var/www/html/wp-content/plugins/domos-woocommerce
   ```
3. Log in to your **WordPress Admin Dashboard > Plugins > Installed Plugins** and click **Activate** under **DomOS WooCommerce Integration**.
4. Go to **Settings > DomOS** to configure your API Credentials.

---

## 2. Configuration Settings

The plugin provides a setting configuration page saving fields inside the `domos_woo_settings` option:

| Setting Field | Key | Default | Purpose |
|---|---|---|---|
| API Key | `api_key` | — | Required OwlLayer AI cloud credential key. |
| Endpoint | `endpoint` | `wss://cloud.domos.dev/domos` | WebSocket server path. |
| Agent Name | `agent_name` | — | ID used to initialize agent configuration. |
| Agent Title | `agent_title` | — | Text visible in widget header. |
| Order Tracking | `order_tracking` | `false` | Enables `get_order_status` tools. |
| In-Chat Payments | `in_chat_payments` | `false` | Enables checking out directly inside chat frames. |

---

## 3. Manual Integration (Without WordPress Plugin)

If you are running a custom headless setup or want to load the script manually:

1. Render the database configuration state inside a JSON script block in your theme templates:
   ```html
   <script id="domos-woo-context" type="application/json">
   {
     "pageType": "product",
     "siteUrl": "https://shop.example.com",
     "shop": { "name": "My Shop", "currency": "USD" },
     "customer": { "isLoggedIn": false },
     "product": { "id": 105, "name": "Design Mug", "price": "14.99" }
   }
   </script>
   ```
2. Import the script and call initialization:
   ```html
   <script src="/path/to/domos-woocommerce.min.js"></script>
   <script>
     DomOSWoo.init({
       apiKey: 'pk_live_xxxx',
       nonce: '<?php echo wp_create_nonce("wc_store_api"); ?>',
       features: { orderTracking: true }
     });
   </script>
   ```

---

## 4. Pre-configured Tools Reference

The WooCommerce SDK registers these tools to interact with the WordPress database via Store APIs:

| Tool Name | Risk Level | API Endpoint / Mode | Note |
|---|---|---|---|
| `add_to_cart` | `low` | `POST /cart/add-item` | Adds items using WooCommerce Store API session. |
| `update_cart_item` | `low` | `PUT /cart/items/{key}` | Updates product item volume. |
| `remove_cart_item` | `low` | `DELETE /cart/items/{key}` | Removes product item. |
| `get_cart` | `none` | `GET /cart` | Returns details, totals, and active discounts. |
| `apply_coupon` | `none` | `POST /cart/coupons` | Submits coupon codes. |
| `remove_coupon` | `none` | `DELETE /cart/coupons/{code}` | Removes codes. |
| `search_products` | `none` | `GET /products` | Performs category or text matching catalog queries. |
| `get_product` | `none` | `GET /products/{id}` | Fetches product properties. |
| `initiate_checkout` | `high` | Redirect to `/checkout` | Requires user approval before redirecting. |
| `fill_checkout_field`| `medium`| DOM / `PUT /checkout` | **Blocks vs Classic info** below. |
| `get_order_status` | `none` | `GET /order/{id}` | **Guest checkout credentials info** below. |

---

## 5. Technical Integration Notes

### Form Filling (`fill_checkout_field`)
- **Classic Checkout**: The SDK targets standard input field selectors directly using DOM events (`change`).
- **Checkout Blocks (Gutenberg)**: Individual fields cannot be updated in isolation. The SDK makes a `PUT /checkout` call containing the full structured address payload representation.

### Order Authentication for Guest Users
> [!IMPORTANT]
> To look up guest orders with `get_order_status`, both the **order key** (`?key=wc_order_xxx`) and the **billing email** must match the target order record. Providing only the Order ID without matching emails will return a `401 Unauthorized` response.

---

## 6. Troubleshooting

### Storefront Widget Not Rendering
If the WooCommerce Admin configuration page loads correctly but the OwlLayer AI chat widget is completely missing on the storefront visitor pages, check the template rendering hooks:

- **Root Cause**: The plugin's script enqueue (`wp_enqueue_script`) and initialization (`DomOSWoo.init`) were historically triggered within a `wp_footer` action (priority 20). If your active theme completes scripts compilation printing before priority 20 or inside custom rendering loops, the scripts fail to print in the final HTML response.
- **Resolution**: Separate the storefront context payload block from the script registrations. Ensure scripts are registered earlier using the standard `wp_enqueue_scripts` hook, leaving only the JSON `#domos-woo-context` data block inside `wp_footer`.

### Missing `window.DomOSWoo` Global in Headless Setups
When loading the static bundle `domos-woocommerce.min.js` directly within a custom headless site or standard HTML page, you might encounter a `ReferenceError: DomOSWoo is not defined` or `window.DomOSWoo: missing` error:

- **Root Cause**: An incompatibility in esbuild configurations where the IIFE build used custom `banner` and `footer` wrappers (`var _exports = ...`), which failed to bind correctly in standard script tags, resulting in `window.DomOSWoo` being set to `undefined`.
- **Resolution**: Use the updated bundle build where the esbuild wrapper has been corrected to bind `DomOSWoo` directly onto the global context object (`window` or `self`). Always verify that your build compilation finishes with exit code 0 when running:
  ```bash
  pnpm --filter @domos/woocommerce build
  ```

