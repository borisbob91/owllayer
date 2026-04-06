=== DomOS WooCommerce ===
Contributors: domos
Tags: ai, assistant, voice, chat, woocommerce, shopping
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 8.0
WC requires at least: 7.0
WC tested up to: 9.5
Stable tag: 0.1.0
License: Unlicensed

DomOS AI voice & chat assistant for WooCommerce stores.

== Description ==

DomOS WooCommerce adds an intelligent AI assistant to your WooCommerce store. The assistant understands your product catalog, can manage the customer's cart, and helps guide shoppers through checkout — all via natural voice or text conversation.

**Features:**

* Product search and discovery
* Cart management (add, update, remove items, apply coupons)
* Checkout assistance (pre-fill address forms, initiate checkout)
* Order tracking (connect + guest, via order key + email)
* Page-aware context injection (product, category, cart, checkout, account pages)
* Voice and text chat modes
* Shadow DOM isolated widget (no CSS conflicts)
* WooCommerce HPOS (High-Performance Order Storage) compatible

**Requirements:**

* WordPress 6.0+
* WooCommerce 7.0+
* PHP 8.0+
* DomOS Cloud API key (https://domos.dev)

== Installation ==

1. Upload the `domos-woocommerce` folder to `/wp-content/plugins/`.
2. Activate the plugin in **Plugins > Installed Plugins**.
3. Go to **Settings > DomOS** and enter your API key.
4. The DomOS widget will appear on all WooCommerce pages.

== Configuration ==

Navigate to **Settings > DomOS** to configure:

= API Key =
Your DomOS Cloud API key. Required. Get one at https://domos.dev.

= Endpoint WebSocket =
Leave empty to use the default DomOS Cloud endpoint (`wss://cloud.domos.dev/domos`).

= Widget =
* **Nom de l'agent** — Internal identifier for routing (optional).
* **Titre affiché** — Label shown in the widget header (default: "Assistant boutique").

= Fonctionnalités =
* **Suivi de commande** — Activates the `get_order_status` tool. Allows the agent to fetch order status for logged-in customers or guests (using order key + email).
* **Paiement in-chat** — Activates the PaymentWidget modal (Sprint 6 — coming soon).

== Available AI Tools ==

| Tool | Description |
|---|---|
| `add_to_cart` | Add a product or variation to the cart |
| `update_cart_item` | Update quantity of a cart item |
| `remove_cart_item` | Remove an item from the cart |
| `get_cart` | Return the current cart state |
| `apply_coupon` | Apply a coupon code (`POST /cart/coupons`) |
| `remove_coupon` | Remove a coupon (`DELETE /cart/coupons/{code}`) |
| `search_products` | Search products by keywords, category, price, sale status |
| `get_product` | Get full product details by ID or slug |
| `navigate_to_product` | Navigate to a product page |
| `navigate_to_category` | Navigate to a category page |
| `initiate_checkout` | Verify cart non-empty and redirect to `/checkout` |
| `fill_checkout_field` | Pre-fill an address field (Classic DOM or Blocks `PUT /checkout`) |
| `get_order_status` | Get order status by ID (requires `order_tracking` feature enabled) |

== Changelog ==

= 0.1.0 =
* Initial release.
* Cart tools (Sprint 2): add, update, remove, get, apply/remove coupon.
* Product tools (Sprint 3): search, get, navigate.
* Checkout tools (Sprint 4): initiate checkout, fill address fields.
* Order tools (Sprint 4): get order status (logged-in + guest auth).
* Plugin PHP (Sprint 5): context builder, admin settings, service worker.
