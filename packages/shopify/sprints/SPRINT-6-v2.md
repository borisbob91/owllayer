# @owllayer/shopify — Sprint 6 v2
## Bloc B : PaymentWidget + API Storefront réelle

**Commit base :** `4412d9b` (Sprint 6 Bloc A — 123 tests ✓)  
**Branche :** `feat/shopify-sprint-6`

---

## Objectifs

### Bloc B — PaymentWidget
Modale de checkout in-chat : récapitulatif commande → adresse → transporteur → code promo → paiement (Shop Pay / Apple Pay / Google Pay / carte) — dans son propre Shadow DOM, activée par `features.inChatPayments: true`.

### API réelle
Remplacer `MOCK_PRODUCTS` dans `UITools.ts` par des appels `StorefrontClient` Shopify Storefront API v2024-01.

---

## Bloc B — PaymentWidget

### Activation
```ts
// theme.liquid
OwlLayerShopify.init({
  apiKey: '...',
  storefrontToken: '...',
  shopDomain: 'my-store.myshopify.com',
  features: { inChatPayments: true },   // ← active le PaymentWidget
});
```

Quand `false` ou absent → `initiate_checkout` Sprint 4 (redirection) reste intact.

### Architecture Shadow DOM

```
#owllayer-payment-host  (position: fixed, inset: 0, z-index: 2147483647)
└── shadow root
    ├── <style> PAYMENT_CSS
    └── PaymentWidgetApp (Preact)
        ├── Backdrop (blur overlay)
        └── Modal (560px × auto, centré)
            ├── ModalHeader (titre + close)
            └── Steps router
                ├── Step 1 — OrderSummary
                ├── Step 2 — AddressForm
                ├── Step 3 — ShippingRates
                ├── Step 4 — PromoCode
                └── Step 5 — PaymentMethods (Shop Pay iframe / stripe elements)
```

### Steps détail

| Step | Composant | Données |
|------|-----------|---------|
| 1 | `OrderSummary` | Items panier + total + remise |
| 2 | `AddressForm` | Prénom, Nom, Adresse, Ville, CP, Pays (autocomplete) |
| 3 | `ShippingRates` | Appel `CartTools.get_shipping_rates` → liste radio |
| 4 | `PromoCode` | Input code → `apply_discount` → feedback visual |
| 5 | `PaymentMethods` | Boutons Shop Pay / Apple Pay / Google Pay + form carte |

### Fichiers à créer

```
src/ui/
├── payment/
│   ├── PaymentWidget.ts          ← host Shadow DOM (même pattern ShopifyWidget)
│   ├── PaymentWidgetApp.tsx      ← root Preact, steps router
│   ├── payment-styles.ts         ← CSS Shadow DOM modal
│   ├── types.ts                  ← CheckoutState, ShippingRate, PaymentMethod
│   └── steps/
│       ├── OrderSummary.tsx
│       ├── AddressForm.tsx
│       ├── ShippingRates.tsx
│       ├── PromoCode.tsx
│       └── PaymentMethods.tsx
```

### Intégration OwlLayerShopify.ts
```ts
// src/OwlLayerShopify.ts — ajout
if (config.features?.inChatPayments) {
  const paymentWidget = new PaymentWidget(bridge);
  registerPaymentTools(OwlLayer, paymentWidget);
}
```

### Nouveau tool IA : `initiate_checkout_modal`
```ts
owllayer.registerTool('initiate_checkout_modal', {
  description: 'Ouvre la modale de paiement in-chat avec le récapitulatif du panier.',
  parameters: { type: 'object', properties: {} },
  handler() {
    window.dispatchEvent(new CustomEvent('owllayer:payment:open'));
    return { success: true };
  },
});
```

---

## API Storefront réelle — remplacement des mocks

### Situation actuelle
`UITools.ts` utilise `MOCK_PRODUCTS` (6 produits statiques). Il faut passer aux vraies données Shopify via `StorefrontClient`.

### Changement dans UITools.ts

```ts
// AVANT (mock)
export function registerUITools(owllayer: OwlLayerRegister): void { ... }

// APRÈS (avec client optionnel)
export function registerUITools(
  owllayer: OwlLayerRegister,
  storefront: StorefrontClient | null,
): void { ... }
```

Si `storefront === null` → fallback sur `MOCK_PRODUCTS` (rétrocompat).

### Requête Storefront à ajouter dans StorefrontClient

