# @owllayer/woocommerce — Sprint 5
## Tests E2E + CDN Build + Plugin WordPress complet + Demo WooCommerce

**Durée estimée :** 5-6 jours  
**Branche :** `feat/woo-sprint-5`  
**Dépendance :** Sprint 4 ✅  
**Révisé le :** 2026-03-23 — état réel du codebase après Sprint 4

---

## Corrections apportées (révision Sprint 5)

| # | Élément | Avant | Après |
|---|---|---|---|
| 1 | Tests (§5.1) | "à faire" | **✅ Déjà complets** — 136 tests, 8 fichiers, tous passing |
| 2 | Build (§5.2) | "à finaliser" | **✅ Déjà opérationnel** — ESM 24.5 KB + IIFE 157 KB |
| 3 | Copy IIFE → plugin/assets | absent de la spec | **Nouveau §5.2a** — script esbuild doit copier en fin de build |
| 4 | Plugin PHP | dossier `plugin/` entièrement absent | **§5.3 à implémenter** dans l'ordre défini |
| 5 | README.md | absent | **§5.5 à créer** |
| 6 | Demo WooCommerce | tâche code | **§5.4 = tâche manuelle** (env WP live requis, hors scope implémentation) |

---

## Objectif

Le package JS et le plugin WordPress sont complets, testés et prêts pour une première publication. Une boutique WooCommerce de démonstration publique est opérationnelle.

---

## Tâches

### 5.1 — Tests ✅ FAIT

136/136 tests passing (Sprint 1-4) couvrant tous les modules :
- StoreApiClient, WooContextBuilder, CartContextSync, CartTools, ProductTools, CheckoutTools, OrderTools + OwlLayerWoo.integration

### 5.2 — Build CDN ✅ FAIT + copy step manquant

Build **déjà opérationnel** — `node esbuild.config.mjs` produit :
- `dist/owllayer-woocommerce.bundle.mjs` (ESM, 24.5 KB, external `@owllayer/browser`)
- `dist/owllayer-woocommerce.min.js` (IIFE, 157 KB, autonome)

#### §5.2a — Copy step (à ajouter dans esbuild.config.mjs)

Après la build IIFE, copier automatiquement vers `plugin/assets/` :
```js
import { copyFileSync, mkdirSync } from 'fs';
// fin du script :
mkdirSync('plugin/assets', { recursive: true });
copyFileSync('dist/owllayer-woocommerce.min.js', 'plugin/assets/owllayer-woocommerce.min.js');
```

- [ ] Ajouter le copy step dans `esbuild.config.mjs`

### 5.3 — Plugin WordPress complet (`plugin/`) ❌ À CRÉER

Finaliser le plugin PHP (**dossier `plugin/` inexistant — tout est à créer**) :

```
plugin/
├── owllayer-woocommerce.php         # Fichier principal (plugin header WP)
├── includes/
│   ├── class-context-builder.php # Construction du contexte JSON par type de page
│   ├── class-admin-settings.php  # Page réglages WP Admin (OwlLayer > Réglages)
│   └── class-sw-registrar.php   # Enregistrement Service Worker
├── assets/
│   ├── owllayer-browser.min.js      # Copie de @owllayer/browser CDN (placeholder)
│   └── owllayer-woocommerce.min.js  # Copié par esbuild §5.2a
└── readme.txt                    # Format wordpress.org
```

**Clés de données injectées en JSON** (lues par `WooContextBuilder.ts`) :
```json
{
  "pageType": "product|category|cart|checkout|account|home",
  "siteUrl": "https://shop.example.com",
  "shop": { "name": "...", "currency": "EUR" },
  "customer": { "isLoggedIn": true, "id": 1, "email": "...", "firstName": "..." },
  "product": { "id": 42, "name": "...", "price": "...", "stock": true, ... },
  "category": { "id": 5, "name": "...", "slug": "..." },
  "cart": { "items": [...], "total": "...", "currency": "EUR" }
}
```

**Nonce WooCommerce** — doit être injecté pour les requêtes Store API authentifiées :
```php
'nonce' => wp_create_nonce('wc_store_api')
```

**Option settings** → clé `owllayer_woo_settings`, champs : `api_key`, `endpoint`, `agent_name`, `agent_title`, features `order_tracking`, `in_chat_payments`.

**context-builder.php — pages à gérer :**

| Page WooCommerce | Données injectées |
|---|---|
| `is_product()` | product (id, name, price, stock, categories, variations, permalink) |
| `is_product_category()` | category (id, name, slug, count) |
| `is_cart()` | cart (items avec keys WooCommerce, total, currency) |
| `is_checkout()` | cart + customer (adresses pré-remplies si connecté) |
| `is_account_page()` | customer (commandes récentes, adresses) |
| Toutes | shop, customer.isLoggedIn, pageType, availableActions, siteUrl, nonce |

- [ ] Créer `plugin/owllayer-woocommerce.php`
- [ ] Créer `plugin/includes/class-context-builder.php`
- [ ] Créer `plugin/includes/class-admin-settings.php`
- [ ] Créer `plugin/includes/class-sw-registrar.php`
- [ ] Créer `plugin/readme.txt`

### 5.4 — Demo WooCommerce (tâche manuelle — hors scope implémentation code)

> Requiert un environnement WordPress + WooCommerce actif (Local by Flywheel ou Docker).

- [ ] Installer WordPress + WooCommerce sur env local
- [ ] Configurer 10-15 produits de démonstration (avec variations taille/couleur)
- [ ] Activer le plugin OwlLayer WooCommerce
- [ ] Tester le scénario complet : chercher → ajouter → checkout
- [ ] Documenter les captures/vidéo de démo

### 5.5 — README ❌ À CRÉER

- [ ] `packages/woocommerce/README.md` avec :
  - Installation plugin WordPress
  - Configuration (API key, endpoint, nonce)
  - Liste des tools disponibles (8 tools : CartTools×6, CheckoutTools×2, OrderTools×1, ProductTools×4)
  - Prérequis (WooCommerce 7.x+, WordPress 6.x+)
  - Build & test instructions

### 5.6 — Sprint futur : In-Chat Payments

> Reporter au Sprint 6+

- [ ] Ouvrir les tickets pour Stripe Elements in-chat et PayPal Smart Buttons in-chat
- [ ] Documenter les prérequis (Stripe publishable key, PayPal client ID)
- [ ] Architecture : `WooPaymentWidget` composant Preact dans Shadow DOM

---

## Critères de succès

- [x] `pnpm build` + `pnpm test` passent (déjà ✅)
- [ ] `pnpm build` copie automatiquement vers `plugin/assets/`
- [ ] Plugin WordPress installable (4 fichiers PHP + readme)
- [ ] JSON context correctement structuré (compatible `WooContextBuilder.ts`)
- [ ] Demo WooCommerce (§5.4 — tâche manuelle)
