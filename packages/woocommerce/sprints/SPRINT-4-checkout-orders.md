# @owllayer/woocommerce — Sprint 4
## Checkout Tool + Order Tracking

**Durée estimée :** 4-5 jours  
**Branche :** `feat/woo-sprint-4`  
**Dépendance :** Sprint 3 ✅  
**Révisé le :** 2026-03-23 — corrections issues de la vérification des sources PHP (`Checkout.php`, `CheckoutSchema.php`, `CartCoupons.php`, `Order.php`, `OrderSchema.php`, `OrderAuthorizationTrait.php`)

---

## Objectif

L'agent peut initier le checkout WooCommerce et répondre aux questions de suivi de commande. Deux approches de checkout : redirection classique vers `/checkout` et checkout via Store API (pour le PaymentWidget futur Sprint 5).

---

## Corrections apportées (révision Sprint 4)

| # | Élément | Avant (incorrect) | Après (vérifié) |
|---|---|---|---|
| 1 | `apply_coupon` dans CheckoutTools | Dupliqué de CartTools | **Supprimé** — déjà dans CartTools Sprint 2 |
| 2 | Endpoint `apply_coupon` (Sprint 2) | `POST /cart/apply-coupon/` | **`POST /cart/coupons`** (`CartCoupons.php`) |
| 3 | `fill_checkout_field` mode Blocks | `POST /checkout` | **`PUT /checkout`** avec objet `billing_address` ou `shipping_address` complet (pas champ individuel) |
| 4 | Vérification panier vide | — | Utiliser `items_count > 0` (champ canonique) |
| 5 | `get_order_status` returns : `lineItems` | `lineItems: Array<...>` | **`items: Array<...>`** (nom réel dans OrderSchema) |
| 6 | `get_order_status` returns : `total` | `total: string` | **`totals.total_price: string`** (nested, minor units) |
| 7 | `get_order_status` returns : `dateCreated` | `dateCreated: string` | **ABSENT** — pas dans OrderSchema Store API v1 |
| 8 | `get_order_status` returns : `trackingNumber/Url` | présents | **ABSENTS** — nécessitent une extension WC tierce |
| 9 | Auth guest `get_order_status` | params `orderKey` + `email` | Query params : `key={orderKey}` **ET** `billing_email={email}` tous les deux obligatoires |

### ⚠️ Correction critique Sprint 2 (CartTools)
L'endpoint `apply_coupon` dans `CartTools.ts` pointe vers `POST /cart/apply-coupon/` — ce chemin **n'existe pas** dans les sources `CartCoupons.php`.  
**Fix requis en début de Sprint 4 :** corriger `CartTools.ts` → `POST /cart/coupons` + `{ code }`.

---

## Tâches

### 4.0 — Fix Sprint 2 : corriger `apply_coupon` dans CartTools

- [ ] `CartTools.ts` : `POST /cart/apply-coupon/` → **`POST /cart/coupons`** avec body `{ code }`
- [ ] Vérifier `remove_coupon` : endpoint correct est `DELETE /cart/coupons/{code}` (route `CartCoupon` individuelle)
- [ ] Régression tests CartTools — s'assurer que les 80 tests passent toujours

### 4.1 — CheckoutTools (`src/tools/CheckoutTools.ts`)

#### `initiate_checkout`
- **Risk :** `high` (HITL modal obligatoire)
- **Params :** aucun
- **Comportement :**
  1. Vérifier panier non vide via `GET /cart` — contrôler **`items_count > 0`** (champ canonique)
  2. Si vide → `{ success: false, error: "Panier vide" }`
  3. Si rempli → `window.location.href = '/checkout'`
  4. Return : `{ success: true, redirecting: true, checkoutUrl: '/checkout' }`

#### `fill_checkout_field`
- **Risk :** `medium`
- **Description :** Pré-remplir les champs d'adresse du formulaire de checkout
- **Params :** `field: string` (ex: `billing_first_name`, `billing_email`), `value: string`
- **Returns :** `{ success: boolean, field, value }`

**Mode Classic (checkout classique WooCommerce) :**
- Détecter : `!document.querySelector('.wc-block-checkout')`
- Action DOM : `document.querySelector('#' + field)?.value = value` + dispatch `change` event

**Mode Blocks (WooCommerce Blocks checkout) :**
- Détecter : `document.querySelector('.wc-block-checkout')` existe
- **⚠️ `POST /checkout` est FAUX** — lance le paiement. Endpoint correct : **`PUT /checkout`**
- `PUT /checkout` met à jour la commande draft avec l'adresse ou le moyen de paiement
- Les champs ne sont **pas individuels** — il faut envoyer l'objet entier :
  ```ts
  // PUT /wp-json/wc/store/v1/checkout
  {
    billing_address: {
      first_name, last_name, email,
      address_1, address_2, city,
      postcode, country, phone
    },
    // OU
    shipping_address: { ... },
    // OU
    payment_method: "bacs"
  }
  ```
- **Conséquence :** un seul champ isolé (ex. `billing_first_name`) ne peut pas être mis à jour seul via Store API en mode Blocks — il faut collecter l'adresse complète ou utiliser le DOM Blocks si accessible

#### ~~`apply_coupon`~~ — SUPPRIMÉ
> **Déjà implémenté dans CartTools (Sprint 2).** Endpoint vérifié : `POST /cart/coupons`.  
> Ne pas dupliquer dans CheckoutTools.

