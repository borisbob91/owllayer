# @domos/woocommerce — Sprint 4
## Checkout Tool + Order Tracking

**Durée estimée :** 4-5 jours  
**Branche :** `feat/woo-sprint-4`  
**Dépendance :** Sprint 3 ✅

---

## Objectif

L'agent peut initier le checkout WooCommerce et répondre aux questions de suivi de commande. Deux approches de checkout : redirection classique vers `/checkout` et checkout via Store API (pour le PaymentWidget futur Sprint 5).

---

## Tâches

### 4.1 — CheckoutTools (`src/tools/CheckoutTools.ts`)

#### `initiate_checkout`
- **Risk :** `high` (HITL modal obligatoire)
- **Params :** aucun
- **Comportement :**
  1. Vérifier panier non vide via `GET /cart`
  2. Si vide → `{ success: false, error: "Panier vide" }`
  3. Si rempli → `window.location.href = '/checkout'`
  4. Return : `{ success: true, redirecting: true, checkoutUrl: '/checkout' }`

#### `fill_checkout_field`
- **Risk :** `medium`
- **Description :** Pré-remplir un champ du formulaire de checkout si on est déjà sur `/checkout`
- **Params :** `field: string` (ex: `billing_first_name`, `billing_email`), `value: string`
- **Action DOM :** `document.querySelector('#' + field).value = value` + trigger `change` event
- **Returns :** `{ success: boolean, field, value }`
- **Note :** Compatible avec le formulaire classique WooCommerce checkout ET les WooCommerce Blocks

#### `apply_coupon`
- **Risk :** `none`
- **Params :** `code: string`
- **API :** `POST /cart/coupons` `{ code }`
- **Returns :** `{ success, code, discount }` ou erreur

### 4.2 — OrderTools (`src/tools/OrderTools.ts`)

**Contrainte :** la WooCommerce Store API v1 ne fournit pas d'accès direct aux commandes pour les clients non connectés. Deux approches :

#### Approche A — Client connecté (Store API)
- `GET /wp-json/wc/store/v1/order/{id}` — si disponible (WC 8.x+)
- Ou `GET /wp-json/wc/v3/orders?customer={customerId}` (nécessite auth)

#### Approche B — Lookup par email + numéro (page "Mon compte")
- Rediriger vers `/my-account/view-order/{orderId}/` si le client a un compte
- Ou faire une requête proxy côté DomOS Cloud si configuré

#### `get_order_status`
- **Risk :** `none`
- **Params :** `orderId?: number`, `orderKey?: string`, `email?: string`
- **Comportement :**
  - Si client connecté : requête Store API orders endpoint
  - Si non connecté : retourner message guidé (lien vers "Mon compte > Commandes")
- **Returns :**
```ts
{
  found: boolean,
  order?: {
    id: number,
    status: string,        // "processing" | "completed" | "shipped" | ...
    dateCreated: string,
    total: string,
    lineItems: Array<{ name: string, quantity: number, total: string }>,
    trackingNumber?: string,
    trackingUrl?: string,
  }
}
```

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

- [ ] Mettre à jour `domos-woocommerce.php` avec CustomerContext
- [ ] Implémenter CheckoutTools (initiate_checkout + fill_checkout_field + apply_coupon)
- [ ] Implémenter OrderTools (avec fallback non connecté)

### 4.4 — fill_checkout_field : compatibilité Blocks + Classic

WooCommerce a deux logiques de formulaire :
- **Classic checkout** : champs `<input id="billing_first_name">` dans le DOM
- **WooCommerce Blocks checkout** : React components, DOM différent

- [ ] Détecter si `document.querySelector('.wc-block-checkout')` existe → mode Blocks
- [ ] Mode Classic : mutation directe des `<input>` WooCommerce standard
- [ ] Mode Blocks : utiliser les Store API `POST /checkout` avec les champs pré-remplis

---

## Critères de succès

- [ ] L'agent peut initier le checkout → modal HITL → redirection `/checkout`
- [ ] L'agent peut pré-remplir les champs adresse sur la page checkout classique
- [ ] L'agent peut répondre au suivi commande (client connecté)
- [ ] `apply_coupon` fonctionne
- [ ] Tests passent
