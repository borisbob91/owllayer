# @domos/shopify — Sprint 2
## Cart Tools + CartContextSync temps réel

**Durée estimée :** 3-4 jours  
**Branche :** `feat/shopify-sprint-2`  
**Dépendance :** Sprint 1 ✅

---

## Adaptations confirmées (audit APIs mars 2026)

Suite à l'audit des APIs Shopify officielles, les points suivants ont été validés et intégrés.

### 🔴 Bloquant — Locale-aware URLs

Shopify expose `window.Shopify.routes.root` pour gérer les boutiques multi-marchés (ex: `/fr/`, `/de/`, `/en-us/`). Les URLs hardcodées comme `/cart.js` cassent sur ces boutiques.  
**Toutes les requêtes Cart AJAX doivent utiliser ce préfixe.**

```ts
const root = window.Shopify?.routes?.root ?? '/';
fetch(`${root}cart.js`)        // ✅ au lieu de fetch('/cart.js')
fetch(`${root}cart/add.js`)    // ✅
fetch(`${root}cart/change.js`) // ✅
```

### Format du contexte cart — aligné et exporté

`buildCartContext(cart: ShopifyCart)` est une **fonction exportée** (réutilisée par CartTools) :
- `variantId: string` / `productId: string` (les IDs sont des strings dans DomOS)
- `unitPrice: string` + `lineTotal: string` (formatés `"49.99 EUR"`, quantité × prix)
- `isEmpty: boolean` — requis pour que l'agent comprenne l'état du panier
- `productIds: string[]` — liste rapide des variantIds présents
- `total: string` — format `"49.99 EUR"`

### `stop()` — nettoyage complet

Doit nettoyer : `clearInterval` + `removeEventListener` pour **les 2 événements** + `observer.disconnect()`.

### `cart:refresh` — confirmé

Utilisé par Turbo (Out of the Sandbox) et d'autres thèmes premium. Écouter en plus de `cart:updated`.

### Admin GraphQL API — hors scope

L'Admin API nécessite un token OAuth privé côté serveur et est inaccessible depuis le navigateur (CORS bloqué par Shopify). Ne pas utiliser pour le SDK client.

---

## Objectif

L'agent peut interagir avec le panier Shopify en temps réel : ajouter, modifier, supprimer des articles et consulter le panier. Le contexte DomOS reste automatiquement synchronisé à chaque modification du panier (que ce soit l'agent ou l'utilisateur qui modifie).

---

## Tâches

### 2.1 — CartContextSync complet (`src/context/CartContextSync.ts`)

**Événements à écouter :**
- `document` `cart:updated` — émis par la plupart des thèmes Shopify
- `document` `cart:refresh` — certains thèmes utilisent ce nom
- Mutation Observer sur `[data-cart-count]` — fallback si pas d'événements DOM

**Fetch :**
- `GET /cart.js` → `ShopifyCart` type
- Convertir prix (Shopify stocke en centimes) → euros/devise
- Appeler `onUpdate(cartContext)` avec le nouveau contexte

**Context cart à émettre :**
```ts
{
  cart: {
    isEmpty: boolean,
    itemCount: number,
    total: string,       // "49.99 €"
    currency: string,
    productIds: string[],  // liste des variant_id pour référence rapide
    items: Array<{
      variantId: string,
      productId: string,
      title: string,
      qty: number,
      unitPrice: string,
      lineTotal: string,
    }>,
  }
}
```

- [ ] Bindings events cart complets
- [ ] Polling 30s fallback
- [ ] `stop()` propre (clearInterval + removeEventListener)
- [ ] Tests unitaires avec fetch mocké

### 2.2 — Cart Tools (`src/tools/CartTools.ts`)

#### `add_to_cart`
- **Risk :** `low`
- **API :** `POST /cart/add.js` `{ items: [{ id: variantId, quantity }] }`
- **Returns :** `{ success, itemCount, cartTotal, addedItem: { title, qty } }`
- **Erreur :** variante out-of-stock → message clair

#### `update_cart`
- **Risk :** `low`
- **API :** `POST /cart/change.js` `{ id: variantId, quantity: newQty }`
- **Params :** `variantId: string`, `qty: number` (0 = supprimer)
- **Returns :** `{ success, itemCount, cartTotal }`

#### `remove_from_cart`
- **Risk :** `low`
- **API :** `POST /cart/change.js` `{ id: variantId, quantity: 0 }`
- **Params :** `variantId: string`
- **Returns :** `{ success, removedTitle, itemCount }`

#### `get_cart`
- **Risk :** `none`
- **API :** `GET /cart.js`
- **Returns :** contexte cart complet (même format que CartContextSync)
- **Note :** l'agent peut appeler cela pour vérifier l'état du panier à tout moment

**Règles communes :**
- Après chaque mutation, re-fetch `/cart.js` (ou utiliser la réponse de `change.js`) et appeler `DomOS.updateContext(buildCartContext(cart))` pour sync immédiate
- Utiliser `window.Shopify.routes.root` pour toutes les URLs (locale-aware)
- Envoyer header `X-Requested-With: XMLHttpRequest` (requis par Shopify Cart AJAX API)

- [ ] Implémenter les 4 tools
- [ ] Tests unitaires avec fetch mocké
- [ ] `risk` correctement défini sur chaque tool

### 2.3 — Intégration dans DomOSShopify.init()

- [ ] Appeler `registerCartTools(DomOS)` dans `DomOSShopify.init()`
- [ ] Passer la référence `CartContextSync` pour la sync post-mutation
- [ ] Vérifier dans le widget que le contexte se met à jour en live

---

## Critères de succès

- [ ] `DomOSShopify.init()` avec cart tools fonctionne sur boutique dev
- [ ] L'agent peut dire "ajoute 1 Red T-shirt XL au panier" → le panier se met à jour
- [ ] Le contexte DomOS reflète immédiatement le nouvel état du panier
- [ ] Tests cart tools + CartContextSync passent

---

## Notes

- Shopify Cart AJAX API ne nécessite **pas** de Storefront token — elle fonctionne en cross-origin sur le domaine de la boutique
- Toujours envoyer `Content-Type: application/json` sur les POST
- Les prix sont en **centimes** dans la réponse Shopify → diviser par 100
- `POST /cart/change.js` retourne le **cart complet** après modification → pas besoin d'un second `GET /cart.js`
- `POST /cart/add.js` retourne `{ items: [...] }` seulement → nécessite un `GET /cart.js` séparé pour l'état complet
- `window.Shopify.routes.root` est garanti présent sur tous les thèmes Shopify hébergés
