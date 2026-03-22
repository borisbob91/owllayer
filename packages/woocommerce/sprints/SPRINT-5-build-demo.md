# @domos/woocommerce — Sprint 5
## Tests E2E + CDN Build + Plugin WordPress complet + Demo WooCommerce

**Durée estimée :** 5-6 jours  
**Branche :** `feat/woo-sprint-5`  
**Dépendance :** Sprint 4 ✅

---

## Objectif

Le package JS et le plugin WordPress sont complets, testés et prêts pour une première publication. Une boutique WooCommerce de démonstration publique est opérationnelle.

---

## Tâches

### 5.1 — Tests

- [ ] Tests unitaires : StoreApiClient, WooContextBuilder, CartContextSync, CartTools, ProductTools, CheckoutTools, OrderTools
- [ ] Tests d'intégration : `DomOSWoo.init()` avec DOM + fetch mockés
- [ ] `pnpm test` passe dans `packages/woocommerce`

### 5.2 — Build CDN

- [ ] Finaliser `esbuild.config.mjs` :
  - `domos-woocommerce.bundle.mjs` (ESM, external: `@domos/browser`)
  - `domos-woocommerce.min.js` (IIFE autonome pour CDN)
- [ ] La build produit le fichier copié dans `plugin/assets/domos-woocommerce.min.js`

### 5.3 — Plugin WordPress complet (`plugin/`)

Finaliser le plugin PHP :

```
plugin/
├── domos-woocommerce.php         # Fichier principal
├── includes/
│   ├── class-context-builder.php # Construction complète du contexte par type de page
│   ├── class-admin-settings.php  # Page réglages WP Admin (DomOS > Réglages)
│   └── class-sw-registrar.php   # Enregistrement Service Worker (persistence navigation)
├── assets/
│   ├── domos-browser.min.js      # Copie de @domos/browser CDN
│   └── domos-woocommerce.min.js  # Build Sprint 5.2
└── readme.txt                    # Description wordpress.org
```

**class-admin-settings.php :**
- Page admin `DomOS > Réglages` avec champs :
  - API Key DomOS
  - Endpoint WebSocket
  - Nom de l'agent
  - Activer/désactiver les features (order tracking, etc.)
- Sauvegarde via `update_option('domos_woo_settings', ...)`

**class-sw-registrar.php :**
```php
// Enregistre le Service Worker pour persister la session DomOS entre les navigations
public function register_service_worker() {
    echo '<script>
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/domos-sw.js")
                .catch(function() {}); // Silencieux si échec
        }
    </script>';
}
```

**context-builder.php — pages à gérer :**

| Page WooCommerce | Données injectées |
|---|---|
| `is_product()` | product (id, name, price, stock, categories, variations, permalink) |
| `is_product_category()` | category (id, name, slug, count) |
| `is_cart()` | cart (items avec keys WooCommerce, total, currency) |
| `is_checkout()` | cart + customer (adresses pré-remplies si connecté) |
| `is_account_page()` | customer (commandes récentes, adresses) |
| Toutes | shop, customer.isLoggedIn, pageType, availableActions |

- [ ] Implémenter les 4 fichiers PHP
- [ ] Tester l'installation/activation depuis WordPress Admin
- [ ] Vérifier que le contexte PHP est correctement sérialisé en JSON

### 5.4 — Demo WooCommerce

- [ ] Installer WordPress + WooCommerce sur env local (Local by Flywheel)
- [ ] Configurer 10-15 produits de démonstration (avec variations taille/couleur)
- [ ] Activer le plugin DomOS WooCommerce
- [ ] Tester le scénario complet : chercher → ajouter → checkout
- [ ] Documenter les captures/vidéo de démo

### 5.5 — README

- [ ] `packages/woocommerce/README.md` avec :
  - Installation plugin WordPress
  - Configuration (API key, endpoint)
  - Liste des tools disponibles
  - Prérequis (WooCommerce 6.x+, WordPress 6.x+)

### 5.6 — Sprint futur : In-Chat Payments

> Reporter au Sprint 6+

- [ ] Ouvrir les tickets pour Stripe Elements in-chat et PayPal Smart Buttons in-chat
- [ ] Documenter les prérequis (Stripe publishable key, PayPal client ID)
- [ ] Architecture : `WooPaymentWidget` composant Preact dans Shadow DOM

---

## Critères de succès

- [ ] `pnpm build` + `pnpm test` passent
- [ ] Plugin WordPress installable et fonctionnel sans erreur PHP
- [ ] Demo WooCommerce complète (chercher → cart → checkout) documentée
- [ ] Widget DomOS visible et fonctionnel sur toutes les pages de la boutique de demo
