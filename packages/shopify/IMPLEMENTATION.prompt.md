---
mode: agent
description: Implement @owllayer/shopify — native Shopify integration built on @owllayer/browser
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

# @owllayer/shopify — Agent Implementation Prompt

Tu es un expert TypeScript e-commerce travaillant sur le package `@owllayer/shopify`.
Ce package étend `@owllayer/browser` pour intégrer OwlLayer nativement dans les boutiques Shopify.

## Architecture du repo

```
owllayer/
├── packages/
│   ├── core/        ← types AITP, OwlLayerClient, protocole (ne pas modifier)
│   ├── browser/     ← SDK OSS de base (ne pas modifier, utiliser son API publique)
│   └── shopify/     ← ← ← TU TRAVAILLES ICI
│       ├── src/
│       │   ├── index.ts
│       │   ├── types.ts
│       │   ├── OwlLayerShopify.ts          ← orchestrateur principal
│       │   ├── context/
│       │   │   ├── ShopifyContextBuilder.ts
│       │   │   └── CartContextSync.ts
│       │   ├── tools/
│       │   │   ├── CartTools.ts
│       │   │   ├── ProductTools.ts
│       │   │   ├── CheckoutTools.ts
│       │   │   ├── OrderTools.ts
│       │   │   └── NavigationTools.ts
│       │   └── storefront/
│       │       └── StorefrontClient.ts
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

// Init (une seule fois par page)
await OwlLayer.init(config: OwlLayerBrowserConfig): Promise<void>

// Enregistrer un tool (l'agent peut l'appeler)
OwlLayer.registerTool(name: string, definition: BrowserToolDefinition): void

// Mettre à jour le contexte de l'agent
OwlLayer.updateContext(data: Record<string, unknown>): void
```

### Type `BrowserToolDefinition` (à respecter strictement)

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

### Règles `registerTool`

- Doit être appelé **APRÈS** `OwlLayer.init()` — jamais avant
- `risk: 'high'` → HITL modal automatique (ex: `initiate_checkout`)
- `risk: 'none'` → exécution directe sans confirmation
- Retourner toujours un objet typé depuis `handler` (l'agent lit le retour)

## Conventions de code

- TypeScript strict mode — tout est typé, pas de `any`
- Pas de classes là où une fonction suffit (`registerCartTools(owllayer, api)`)
- Les handlers de tools sont **purs** : ils font une action + retournent un résultat clair
- Après chaque mutation panier → re-sync contexte avec `OwlLayer.updateContext()`
- Toujours gérer les erreurs réseau dans les handlers (`try/catch` → `{ success: false, error: string }`)
- Garder les imports relatifs avec extension `.js` (ESM)

## APIs Shopify à utiliser

### Cart AJAX API (pas besoin de token)
```
GET  /cart.js                        → état du panier
POST /cart/add.js    { items }       → ajouter
POST /cart/change.js { id, quantity }→ modifier/supprimer (qty=0)
POST /cart/update.js { attributes }  → mettre à jour attributs
```
- Headers requis : `Content-Type: application/json`, `X-Requested-With: XMLHttpRequest`
- **Les prix sont en centimes** → diviser par 100

### Storefront GraphQL API (nécessite `storefrontToken`)
```
POST https://{shopDomain}/api/2024-01/graphql.json
Headers: X-Shopify-Storefront-Access-Token: {token}
```
- Utiliser le `StorefrontClient` existant dans `src/storefront/StorefrontClient.ts`

## Workflow par sprint

**Avant de coder**, lire le fichier sprint correspondant :
- `sprints/SPRINT-1-setup-context.md` → ShopifyContextBuilder + init
- `sprints/SPRINT-2-cart-tools.md` → CartContextSync + 4 cart tools
- `sprints/SPRINT-3-product-tools.md` → ProductTools + StorefrontClient complet
- `sprints/SPRINT-4-checkout-orders.md` → CheckoutTools + OrderTools
- `sprints/SPRINT-5-build-demo.md` → build + tests + App Embed Block

## Contexte OwlLayer — format attendu

Le contexte doit toujours inclure `userLocation` et `availableActions` pour que l'agent comprenne la situation :

```ts
OwlLayer.updateContext({
  platform: 'shopify',
  currentPage: 'product',
  userLocation: "L'utilisateur consulte le produit : Red T-Shirt",
  availableActions: [
    'Ajouter au panier → add_to_cart(variantId, qty)',
    'Voir les variantes → get_product(handle)',
    'Naviguer → navigate_to_product(handle)',
  ],
  product: { id, handle, title, price, available, variants: [...] },
  cart: { isEmpty, itemCount, total, productIds: [], items: [...] },
  shop: { name, domain, currency, locale },
});
```

## Tests

- Utiliser `vitest` (déjà configuré dans le workspace)
- Mocker `fetch` avec `vi.stubGlobal('fetch', ...)`
- Mocker le DOM avec `jsdom` (disponible dans `@owllayer/browser`)
- Fichiers de test dans `src/__tests__/` ou colocalisés `*.test.ts`
- Lancer : `pnpm test` dans `packages/shopify`

## Builds

- Lancer : `pnpm build` dans `packages/shopify`
- Le `esbuild.config.mjs` est à créer au Sprint 1 (s'inspirer de `packages/browser/esbuild.config.mjs`)
- Output attendu : `dist/owllayer-shopify.bundle.mjs` + `dist/owllayer-shopify.min.js`

## Ce qui est DÉJÀ en place (stubs)

Tous les fichiers sources existent avec leurs signatures. Ne pas recréer — compléter les `// TODO Sprint N` dans chaque fichier.

## Ce qui est INTERDIT

- Modifier `packages/browser/` ou `packages/core/`
- Appeler `OwlLayer.registerTool()` avant `OwlLayer.init()`
- Utiliser `any` — préférer `unknown` avec garde de type
- Exposer la Storefront API token dans des logs ou des erreurs
- Utiliser l'Admin API Shopify (privée) — uniquement la Storefront API (publique) et la Cart AJAX API


docs :
https://shopify.dev/docs/apps/build/checkout

https://shopify.dev/docs/apps/build/checkout/start-building

https://shopify.dev/docs/api/liquid

https://shopify.dev/docs/api

https://shopify.dev/docs/api/catalog-api

https://shopify.dev/docs/api/admin-graphql/latest

https://shopify.dev/docs/api/webhooks/latest?reference=graphql

https://shopify.dev/docs/api/webhooks/latest?reference=toml

https://shopify.dev/docs/api/payments-apps/latest