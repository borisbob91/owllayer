# @domos/shopify — Sprint 4
## Checkout Tool + Order Tracking

**Durée estimée :** 3-4 jours  
**Branche :** `feat/shopify-sprint-4`  
**Dépendance :** Sprint 3 ✅

---

## Objectif

L'agent peut initier le checkout (redirection vers `/checkout`) et répondre aux questions de suivi de commande directement dans le chat via la Storefront API.

> ⚠️ Le PaymentWidget in-chat (Shopify Pay / Apple Pay / Google Pay) est reporté au Sprint 5+. Dans ce sprint, `initiate_checkout` redirige simplement vers `/checkout`.

---

## Tâches

### 4.1 — CheckoutTools (`src/tools/CheckoutTools.ts`)

#### `initiate_checkout`
- **Risk :** `high` (HITL — modal de confirmation obligatoire)
- **Params :** aucun
- **Comportement :**
  1. Vérifier que le panier n'est pas vide (`GET /cart.js`)
  2. Si vide → `{ success: false, error: "Le panier est vide" }`
  3. Si rempli → `window.location.href = '/checkout'`
  4. Return : `{ success: true, redirecting: true }`
- **Note :** le HITL `high` force l'agent à afficher un modal de confirmation avant d'exécuter la redirection

#### `apply_discount`
- **Risk :** `none`
- **Params :** `code: string`
- **API :** `POST /cart/update.js` `{ attributes: { discount_code: code } }` (méthode côté panier)
- **Alternative :** ouvrir `/checkout?discount={code}` si Storefront API checkout disponible
- **Returns :** `{ success: boolean, code: string, discountApplied: boolean }`
- **Note :** la validation réelle se fait au checkout Shopify — on peut juste stocker le code

- [ ] Implémenter les 2 tools

### 4.2 — OrderTools (`src/tools/OrderTools.ts`)

**Prérequis :** `storefrontToken` + client connecté (customer access token) **ou** email + numéro de commande

#### `get_order_status`
- **Risk :** `none`
- **Params :** `orderNumber?: string` (ex: `#4821`), `email?: string`
- **Flows :**
  - Si client connecté : requête `customer { orders(first: 5) { ... } }` via Storefront API
  - Si non connecté : retourner un message demandant l'email + numéro de commande, puis faire la recherche
- **Returns :**
```ts
{
  found: boolean,
  order?: {
    name: string,            // "#4821"
    financialStatus: string, // "paid" | "refunded" | ...
    fulfillmentStatus: string, // "fulfilled" | "in_progress" | ...
    createdAt: string,
    lineItems: Array<{ title: string, quantity: number }>,
    trackingUrl?: string,
    estimatedDelivery?: string,
  }
}
```

**Query GraphQL :**
```graphql
query GetOrders($customerAccessToken: String!) {
  customer(customerAccessToken: $customerAccessToken) {
    orders(first: 5, sortKey: PROCESSED_AT, reverse: true) {
      edges {
        node {
          name orderNumber processedAt financialStatus
          fulfillmentStatus
          lineItems(first: 10) { edges { node { title quantity } } }
          successfulFulfillments {
            trackingCompany
            trackingInfo { number url }
          }
          totalPriceV2 { amount currencyCode }
        }
      }
    }
  }
}
```

- [ ] Implémenter `get_order_status`
- [ ] Gérer le cas client non connecté (message guidé)
- [ ] Tests unitaires

### 4.3 — Customer context (`src/context/CustomerContext.ts`)

- [ ] Lire `window.__st.cid` (customer ID Shopify si connecté)
- [ ] Lire le customer access token s'il est disponible dans les cookies/localStorage
- [ ] Injecter dans le contexte DomOS : `{ customer: { isLoggedIn, id?, email? } }`

---

## Critères de succès

- [ ] L'agent dit "passer commande" → modal HITL high → l'utilisateur confirme → redirection vers `/checkout`
- [ ] L'agent peut répondre "où est ma commande #4821" avec le statut réel (si client connecté)
- [ ] `apply_discount` stocke le code promo pour le checkout
- [ ] Tests checkout + order tools passent

---

## Notes

- `initiate_checkout` avec `risk: 'high'` déclenchera automatiquement le modal HITL de `@domos/browser` — aucun code supplémentaire nécessaire
- Le customer access token Shopify expire toutes les `accessTokenExpiresAt` — gérer le cas d'expiration proprement
