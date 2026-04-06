# @domos/shopify — Sprint 6
## PaymentWidget In-Chat (Shopify Checkout Natif)

**Durée estimée :** 5-6 jours  
**Branche :** `feat/shopify-sprint-6`  
**Dépendance :** Sprint 5 ✅ (123 tests, build propre, App Embed Block)

---

## Objectif

L'agent peut initier un checkout complet **sans quitter le chat** : récapitulatif commande, saisie d'adresse, sélection du transporteur, code promo, et paiement (Shop Pay, Apple Pay, Google Pay, carte) — le tout rendu dans une modale flottante avec son propre Shadow DOM.

> **Sprint 4 reste intact** — `initiate_checkout` en mode redirection (`features.inChatPayments: false` ou absent) continue de fonctionner comme avant. Le PaymentWidget est activé uniquement quand `features.inChatPayments: true`.

---

## Architecture retenue

### Pourquoi un Shadow DOM séparé (pas intégré dans `@domos/browser`)

`@domos/browser` ne propose pas d'API `mountPanel()` et son widget est un composant fermé. Modifier `@domos/browser` est hors scope (package OSS indépendant). L'approche adoptée :

```
document.body
  ├── #domos-widget-host      ← Shadow DOM @domos/browser (inchangé)
  └── #domos-payment-host     ← Shadow DOM @domos/shopify Sprint 6 (NOUVEAU)
        └── Shadow Root
              ├── <style>      ← CSS isolé (Tailwind CDN play ou CSS custom props)
              └── <PaymentWidgetApp>
                    ├── Backdrop (overlay semi-transparent)
                    └── Modal (560px × auto, scrollable)
                          ├── Header (titre + bouton fermer)
                          ├── StepIndicator (1 Livraison → 2 Paiement → 3 Confirmation)
                          ├── OrderSummary
                          ├── [Step 1] ShippingAddressForm + DiscountCodeInput + ShippingRateSelector
                          ├── [Step 2] PaymentMethodSelector
                          └── [Step 3] OrderConfirmation
```

### Communication DomOS ↔ PaymentWidget

Le PaymentWidget communique via **Custom DOM Events** sur `window` :

| Événement | Direction | Payload |
|---|---|---|
| `domos:checkout:open` | `initiate_checkout` → Widget | `{ checkoutId, webUrl, lineItems, totalAmount, currency }` |
| `domos:checkout:address-set` | Widget → interne | `{ checkoutId, address }` |
| `domos:checkout:confirmed` | Widget → host page | `{ orderId, orderName, total }` |
| `domos:checkout:close` | Widget → Widget | — |

---

## Dépendance à ajouter

Ajouter **Preact** comme dépendance directe de `@domos/shopify` (déjà utilisé par `@domos/browser`, mais non exposé publiquement) :

```bash
pnpm add preact
```

`tsconfig.json` : déjà configuré avec `"jsx": "react-jsx"` et `"jsxImportSource": "preact"` (ou ajouter si absent).

---

## Tâches

### 6.1 — `StorefrontClient` — mutations checkout

Ajouter dans `src/storefront/StorefrontClient.ts` les constantes GraphQL et les méthodes correspondantes :

#### Mutations à ajouter

```ts
// Créer un checkout depuis les articles du panier Shopify
export const GQL_CHECKOUT_CREATE = `
  mutation checkoutCreate($input: CheckoutCreateInput!) {
    checkoutCreate(input: $input) {
      checkout {
        id webUrl
        totalPriceV2 { amount currencyCode }
        subtotalPriceV2 { amount currencyCode }
        lineItems(first: 20) {
          edges { node { title quantity variant { price { amount } } } }
        }
      }
      checkoutUserErrors { field message }
    }
  }
`;

// Mettre à jour l'adresse de livraison
export const GQL_CHECKOUT_SHIPPING_ADDRESS_UPDATE = `
  mutation checkoutShippingAddressUpdateV2($checkoutId: ID!, $shippingAddress: MailingAddressInput!) {
    checkoutShippingAddressUpdateV2(checkoutId: $checkoutId, shippingAddress: $shippingAddress) {
      checkout {
        id
        availableShippingRates {
          ready
          shippingRates { handle title priceV2 { amount currencyCode } }
        }
      }
      checkoutUserErrors { field message }
    }
  }