---

### 4.2 — OrderTools (`src/tools/OrderTools.ts`)

**Contrainte :** Store API v1 expose `GET /order/{id}` mais avec une autorisation stricte (voir §Auth ci-dessous).

#### Approche A — Client connecté (Store API) ✅
- `GET /wp-json/wc/store/v1/order/{id}`
- Autorisation : cookie session WP suffit si `get_current_user_id() === order.customer_id`

#### Approche B — Guest avec order key + email ✅
- `GET /wp-json/wc/store/v1/order/{id}?key={orderKey}&billing_email={email}`
- **Les deux params sont obligatoires** pour les commandes guest (`OrderAuthorizationTrait.php`)
- Sans les deux → 401 Unauthorized

#### Approche C — Pas d'accès (fallback)
- Commande d'un autre client → 403 Forbidden
- Pas de `key`/`email` → message guidé vers `/my-account/orders`

#### `get_order_status`
- **Risk :** `none`
- **Params :** `orderId: number`, `key?: string` (orderKey pour guests), `billing_email?: string` (pour guests)
- **Comportement :**
  - Si `key` + `billing_email` fournis → `GET /order/{id}?key={key}&billing_email={email}`
  - Sinon → `GET /order/{id}` (cookie session WP — client connecté)
  - Si 403/401 → retourner message guidé

- **Returns — champs réels de `OrderSchema.get_item_response()` :**
```ts
{
  found: boolean,
  order?: {
    id: number,
    status: string,          // "processing" | "completed" | "pending" | "on-hold" | ...
    // ⚠️ dateCreated ABSENT de Store API v1 (nécessite WC REST API v3)
    items: Array<{           // (pas lineItems)
      name: string,
      quantity: number,
      totals: { line_total: string },  // minor units
    }>,
    totals: {
      total_price: string,   // minor units (ex: "4999" = 49,99 €) — (pas total: string)
      subtotal: string,
      total_discount: string,
      total_shipping: string | null,
      total_tax: string,
      currency_code: string,
      currency_minor_unit: number,
    },
    billing_address: { first_name, last_name, email, address_1, city, postcode, country },
    // ⚠️ trackingNumber/trackingUrl ABSENTS — nécessitent extension WC tierce
  },
  // Si non autorisé :
  message?: string,          // "Connectez-vous ou fournissez key + billing_email"
  my_account_url?: string,   // "/my-account/orders"
}
```

---

### 4.3 — Plugin PHP : CustomerContext

Enrichir l'injection PHP avec les données client :

```php
if (is_user_logged_in()) {
    $customer = new WC_Customer(get_current_user_id());
    $context['customer'] = [
        'isLoggedIn' => true,
        'id'         => $customer->get_id(),
        'email'      => $customer->get_email(),
        'firstName'  => $customer->get_first_name(),
        'orderCount' => wc_get_customer_order_count(get_current_user_id()),
    ];
} else {
    $context['customer'] = ['isLoggedIn' => false];
}
```

- [ ] Mettre à jour `owllayer-woocommerce.php` avec CustomerContext
- [ ] Implémenter CheckoutTools (`initiate_checkout` + `fill_checkout_field`)
- [ ] Implémenter OrderTools (avec fallback non connecté)

---

### 4.4 — fill_checkout_field : compatibilité Blocks + Classic

WooCommerce a deux logiques de formulaire :
- **Classic checkout** : champs `<input id="billing_first_name">` dans le DOM
- **WooCommerce Blocks checkout** : React components, DOM et API différents

- [ ] Détecter si `document.querySelector('.wc-block-checkout')` existe → mode Blocks ✅
- [ ] Mode Classic : mutation directe des `<input>` WooCommerce standard + dispatch `change` ✅
- [ ] Mode Blocks : **`PUT /checkout` avec objet addresse complet** (pas `POST /checkout` qui lance le paiement)
- [ ] Si champ isolé en mode Blocks → collecter les autres champs depuis le DOM ou le contexte client avant d'envoyer le `PUT`

---

## Critères de succès

- [ ] Fix `apply_coupon` Sprint 2 : endpoint `/cart/coupons` vérifié — tests CartTools toujours 100%
- [ ] L'agent peut initier le checkout → modal HITL → redirection `/checkout`
- [ ] L'agent peut pré-remplir les champs adresse sur la page checkout classique
- [ ] L'agent peut récupérer le statut d'une commande (client connecté ET guest avec key+email)
- [ ] Tests passent

---

## Notes

- Store API `GET /order/{id}` existe dans WC Store API v1 (confirmé `Order.php`)
- Auth order : client connecté → cookie session WP, guest → `?key=` + `?billing_email=` **obligatoires ensemble** (`OrderAuthorizationTrait.php`)
- `OrderSchema` ne retourne **pas** `dateCreated` ni `trackingNumber` — utiliser WC REST API v3 (clé admin) pour ces données si besoin
- `PUT /checkout` (mise à jour draft) ≠ `POST /checkout` (passer la commande + paiement)
- Sources vérifiées : `Checkout.php`, `CheckoutSchema.php`, `CartCoupons.php`, `Order.php`, `OrderSchema.php`, `OrderAuthorizationTrait.php`
