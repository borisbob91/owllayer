# @owllayer/shopify — Sprint 3
## Product Tools + Navigation + StorefrontClient complet

**Durée estimée :** 4-5 jours  
**Branche :** `feat/shopify-sprint-3`  
**Dépendance :** Sprint 2 ✅

---

## Adaptations confirmées (audit APIs + recherche mars 2026)

### ✅ Version API Storefront — configurable `storefrontApiVersion`
`StorefrontClient` accepte un 3ème paramètre optionnel `apiVersion` (défaut `'2026-01'`, fallback `'2024-01'`).  
Le marchand peut déclarer `storefrontApiVersion: '2024-01'` dans sa config `OwlLayerShopify.init()`.  
**Déjà implémenté** — pas de TODO restant sur ce point.

### ✅ Instance unique partagée
`StorefrontClient` est instancié **une seule fois** dans `OwlLayerShopify.init()` et passé en paramètre direct à `registerProductTools(owllayer, client)` et `registerOrderTools(owllayer, client)` (Sprint 4). Cela remplace l'ancienne signature `(owllayer, token, domain)` — les stubs sont mis à jour dans ce sprint.

### 🔴 Filtre prix Storefront — syntaxe corrigée
Depuis Storefront API 2024-07+, le filtre prix utilise `variants.price` sur la connexion `products` :
```
variants.price:>=50 AND variants.price:<=150
```
L'ancienne syntaxe `price:>50` n'est plus supportée sur les nouvelles versions.  
**Le query builder dans `searchProducts()` utilise `variants.price`.**

### 🔴 Navigation — locale-aware URLs
Même principe que Sprint 2 : `window.Shopify?.routes?.root ?? '/'` pour toutes les navigations.
```ts
// ❌ /products/red-shirt  (casse sur /fr/, /de/, /en-us/)
// ✅ ${root}products/red-shirt
```

### 🔴 `select_variant` — 3 patterns DOM couverts
Le sprint original ciblait uniquement Dawn. L'implémentation couvre 3 patterns :

| Pattern | Thèmes | Mécanisme |
|---------|--------|-----------|
| `select[name="id"]` | Debut, legacy | `.value = variantId` + `change` event |
| `input[type="radio"]` + `select[data-option]` | Dawn, Prestige, Impulse | selection par option name/value + `change` event |
| Custom event `variant:selected` | Headless, Hydrogen | `document.dispatchEvent(new CustomEvent('variant:selected', ...))` |

Si `options: { "Size": "L" }` fourni sans `variantId` → résolution depuis `#owllayer-product-json` (injecté par le snippet Liquid).

---

## Objectif

L'agent peut rechercher des produits, obtenir les détails d'un produit avec ses variantes, sélectionner une variante dans l'UI Shopify native et naviguer vers les pages produits/collections.

---

## Tâches

### 3.1 — StorefrontClient : Queries GraphQL (`src/storefront/StorefrontClient.ts`)

Implémenter les queries nécessaires pour les product tools :

```graphql
# Recherche produits
query SearchProducts($query: String!, $first: Int!, $sortKey: ProductSortKeys) {
  products(query: $query, first: $first, sortKey: $sortKey) {
    edges {
      node {
        id handle title
        priceRange { minVariantPrice { amount currencyCode } }
        availableForSale
        productType tags vendor
        featuredImage { url altText }
        variants(first: 10) { edges { node { id title availableForSale price { amount } } } }
      }
    }
  }
}

# Détail produit
query GetProduct($handle: String!) {
  product(handle: $handle) {
    id handle title description
    priceRange { minVariantPrice { amount currencyCode } }
    compareAtPriceRange { minVariantPrice { amount } }
    availableForSale productType tags vendor
    images(first: 5) { edges { node { url altText } } }
    variants(first: 30) { edges {
      node { id title availableForSale quantityAvailable
        price { amount currencyCode }
        selectedOptions { name value }
      }
    } }
  }
}
```

- [ ] Méthodes typées : `searchProducts(query, options)`, `getProduct(handle)`, `getProductRecommendations(productId)`
- [ ] Return types propres (interfaces dans `types.ts`)

### 3.2 — ProductTools (`src/tools/ProductTools.ts`)

#### `search_products`
- **Risk :** `none`
- **Params :** `query: string`, `limit?: number` (default 5), `productType?: string`, `tag?: string`, `minPrice?: number`, `maxPrice?: number`
- **API :** Storefront API — `products(query, first)` 
- **Returns :** `{ results: Array<{ id, handle, title, price, available, productType, url }> }`
- **Note :** construire la query Storefront en combinant les filtres (`product_type:X AND tag:Y AND price:>50`)

#### `get_product`
- **Risk :** `none`
- **Params :** `handle: string` (ex: `red-t-shirt`) OU `id: string`
- **API :** Storefront API — `product(handle)`
- **Returns :** détails complets + variantes + disponibilité par variante

#### `select_variant`
- **Risk :** `none`
- **Params :** `variantId: string` OU `options: Record<string, string>` (ex: `{ "Size": "L", "Color": "Red" }`)
- **Action DOM :** simule la sélection dans le sélecteur de variantes Shopify natif
  - `[name="id"]` hidden input → changer la valeur
  - Déclencher `change` event sur les `select`/radios de la page
  - Compatible avec Dawn et la plupart des thèmes Shopify 2.0
- **Returns :** `{ selected: { variantId, title, price, available } }`

- [ ] Implémenter les 3 tools
- [ ] Tests unitaires (StorefrontClient mocké)

### 3.3 — NavigationTools (`src/tools/NavigationTools.ts`)

#### `navigate_to_product`
- **Risk :** `none`
- **Params :** `handle: string`
- **Action :** `window.location.href = '/products/{handle}'`
- **Returns :** `{ navigating: true, url: string }`

#### `navigate_to_collection`
- **Risk :** `none`
- **Params :** `handle: string`
- **Action :** `window.location.href = '/collections/{handle}'`

- [ ] Implémenter les 2 tools

### 3.4 — Intégration dans OwlLayerShopify.init()

- [ ] Passer `storefrontToken` + `shopDomain` au `StorefrontClient` instancié une fois
- [ ] Partager l'instance `StorefrontClient` entre ProductTools et OrderTools (Sprint 4)
- [ ] Si `storefrontToken` absent → loguer un warning, désactiver les tools Storefront uniquement

---

## Critères de succès

- [ ] L'agent peut chercher "vestes imperméables moins de 150€" → reçoit une liste de produits
- [ ] L'agent peut dire "montre-moi la veste Alpine en taille L" → variante L sélectionnée dans l'UI
- [ ] L'agent peut naviguer vers un produit ou une collection
- [ ] Tests product tools passent

---

## Notes

- `select_variant` est **sans Storefront token** — manipulation DOM pure
- La query Storefront filter syntax : `product_type:"Veste" AND price:>100 AND price:<200`
- Si `storefrontToken` non fourni : `search_products` et `get_product` indisponibles, `select_variant` et navigation toujours disponibles
