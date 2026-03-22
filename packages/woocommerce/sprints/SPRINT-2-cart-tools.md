# @domos/woocommerce — Sprint 2
## Cart Tools + CartContextSync temps réel

**Durée estimée :** 3-4 jours  
**Branche :** `feat/woo-sprint-2`  
**Dépendance :** Sprint 1 ✅

---

## Objectif

L'agent peut gérer le panier WooCommerce en temps réel. Le contexte DomOS reste synchronisé automatiquement à chaque modification panier.

---

## Tâches

### 2.1 — CartContextSync complet (`src/context/CartContextSync.ts`)

**Événements DOM WooCommerce à écouter :**
- `wc-blocks_added_to_cart`
- `wc-blocks_removed_from_cart`
- `wc-blocks_cart_item_quantity_changed`
- `woocommerce_cart_updated` (thèmes classiques)
- Mutation Observer sur `.woocommerce-cart-form` (fallback thèmes classiques)

**Polling fallback :** 30s via `GET /cart`

**Context cart à émettre :**
```ts
{
  cart: {
    isEmpty: boolean,
    itemCount: number,
    total: string,       // "49.99 EUR"
    productIds: string[],
    items: [{
      key: string,       // clé WooCommerce unique pour mutations
      id: number,
      title: string,
      qty: number,
      unitPrice: string,
      lineTotal: string,
    }],
  }
}
```

> ⚠️ Le `key` de chaque item est important : c'est l'identifiant à passer pour `PUT /cart/items/{key}` et `DELETE /cart/items/{key}`

- [ ] Implémenter tous les event listeners
- [ ] Polling 30s
- [ ] Tests unitaires

### 2.2 — Cart Tools (`src/tools/CartTools.ts`)

#### `add_to_cart`
- **Risk :** `low`
- **API :** `POST /cart/add-item` `{ id: productId, quantity }`
- **Params :** `productId: number`, `quantity: number`, `variation?: Record<string, string>`
- **Returns :** `{ success, itemCount, cartTotal, addedItem: { title, qty } }`
- **Erreur :** produit hors stock → message explicite

#### `update_cart_item`
- **Risk :** `low`
- **API :** `PUT /cart/items/{key}` `{ quantity: newQty }`
- **Params :** `key: string` (clé WooCommerce), `qty: number`
- **Alternative :** accepter `productId` et retrouver la clé depuis le contexte cart
- **Returns :** `{ success, itemCount, cartTotal }`

#### `remove_cart_item`
- **Risk :** `low`
- **API :** `DELETE /cart/items/{key}`
- **Params :** `key: string` OU `productId: number` (résoudre la clé depuis contexte)
- **Returns :** `{ success, removedTitle, itemCount }`

#### `get_cart`
- **Risk :** `none`
- **API :** `GET /cart`
- **Returns :** état complet du panier (même format que CartContextSync)

**Après chaque mutation :** re-sync le contexte via `CartContextSync._fetchAndEmit()`

- [ ] Implémenter les 4 tools
- [ ] Gestion clé WooCommerce (résolution productId → key depuis contexte)
- [ ] Tests unitaires

### 2.3 — Coupon tool (bonus Sprint 2)

#### `apply_coupon`
- **Risk :** `none`
- **API :** `POST /cart/coupons` `{ code: string }`
- **Returns :** `{ success, code, discount: string }` ou `{ success: false, error: string }`

---

## Critères de succès

- [ ] L'agent peut ajouter/modifier/supprimer des articles WooCommerce
- [ ] Le contexte DomOS se met à jour en temps réel
- [ ] Tests cart tools + CartContextSync passent
