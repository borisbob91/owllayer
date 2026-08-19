---
mode: agent
description: Implement @owllayer/woocommerce — native WooCommerce integration built on @owllayer/browser
tools:
  - read_file
  - replace_string_in_file
  - multi_replace_string_in_file
  - create_file
  - run_in_terminal
  - grep_search
  - file_search
  - get_errors
---

# @owllayer/woocommerce — Agent Implementation Prompt

Tu es un expert TypeScript + WordPress/WooCommerce travaillant sur le package `@owllayer/woocommerce`.
Ce package étend `@owllayer/browser` pour intégrer OwlLayer nativement dans les boutiques WooCommerce.

## Architecture du repo

```
owllayer/
├── packages/
│   ├── core/           ← types AITP, protocole (ne pas modifier)
│   ├── browser/        ← SDK OSS de base (ne pas modifier, utiliser son API publique)
│   └── woocommerce/    ← ← ← TU TRAVAILLES ICI
│       ├── src/
│       │   ├── index.ts
│       │   ├── types.ts
│       │   ├── OwlLayerWoo.ts              ← orchestrateur principal
│       │   ├── context/
│       │   │   ├── WooContextBuilder.ts
│       │   │   └── CartContextSync.ts
│       │   ├── api/
│       │   │   └── StoreApiClient.ts    ← wrapper Store API REST v1
│       │   └── tools/
│       │       ├── CartTools.ts
│       │       ├── ProductTools.ts
│       │       ├── CheckoutTools.ts
│       │       └── OrderTools.
        ui /
│       └── sprints/
│           ├── SPRINT-1-setup-context.md
│           ├── SPRINT-2-cart-tools.md
│           ├── SPRINT-3-product-tools.md
│           ├── SPRINT-4-checkout-orders.md
│           └── SPRINT-5-build-demo.md
```

## API publique `@owllayer/browser` à utiliser

```ts
import { OwlLayer } from '@owllayer/browser';

await OwlLayer.init(config: OwlLayerBrowserConfig): Promise<void>
OwlLayer.registerTool(name: string, definition: BrowserToolDefinition): void
OwlLayer.updateContext(data: Record<string, unknown>): void
```

### Type `BrowserToolDefinition`

```ts
interface BrowserToolDefinition {
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
  risk: 'none' | 'low' | 'medium' | 'high' | 'critical';
  handler(args: Record<string, unknown>): unknown | Promise<unknown>;
}
```

## APIs WooCommerce à utiliser

### WooCommerce Store API v1 (REST — nonce requis pour mutations)

Base URL : `/wp-json/wc/store/v1`

```
GET    /cart                           → état du panier
POST   /cart/add-item    { id, qty }   → ajouter au panier
PUT    /cart/items/{key} { quantity }  → modifier quantité
DELETE /cart/items/{key}               → supprimer article
POST   /cart/coupons     { code }      → appliquer coupon
GET    /products         ?search=...  → rechercher produits
GET    /products/{id}                  → détail produit
POST   /checkout                       → créer commande
```

**Auth :** header `Nonce: {nonce}` — le nonce est passé par `wp_localize_script` depuis PHP.
**Les prix sont en centimes/minor units** → diviser par 100.

### Contexte injecté par le plugin PHP

Le plugin WordPress injecte un bloc JSON dans le footer avant de charger le bundle JS :
```html
<script id="owllayer-woo-context" type="application/json">
  { "pageType": "product", "product": {...}, "shop": {...}, "customer": {...} }
</script>
```
`WooContextBuilder` lit ce bloc — ne pas refaire un fetch à la place.

## Conventions de code

- TypeScript strict — pas de `any`
- `StoreApiClient` est la seule couche qui accède au réseau REST
- Après chaque mutation panier → re-sync contexte avec `OwlLayer.updateContext()`
- Les handlers retournent toujours `{ success: boolean, ... }` ou `{ success: false, error: string }`
- La `key` WooCommerce (ex: `abc123def`) est l'identifiant d'un article panier — toujours la passer pour PUT/DELETE
- Imports ESM avec extension `.js`

## Pages WooCommerce — classes body à détecter

| Classe body | Type de page |
|---|---|
| `single-product` | Fiche produit |
| `tax-product_cat` | Catégorie produit |
| `woocommerce-cart` | Panier |
| `woocommerce-checkout` | Checkout |
| `woocommerce-account` | Compte client |
| `woocommerce` (générique) | Boutique / archive |

## Format du contexte OwlLayer attendu

```ts
OwlLayer.updateContext({
  platform: 'woocommerce',
  currentPage: 'product',
  userLocation: "L'utilisateur consulte le produit : T-Shirt Rouge",
  availableActions: [
    'Ajouter au panier → add_to_cart(productId, qty)',
    'Voir les variations → get_product(id)',
    'Appliquer un coupon → apply_coupon(code)',
  ],
  product: { id, name, price, inStock, categories, variations: [...] },
  cart: { isEmpty, itemCount, total, productIds: [], items: [{ key, id, title, qty, ... }] },
  shop: { name, currency },
  customer: { isLoggedIn, id?, email? },
});
```

> ⚠️ Le `key` de chaque item panier est **critique** — c'est lui qu'on passe à `PUT /cart/items/{key}` et `DELETE /cart/items/{key}`.

## Workflow par sprint

Lire le fichier sprint avant de coder :
- `sprints/SPRINT-1-setup-context.md` → StoreApiClient + WooContextBuilder + plugin PHP minimal
- `sprints/SPRINT-2-cart-tools.md` → CartContextSync + 4 cart tools
- `sprints/SPRINT-3-product-tools.md` → ProductTools + enrichissement plugin PHP
- `sprints/SPRINT-4-checkout-orders.md` → CheckoutTools + OrderTools + fill_checkout_field
- `sprints/SPRINT-5-build-demo.md` → build + plugin PHP complet + tests + demo

## Plugin WordPress (`plugin/`)

Sera créé au Sprint 1. Structure cible :
```
plugin/
├── owllayer-woocommerce.php           ← fichier principal
├── includes/
│   ├── class-context-builder.php  ← contexte PHP par type de page
│   ├── class-admin-settings.php   ← page réglages WP Admin
│   └── class-sw-registrar.php    ← Service Worker pour navigation persistence
└── assets/
    └── owllayer-woocommerce.min.js   ← copié depuis dist/ au build
```

**Hooks PHP à utiliser :**
- `wp_enqueue_scripts` → charger les scripts
- `wp_footer` → injecter le bloc JSON contexte + `OwlLayerWoo.init()`
- `init` → hooks WooCommerce (cart updated, etc.)
- `admin_menu` → page de réglages

**Génération du nonce :** `wc_create_nonce('wc_store_api')` — ne jamais hardcoder.

## Tests

- `vitest` dans `packages/woocommerce`
- Mocker `fetch` avec `vi.stubGlobal('fetch', ...)`
- Pour le plugin PHP : tests manuels sur WordPress local (Local by Flywheel ou DevKinsta)
- `pnpm test` dans `packages/woocommerce`

## Ce qui est DÉJÀ en place (stubs)

Tous les fichiers `src/` existent avec leurs signatures et `// TODO Sprint N`. Ne pas recréer — compléter les TODOs.

## Ce qui est INTERDIT

- Modifier `packages/browser/` ou `packages/core/`
- Appeler `registerTool` avant `OwlLayer.init()`
- Utiliser `any`
- Utiliser l'API WooCommerce Admin REST (`/wp-json/wc/v3/`) côté frontend — uniquement la Store API v1
- Stocker le nonce dans le localStorage ou un attribut DOM visible