`;

// Sélectionner un transporteur
export const GQL_CHECKOUT_SHIPPING_LINE_UPDATE = `
  mutation checkoutShippingLineUpdate($checkoutId: ID!, $shippingRateHandle: String!) {
    checkoutShippingLineUpdate(checkoutId: $checkoutId, shippingRateHandle: $shippingRateHandle) {
      checkout {
        id totalPriceV2 { amount currencyCode }
        shippingLine { title priceV2 { amount currencyCode } }
      }
      checkoutUserErrors { field message }
    }
  }
`;

// Appliquer un code promo (remplace le redirect Sprint 4 quand inChatPayments: true)
export const GQL_CHECKOUT_DISCOUNT_APPLY = `
  mutation checkoutDiscountCodeApplyV2($checkoutId: ID!, $discountCode: String!) {
    checkoutDiscountCodeApplyV2(checkoutId: $checkoutId, discountCode: $discountCode) {
      checkout {
        id
        discountApplications(first: 5) {
          edges { node { ... on DiscountCodeApplication { code applicable } } }
        }
        totalPriceV2 { amount currencyCode }
      }
      checkoutUserErrors { field message }
    }
  }
`;

// Polling availableShippingRates (les rates ne sont pas immédiates après updateAddress)
export const GQL_CHECKOUT_SHIPPING_RATES = `
  query checkoutShippingRates($checkoutId: ID!) {
    node(id: $checkoutId) {
      ... on Checkout {
        availableShippingRates {
          ready
          shippingRates { handle title priceV2 { amount currencyCode } }
        }
      }
    }
  }
`;
```

#### Méthodes `StorefrontClient` à ajouter

```ts
checkoutCreate(lineItems: Array<{ variantId: string; quantity: number }>): Promise<CheckoutData>
checkoutUpdateShippingAddress(checkoutId: string, address: ShippingAddress): Promise<CheckoutData>
checkoutUpdateShippingLine(checkoutId: string, rateHandle: string): Promise<CheckoutData>
checkoutApplyDiscount(checkoutId: string, code: string): Promise<{ applicable: boolean; totalAmount: string }>
checkoutPollShippingRates(checkoutId: string, maxRetries?: number): Promise<ShippingRate[]>
```

> `checkoutPollShippingRates` : polling avec 500ms d'intervalle, max 10 retries — les rates Shopify peuvent prendre 2-5s à se calculer.

- [ ] Ajouter les 5 constantes GQL
- [ ] Ajouter les 5 méthodes sur `StorefrontClient`
- [ ] Ajouter les types `CheckoutData`, `ShippingAddress`, `ShippingRate` dans `src/types.ts`
- [ ] Tests unitaires : mock fetch pour chaque mutation, vérifier variables + erreurs `checkoutUserErrors`

---

### 6.2 — `payments/CheckoutBuilder.ts`

Orchestrateur haut niveau qui pilote le cycle de vie d'un checkout Shopify depuis les articles du panier actuel.

```ts
export class CheckoutBuilder {
  constructor(private client: StorefrontClient) {}

  /** Lit /cart.js et crée le checkout Shopify */
  async buildFromCart(): Promise<CheckoutData>

  /** Enchaîne updateShippingAddress + pollShippingRates */
  async setShippingAddress(checkoutId: string, address: ShippingAddress): Promise<ShippingRate[]>

  /** Sélectionner un transporteur */
  async selectShippingRate(checkoutId: string, handle: string): Promise<CheckoutData>

  /** Appliquer un code promo */
  async applyDiscount(checkoutId: string, code: string): Promise<{ applicable: boolean; totalAmount: string }>
}
```

**`buildFromCart()`** :
1. `GET /cart.js` → récupérer les articles
2. Mapper `items → lineItems: [{ variantId: "gid://shopify/ProductVariant/{id}", quantity }]`
3. `client.checkoutCreate(lineItems)`
4. Return `CheckoutData`

- [ ] Implémenter `CheckoutBuilder`  
- [ ] Tests : mock `fetch` (cart.js + StorefrontClient), vérifier mapping variantId GID

---

### 6.3 — `payments/PaymentWidget/` — Composants Preact

Tous les composants **utilisent des styles inline** (pas de Tailwind, pas de CSS externe) pour garantir l'isolation totale dans le Shadow DOM.

