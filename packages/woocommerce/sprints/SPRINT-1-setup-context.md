# @domos/woocommerce — Sprint 1
## Setup + StoreApiClient + WooContextBuilder + Plugin PHP minimal

**Durée estimée :** 4-5 jours  
**Branche :** `feat/woo-sprint-1`  
**Dépendance :** `@domos/browser` ✅

---

## Objectif

Poser les fondations du package JS et du plugin WordPress. À la fin de ce sprint, `DomOSWoo.init()` fonctionne sur un site WordPress WooCommerce dev, le widget DomOS apparaît avec le contexte produit/shop correctement injecté via le bloc PHP.

---

## Tâches

### 1.1 — Build system

- [ ] Créer `esbuild.config.mjs` (inspiré de `packages/browser/esbuild.config.mjs`)
  - Output : `dist/domos-woocommerce.bundle.mjs` (ESM) + `dist/domos-woocommerce.min.js` (IIFE CDN)
  - External : `@domos/browser` pour le bundle ESM
- [ ] Vérifier `pnpm build` passe
- [ ] Ajouter `@domos/woocommerce` au workspace `pnpm-workspace.yaml`

### 1.2 — StoreApiClient (`src/api/StoreApiClient.ts`)

WooCommerce Store API v1 (`/wp-json/wc/store/v1`)

- [ ] `get<T>(path): Promise<T>` — GET avec nonce header
- [ ] `post<T>(path, body): Promise<T>` — POST avec nonce + Content-Type
- [ ] `del<T>(path, body?): Promise<T>` — DELETE avec nonce
- [ ] Header nonce : `Nonce: {nonce}` (fourni par `wp_localize_script`)
- [ ] Gestion erreurs : extraire `message` de la réponse WooCommerce error JSON
- [ ] Tests unitaires avec fetch mocké

**Endpoints disponibles Store API v1 :**
| Endpoint | Usage |
|---|---|
| `GET /cart` | État du panier |
| `POST /cart/add-item` | Ajouter au panier |
| `PUT /cart/items/{key}` | Modifier quantité |
| `DELETE /cart/items/{key}` | Supprimer article |
| `GET /products` | Recherche produits |
| `GET /products/{id}` | Détail produit |
| `POST /checkout` | Créer commande |
| `GET /cart/coupons` / `POST /cart/coupons` | Codes promo |

### 1.3 — WooContextBuilder (`src/context/WooContextBuilder.ts`)

**Source :** bloc JSON injecté par le plugin PHP dans le footer :
```html
<script id="domos-woo-context" type="application/json">
  {
    "pageType": "product",
    "product": { "id": 42, "name": "T-Shirt Rouge", "price": "29.99", "currency": "EUR", ... },
    "category": null,
    "shop": { "name": "Ma Boutique", "currency": "EUR", "locale": "fr_FR" },
    "customer": { "isLoggedIn": true, "id": 5, "email": "jean@example.com" }
  }
</script>
```

- [ ] Lire et parser `<script id="domos-woo-context">`
- [ ] Fallback : détecter le type de page via les classes body WooCommerce (`single-product`, `woocommerce-cart`, etc.)
- [ ] Construire le contexte DomOS avec `userLocation` + `availableActions` dynamiques selon la page
- [ ] Tests unitaires avec DOM mocké

### 1.4 — Plugin PHP minimal (`plugin/`)

Créer `plugin/domos-woocommerce.php` — plugin WordPress minimal pour les tests :

```php
<?php
/**
 * Plugin Name: DomOS for WooCommerce
 * Description: Conversational AI assistant for WooCommerce stores powered by DomOS.
 * Version: 0.1.0
 * Author: Futur4Tech
 * Requires Plugins: woocommerce
 */

if (!defined('ABSPATH')) exit;

class DomOS_WooCommerce {
    public function __construct() {
        add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts']);
        add_action('wp_footer', [$this, 'inject_context']);
    }

    public function enqueue_scripts() {
        $options = get_option('domos_woo_settings', []);
        if (empty($options['api_key'])) return;

        wp_enqueue_script('domos-browser',
            'https://cdn.domos.dev/browser@latest/domos.min.js', [], null, true);
        wp_enqueue_script('domos-woocommerce',
            plugins_url('assets/domos-woocommerce.min.js', __FILE__),
            ['domos-browser'], '0.1.0', true);

        wp_localize_script('domos-woocommerce', 'domos_config', [
            'api_key'  => esc_js($options['api_key']),
            'endpoint' => esc_js($options['endpoint'] ?? 'wss://cloud.domos.dev/domos'),
            'nonce'    => wc_create_nonce('wc_store_api'),
            'agent_name' => esc_js($options['agent_name'] ?? 'Alex'),
        ]);
    }

    public function inject_context() {
        // Build context based on current page
        $context = ['shop' => ['name' => get_bloginfo('name'), 'currency' => get_woocommerce_currency()]];
        // ... product/cart/category context
        echo '<script id="domos-woo-context" type="application/json">';
        echo wp_json_encode($context);
        echo '</script>';
        echo '<script>document.addEventListener("DOMContentLoaded", function() {
            DomOSWoo.init(window.domos_config);
        });</script>';
    }
}

new DomOS_WooCommerce();
```

- [ ] Créer le plugin PHP minimal
- [ ] Page de réglages WordPress (`DomOS > Réglages`) : API key, endpoint, nom de l'agent
- [ ] Injection correcte du nonce WooCommerce (`wc_create_nonce('wc_store_api')`)
- [ ] Tester sur WordPress local (Local by Flywheel ou DevKinsta)

### 1.5 — DomOSWoo.init() minimal

- [ ] Appel `DomOS.init()` avec config de base
- [ ] `WooContextBuilder.build()` → `DomOS.updateContext()`
- [ ] Widget visible sur boutique WooCommerce dev

---

## Critères de succès

- [ ] `pnpm build` passe dans `packages/woocommerce`
- [ ] Widget DomOS apparaît sur une page produit WooCommerce
- [ ] Contexte produit correctement injecté (vérifiable via `debug: true`)
- [ ] Tests StoreApiClient + WooContextBuilder passent
- [ ] Plugin PHP activable sans erreur PHP
