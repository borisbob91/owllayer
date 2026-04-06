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
- `woocommerce_cart_updated` (thèmes classiques via jQuery — wrapper : `window.jQuery?.('body').on(...)` si jQuery dispo, sinon ignoré)
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
- **API :** `POST /cart/add-item` body `{ id: productId, quantity, variation? }`
- **Params :** `productId: number`, `quantity: number`, `variation?: Array<{ attribute: string; value: string }>`
- **Note variation :** attributs globaux WooCommerce ont le préfixe `pa_` (ex. `pa_color`) ; attributs locaux sans préfixe (ex. `Size`) — case-sensitive
- **Returns :** `{ success: true, message: string }` — la re-sync CartContextSync fournit les totaux
- **Erreur :** produit hors stock → extraire `message` du JSON d'erreur (déjà géré par `StoreApiClient.post`)

#### `update_cart_item`
- **Risk :** `low`
- **API :** `PUT /cart/items/{key}` `{ quantity: newQty }` — retourne l'item seul, pas le panier
- **Params :** `key: string` (clé WooCommerce MD5), `qty: number`
- **Alternative :** accepter `productId: number` et retrouver la clé depuis le contexte cart courant
- **Returns :** `{ success: true, message: string }` — appeler `_fetchAndEmit()` pour re-sync
- **Note :** `PUT /cart/items/{key}` retourne l'item cart seul. Pour les totaux, utiliser le contexte DomOS mis à jour.

#### `remove_cart_item`
- **Risk :** `low`
- **API :** `DELETE /cart/items/{key}` — retourne l'item supprimé (pas le panier complet)
- **Params :** `key: string` OU `productId: number` (résoudre la clé depuis contexte)
- **Returns :** `{ success: true, message: string }` — appeler `_fetchAndEmit()` pour re-sync

#### `get_cart`
- **Risk :** `none`
- **API :** `GET /cart`
- **Returns :** état complet du panier (même format que CartContextSync)

**Après chaque mutation :** re-sync le contexte via `CartContextSync._fetchAndEmit()` (le context mis à jour contiendra les totaux frais)

- [ ] Implémenter les 4 tools
- [ ] Gestion clé WooCommerce (résolution productId → key depuis contexte courant DomOS)
- [ ] Tests unitaires

### 2.3 — Coupon tools (bonus Sprint 2)

#### `apply_coupon`
- **Risk :** `none`
- **API :** `POST /cart/apply-coupon/` avec query `?code=...` OU body `{ code: string }`
  - ⚠️ L'endpoint est `/cart/apply-coupon/` — PAS `/cart/coupons` (n'existe pas)
- **Returns :** `{ success: true, code, discount: string }` (extraire depuis totaux du cart retourné) ou `{ success: false, error: string }`

#### `remove_coupon` (bonus)
- **Risk :** `none`
- **API :** `POST /cart/remove-coupon/` avec body `{ code: string }`
- **Returns :** `{ success: true, message: string }`

---

## Critères de succès

- [ ] L'agent peut ajouter/modifier/supprimer des articles WooCommerce
- [ ] Le contexte DomOS se met à jour en temps réel
- [ ] Tests cart tools + CartContextSync passent