> **Palette de couleurs** : cohérente avec `@domos/browser` — fond `#0b1220`, texte `#e2e8f0`, accent `#f97316` (orange), bordures `#334155`.

#### `PaymentWidget.tsx` — Host + montage

```tsx
export class PaymentWidget {
  private host: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;

  mount(checkoutData: CheckoutData, storefrontClient: StorefrontClient): void
  unmount(): void
  isOpen(): boolean
}
```

**`mount()`** :
1. Si déjà ouvert → ignore
2. `host = document.createElement('div'); host.id = 'domos-payment-host'`
3. `shadowRoot = host.attachShadow({ mode: 'closed' })`
4. Injecter `<style>{WIDGET_CSS}</style>` dans le shadow root
5. `render(h(PaymentWidgetApp, { checkoutData, client: storefrontClient, onClose: () => this.unmount() }), shadowRoot)`
6. `document.body.appendChild(host)`

**`unmount()`** :
1. `render(null, shadowRoot!)` (Preact cleanup)
2. `document.body.removeChild(host!)`
3. `host = null`

- [ ] Implémenter `PaymentWidget` (host/mount/unmount)

#### `PaymentWidgetApp.tsx` — Composant racine, gère les steps

```tsx
type Step = 'shipping' | 'payment' | 'confirmation';

interface Props {
  checkoutData: CheckoutData;
  client: StorefrontClient;
  onClose: () => void;
}
```

State : `step`, `address`, `shippingRates`, `selectedRate`, `discountCode`, `discountApplied`, `paymentMethod`, `isLoading`, `error`, `confirmedOrder`

- [ ] Implémenter `PaymentWidgetApp` (state machine 3 steps, backdrop + modal)

#### `OrderSummary.tsx`

Affiche les `lineItems` du checkout (titre, qté, prix), sous-total, livraison, réduction, **total**. Mise à jour en temps réel quand transporteur ou code promo change.

```tsx
interface Props {
  lineItems: CheckoutData['lineItems'];
  subtotal: string;
  shippingAmount?: string;
  discountAmount?: string;
  total: string;
  currency: string;
}
```

- [ ] Implémenter `OrderSummary`

#### `ShippingAddressForm.tsx`

Formulaire inline (pas de redirect) avec les champs :
- Prénom / Nom
- Adresse (ligne 1)
- Ville
- Code postal
- Pays (select, défaut depuis `window.Shopify.country ?? 'FR'`)
- Téléphone (optionnel)

Validation : champs requis non vides avant `onSubmit`.

```tsx
interface Props {
  initialAddress?: Partial<ShippingAddress>;
  onSubmit: (address: ShippingAddress) => void;
  isLoading: boolean;
}
```

- [ ] Implémenter `ShippingAddressForm`

#### `ShippingRateSelector.tsx`

Affiche la liste des `ShippingRate[]` après calcul par Shopify. Pendant le polling → spinner + message "Calcul des frais de port...".

```tsx
interface Props {
  rates: ShippingRate[];
  selectedHandle: string | null;
  onSelect: (handle: string) => void;
  isPolling: boolean;
}
```

- [ ] Implémenter `ShippingRateSelector`

#### `DiscountCodeInput.tsx`

Champ texte + bouton "Appliquer". État : `idle | applying | applied | error`.

```tsx
interface Props {
  onApply: (code: string) => Promise<{ applicable: boolean; totalAmount: string }>;
}
```

- [ ] Implémenter `DiscountCodeInput`

#### `PaymentMethodSelector.tsx`

Boutons de paiement dans l'ordre de priorité :

| Bouton | Condition d'affichage | Action |
|---|---|---|
| **Shop Pay** | Toujours (fallback universel) | `window.open(checkout.webUrl, '_blank')` |
| **Apple Pay** | `PaymentRequestAdapter.isApplePayAvailable()` | `PaymentRequestAdapter.requestPayment(...)` |
| **Google Pay** | `PaymentRequestAdapter.isGooglePayAvailable()` | `PaymentRequestAdapter.requestPayment(...)` |
| **Carte bancaire** | Toujours | `window.open(checkout.webUrl, '_blank')` (iframe Shopify hors scope Sprint 6) |

> ⚠️ L'intégration directe de l'iframe Shopify Payments (carte bancaire in-chat) est reportée à Sprint 7. Dans ce sprint, les boutons « Carte » et « Shop Pay » ouvrent le `checkout.webUrl` dans un nouvel onglet.