```ts
// packages/shopify/src/storefront/StorefrontClient.ts — nouvelle méthode
async searchProducts(query: string, limit = 8): Promise<UIProduct[]> {
  const data = await this.query<{ products: { edges: ProductEdge[] } }>(
    SEARCH_PRODUCTS_QUERY,
    { query, limit }
  );
  return data.products.edges.map(edgeToUIProduct);
}
```

Requête GraphQL :
```graphql
query SearchProducts($query: String!, $limit: Int!) {
  products(first: $limit, query: $query) {
    edges {
      node {
        id handle title vendor
        priceRange { minVariantPrice { amount currencyCode } }
        compareAtPriceRange { minVariantPrice { amount currencyCode } }
        featuredImage { url }
        description(truncateAt: 120)
        availableForSale
        variants(first: 10) {
          edges {
            node { id title availableForSale price { amount } }
          }
        }
      }
    }
  }
}
```

### Mapping edge → UIProduct

```ts
function edgeToUIProduct(edge: ProductEdge): UIProduct {
  const n = edge.node;
  const price = `${parseFloat(n.priceRange.minVariantPrice.amount).toFixed(2)} ${n.priceRange.minVariantPrice.currencyCode}`;
  const compareAt = n.compareAtPriceRange.minVariantPrice.amount !== '0.00'
    ? `${parseFloat(n.compareAtPriceRange.minVariantPrice.amount).toFixed(2)} ${n.compareAtPriceRange.minVariantPrice.currencyCode}`
    : undefined;
  return {
    id: n.id,
    handle: n.handle,
    title: n.title,
    price,
    compareAtPrice: compareAt,
    imageUrl: n.featuredImage?.url ?? '',
    description: n.description,
    available: n.availableForSale,
    vendor: n.vendor,
    variants: n.variants.edges.map((v) => ({
      id: v.node.id,
      title: v.node.title,
      available: v.node.availableForSale,
      price: `${parseFloat(v.node.price.amount).toFixed(2)} ${n.priceRange.minVariantPrice.currencyCode}`,
    })),
  };
}
```

### Mise à jour OwlLayerShopify.ts
```ts
// Passer storefrontClient à registerUITools
registerUITools(OwlLayer, storefrontClient); // ← au lieu de registerUITools(OwlLayer)
```

---

## Ordre d'implémentation

1. **`StorefrontClient.searchProducts()`** — nouvelle méthode + test unitaire
2. **`UITools.ts`** — accepte `StorefrontClient | null`, branche mock vs réel
3. **`OwlLayerShopify.ts`** — passe `storefrontClient` à `registerUITools`
4. **`src/ui/payment/types.ts`** — CheckoutState, ShippingRate, PaymentMethod, AddressData
5. **`payment-styles.ts`** — CSS modal (backdrop blur, steps nav, form inputs)
6. **`OrderSummary.tsx`**
7. **`AddressForm.tsx`**
8. **`ShippingRates.tsx`** — appel `OwlLayer.registerTool('get_shipping_rates', ...)` ou Storefront
9. **`PromoCode.tsx`**
10. **`PaymentMethods.tsx`** — boutons natifs + fallback form carte
11. **`PaymentWidgetApp.tsx`** — steps router + state machine
12. **`PaymentWidget.ts`** — host Shadow DOM
13. **`registerPaymentTools`** — `initiate_checkout_modal` tool
14. **Update `OwlLayerShopify.ts`** — conditionnel `inChatPayments`
15. **Tests** — StorefrontClient.searchProducts + intégration PaymentWidget

---

## Critères de succès

- [ ] `pnpm test` : 123+ tests ✓
- [ ] `storefrontToken` absent → fallback mock silencieux (pas d'erreur)
- [ ] `storefrontToken` présent → produits réels Shopify dans le widget
- [ ] `features.inChatPayments: false` → `initiate_checkout` Sprint 4 inchangé
- [ ] `features.inChatPayments: true` → modale PaymentWidget s'ouvre
- [ ] Chaque step valide avant de passer au suivant (UX)
- [ ] Shadow DOM isolé (pas de fuite CSS vers la page Shopify)
- [ ] Build ESM + IIFE propres

---

## Rétrocompatibilité garantie

| Config | Comportement |
|--------|-------------|
| Pas de `storefrontToken` | Mock products, pas de PaymentWidget |
| `storefrontToken` sans `inChatPayments` | API réelle, checkout = redirection |
| `storefrontToken` + `inChatPayments: true` | API réelle + modale paiement in-chat |
