# @domos/shopify — Sprint 1
## Setup + StorefrontClient + ShopifyContextBuilder

**Durée estimée :** 3-4 jours  
**Branche :** `feat/shopify-sprint-1`  
**Dépendance :** `@domos/browser` ✅ (déjà implémenté)

---

## Objectif

Poser les fondations du package : configuration du build, client Storefront API, et injection automatique du contexte Shopify dans DomOS au chargement de la page.

À la fin de ce sprint, `DomOSShopify.init()` fonctionne sur une boutique Shopify de dev et le widget DomOS apparaît avec le contexte produit/collection/shop correctement injecté.

---

## Tâches

### 1.1 — Build system

- [ ] Créer `esbuild.config.mjs` (inspiré de `packages/browser/esbuild.config.mjs`)
  - Output : `dist/domos-shopify.bundle.mjs` (ESM) + `dist/domos-shopify.min.js` (IIFE pour CDN)
  - External : `@domos/browser`, `@domos/core`
- [ ] Vérifier `pnpm build` passe sans erreur
- [ ] Ajouter `@domos/shopify` au workspace `pnpm-workspace.yaml`

### 1.2 — StorefrontClient (`src/storefront/StorefrontClient.ts`)

- [ ] Implémenter `query<T>(query, variables)` — POST vers `https://{shopDomain}/api/2024-01/graphql.json`
- [ ] Headers : `X-Shopify-Storefront-Access-Token`
- [ ] Gestion erreurs GraphQL (`errors[]` dans la réponse)
- [ ] Tests unitaires : mock fetch, vérifier headers, vérifier throw sur erreur

### 1.3 — ShopifyContextBuilder (`src/context/ShopifyContextBuilder.ts`)

**Sources de données à lire :**

| Source DOM | Données |
|---|---|
| `window.Shopify` | `shop`, `currency`, `locale` |
| `window.ShopifyAnalytics.meta.page.pageType` | Type de page (`product`, `collection`, `cart`, etc.) |
| `<script id="domos-product-json" type="application/json">` | Données produit injectées par Liquid |
| `<script id="domos-collection-json" type="application/json">` | Données collection |
| `document.body.dataset.pageType` | Fallback type de page |

**Contexte produit à construire (page produit) :**
```ts
{
  platform: 'shopify',
  currentPage: 'product',
  userLocation: "L'utilisateur consulte la page produit : {title}",
  product: {
    id: string,
    handle: string,
    title: string,
    price: string,         // ex: "49.99 €"
    compareAtPrice: string | null,
    available: boolean,
    vendor: string,
    productType: string,
    tags: string[],
    variants: Array<{ id: string, title: string, price: string, available: boolean }>,
  },
  shop: { name: string, domain: string, currency: string, locale: string },
}
```

- [ ] Implémenter `build()` — lecture des sources, construction du contexte
- [ ] Gérer les cas : page produit, page collection, page panier, page home, autres
- [ ] Tests unitaires avec DOM mocké

### 1.4 — DomOSShopify.init() minimal (`src/DomOSShopify.ts`)

- [ ] Appel `DomOS.init()` avec config de base (endpoint, apiKey, widget, hitl, session)
- [ ] Appel `ShopifyContextBuilder.build()` → `DomOS.updateContext()`
- [ ] Vérifier que le widget apparaît sur une page Shopify dev

### 1.5 — Template Liquid (pour tests manuels)

Créer `embed/snippet-dev.liquid` — un snippet minimal pour tester sur une boutique dev :
```liquid
<script src="https://cdn.domos.dev/browser@latest/domos.min.js"></script>
<script src="{{ 'domos-shopify.js' | asset_url }}"></script>
<script id="domos-product-json" type="application/json">
  {{ product | json }}
</script>
<script>
  DomOSShopify.init({
    apiKey: {{ shop.metafields.domos.api_key | json }},
    storefrontToken: {{ shop.metafields.domos.storefront_token | json }},
    shopDomain: {{ shop.permanent_domain | json }},
  });
</script>
```

---

## Critères de succès

- [ ] `pnpm build` passe dans `packages/shopify`
- [ ] Widget DomOS s'affiche sur une page produit Shopify dev
- [ ] `DomOS.updateContext()` contient les données produit correctes (vérifiable via `debug: true`)
- [ ] Tests unitaires StorefrontClient + ContextBuilder passent

---

## Notes

- La clé Storefront API est **publique** (lecture seule) — pas de risque à l'exposer dans le thème
- Utiliser l'API version `2024-01` (stable LTS Shopify)
- Pas encore de tools enregistrés dans ce sprint — juste l'init + contexte