```tsx
interface Props {
  checkoutWebUrl: string;
  totalAmount: string;
  currency: string;
  lineItems: CheckoutData['lineItems'];
  onPaymentComplete: (result: { method: string }) => void;
  onPaymentError: (error: string) => void;
}
```

- [ ] Implémenter `PaymentMethodSelector`

#### `OrderConfirmation.tsx`

Écran final affiché après paiement confirmé (ou ouverture Shop Pay).

```tsx
interface Props {
  orderName?: string;   // "#4821" si disponible via webhook (sprint futur), sinon undefined
  webUrl: string;       // lien vers la page statut commande Shopify
  onClose: () => void;
}
```

Message : "Votre commande a été initiée. Suivez-la sur [votre compte →]."  
(Le numéro définitif est confirmé par Shopify après traitement — on ne l'a pas en synchrone côté browser.)

- [ ] Implémenter `OrderConfirmation`

---

### 6.4 — `payments/PaymentRequestAdapter.ts`

```ts
export const PaymentRequestAdapter = {
  isApplePayAvailable(): boolean
  isGooglePayAvailable(): boolean
  async requestPayment(params: {
    total: { label: string; amount: string };
    currency: string;
    lineItems: Array<{ label: string; amount: string }>;
    supportedMethods?: string[];
  }): Promise<{ success: boolean; token?: string; error?: string }>
}
```

**`isApplePayAvailable()`** :
```ts
return typeof window !== 'undefined' && 'ApplePaySession' in window && ApplePaySession.canMakePayments();
```

**`isGooglePayAvailable()`** :
```ts
return typeof window !== 'undefined' && 'PaymentRequest' in window && !('ApplePaySession' in window);
```

**`requestPayment()`** :
- Crée `new PaymentRequest([{ supportedMethods: 'basic-card' }], details)`
- `canMakePayment()` → vérification navigateur
- `show()` → attend réponse utilisateur
- `.complete('success')`
- Retourne `{ success: true, token: response.methodName }`

- [ ] Implémenter `PaymentRequestAdapter`
- [ ] Tests : mock `window.PaymentRequest`, vérifier `isApplePayAvailable` / `isGooglePayAvailable` selon `window` shape

---

### 6.5 — Mise à jour `CheckoutTools.ts`

**`initiate_checkout`** — comportement conditionnel selon `config.features.inChatPayments` :

```ts
// Si inChatPayments === true ET storefrontClient disponible :
const checkoutData = await checkoutBuilder.buildFromCart();
window.dispatchEvent(new CustomEvent('domos:checkout:open', { detail: checkoutData }));
return { success: true, mode: 'widget', checkoutId: checkoutData.id };

// Sinon (comportement Sprint 4 inchangé) :
window.location.href = `${routes.root}checkout`;
return { success: true, mode: 'redirect', redirecting: true };
```

**`apply_discount`** — comportement conditionnel :

```ts
// Si inChatPayments === true ET checkoutId actif dans le contexte :
const result = await checkoutBuilder.applyDiscount(activeCheckoutId, code.toUpperCase());
return result;

// Sinon (Sprint 4 : redirect) :
window.location.href = `${routes.root}checkout?discount=${encodeURIComponent(code.toUpperCase())}`;
```

- [ ] Mettre à jour `registerCheckoutTools()` — accepte `CheckoutBuilder | null` en 3e paramètre
- [ ] Mise à jour `DomOSShopify.ts` — instancier `CheckoutBuilder` si `storefrontClient` disponible + `inChatPayments: true`
- [ ] Les tests Sprint 4 ne doivent PAS régresser

---

### 6.6 — Mise à jour `DomOSShopify.init()`

```ts
// Après instanciation storefrontClient :
let checkoutBuilder: CheckoutBuilder | null = null;
const paymentWidget = new PaymentWidget();

if (storefrontClient && config.features?.inChatPayments) {
  checkoutBuilder = new CheckoutBuilder(storefrontClient);

  // Écouter l'événement d'ouverture déclenché par initiate_checkout
  window.addEventListener('domos:checkout:open', (e: Event) => {
    const detail = (e as CustomEvent).detail as CheckoutData;
    paymentWidget.mount(detail, storefrontClient);
  });
}

// Passer checkoutBuilder à registerCheckoutTools
registerCheckoutTools(DomOS, config, checkoutBuilder);
```

- [ ] Mise à jour `DomOSShopify.ts`
- [ ] Ajouter `ShopifyFeatureFlags.inChatPayments?: boolean` dans `types.ts` (déjà partiellement prévu)

---

### 6.7 — Tests Sprint 6

#### Tests unitaires `StorefrontClient` (mutations checkout)
- `checkoutCreate` → mock fetch, vérifier variables `lineItems` + GID format
- `checkoutUpdateShippingAddress` → vérifier payload `MailingAddressInput`
- `checkoutApplyDiscount` → vérifier `applicable` retourné depuis réponse mock
- `checkoutPollShippingRates` → mock 2 appels (ready: false, puis ready: true) → vérifier retry

#### Tests unitaires `CheckoutBuilder`
- `buildFromCart()` → mock `/cart.js` retourne 2 items → vérifier GID mapping
- `setShippingAddress()` → mock polling rates → vérifier rates retournées

#### Tests unitaires `PaymentRequestAdapter`
- `isApplePayAvailable()` → window avec `ApplePaySession` → true
- `isApplePayAvailable()` → window sans → false
- `isGooglePayAvailable()` → window avec `PaymentRequest` sans Apple Pay → true
- `requestPayment()` → mock `window.PaymentRequest` → vérifier `show()` appelé

#### Tests d'intégration `PaymentWidget` (jsdom)
- `mount()` → `document.body` contient `#domos-payment-host`
- `unmount()` → `#domos-payment-host` retiré du DOM
- `isOpen()` → false avant mount, true après, false après unmount
- Événement `domos:checkout:open` → `paymentWidget.mount()` appelé

#### Mise à jour `CheckoutTools.test.ts`
- `initiate_checkout` + `inChatPayments: false` → comportement redirect Sprint 4 inchangé
- `initiate_checkout` + `inChatPayments: true` + `checkoutBuilder` mock → event `domos:checkout:open` dispatché
- `apply_discount` + `inChatPayments: true` + `checkoutId` actif → `checkoutBuilder.applyDiscount()` appelé

**Objectif :** tous les tests passent, pas de régression sur les 123 existants.

---

## Critères de succès

- [ ] `pnpm test` → ≥ 160 tests, 0 échec
- [ ] `pnpm build` → build propre, tailles raisonnables (le PaymentWidget Preact ajoute ~15 KB ESM)
- [ ] `initiate_checkout` sans `inChatPayments` → redirect inchangée (Sprint 4)
- [ ] `initiate_checkout` avec `inChatPayments: true` → modale PaymentWidget s'ouvre
- [ ] Formulaire adresse complet → rates Shopify s'affichent (polling OK)
- [ ] Bouton "Shop Pay" ouvre `checkout.webUrl` en nouvel onglet
- [ ] `unmount()` nettoie complètement le DOM (pas de fuite Shadow DOM)

---

## PostMessage schema (pour sprint futur — Shop Pay callback)

```ts
// À implémenter Sprint 7 : Shop Pay ouvre une popup au lieu d'un onglet
// La popup dispatche quand le paiement est confirmé :
window.addEventListener('message', (e) => {
  if (e.data?.type === 'shop_pay:order_confirmed') {
    window.dispatchEvent(new CustomEvent('domos:checkout:confirmed', {
      detail: { orderName: e.data.orderName, total: e.data.total }
    }));
  }
});
```

---

## Structure finale `payments/`

```
src/payments/
├── CheckoutBuilder.ts
├── PaymentRequestAdapter.ts
└── PaymentWidget/
    ├── index.ts               ← export PaymentWidget (host class)
    ├── PaymentWidget.tsx      ← mount/unmount, Shadow DOM host
    ├── PaymentWidgetApp.tsx   ← root Preact component, step machine
    ├── OrderSummary.tsx
    ├── ShippingAddressForm.tsx
    ├── ShippingRateSelector.tsx
    ├── DiscountCodeInput.tsx
    ├── PaymentMethodSelector.tsx
    └── OrderConfirmation.tsx
```

---

## Commit cible

```
feat(shopify): Sprint 6 - PaymentWidget in-chat (CheckoutBuilder + Preact overlay + Apple/Google Pay)
```
