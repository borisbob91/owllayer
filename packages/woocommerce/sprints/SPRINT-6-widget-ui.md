# @owllayer/woocommerce — Sprint 6
## Chat Widget UI + WooPaymentWidget In-Chat (Shadow DOM Preact)

**Durée estimée :** 5-7 jours  
**Branche :** `feat/woo-sprint-6`  
**Dépendance :** Sprint 5 ✅ (`6d4cffb` — 136 tests, plugin PHP, README)  
**Référence :** `@owllayer/shopify` Sprint 6 (même architecture Shadow DOM Preact)

---

## Contexte et décisions d'architecture

### Ce sprint en deux blocs

| Bloc | Contenu | Priorité |
|------|---------|---------|
| **A — Chat Widget** | WooWidget Shadow DOM + WooWidgetApp + composants + vues + UITools | Obligatoire |
| **B — PaymentWidget** | WooPaymentWidget Shadow DOM + steps OrderSummary→Adresse→Livraison→Promo→Paiement | Obligatoire si `features.inChatPayments: true` |

### Pourquoi un Shadow DOM séparé (même raison que Shopify)
`@owllayer/browser` ne propose pas d'API `mountPanel()` — son widget est fermé. L'approche :

```
document.body
  ├── #owllayer-widget-host     ← Shadow DOM géré par @owllayer/browser (inchangé)
  ├── #owllayer-woo-chat-host   ← Shadow DOM Bloc A (WooWidget)
  └── #owllayer-woo-pay-host    ← Shadow DOM Bloc B (WooPaymentWidget)
```

Les deux Shadows communiquent avec le reste via **Custom DOM Events** sur `window`.

### Différences WooCommerce vs Shopify (Impact sur le code)

| Aspect | Shopify Sprint 6 | WooCommerce Sprint 6 |
|--------|-----------------|---------------------|
| Produits dans UITools | `MOCK_PRODUCTS` → `StorefrontClient.searchProducts()` | Produits viennent du **contexte PHP injecté** (`WooContextBuilder`) ou de `ProductTools` — pas de query GraphQL |
| Cart items | `UICartItem` Shopify | `WooCartItem` (Store API) → converti en `UICartItem` |
| PaymentWidget — adresses | Storefront API checkout mutations | `PUT /checkout` Store API (billingAddress + shippingAddress complet) |
| PaymentWidget — livraison | Storefront API shippingRates | `GET /cart` → `shipping_rates[]` (Blocks) + `POST /cart/select-shipping-rate` |
| PaymentWidget — promo | Storefront API discountCodeApply | `POST /cart/coupons` (déjà dans CartTools) |
| PaymentWidget — paiement | Shop Pay / Apple Pay / Google Pay | Stripe Elements (chargé dynamiquement) + PayPal Smart Buttons + redirect `/checkout` |
| API key | `storefrontToken` Shopify | `apiKey` OwlLayer (existant) |

---

## Structure à créer

```
src/ui/
├── WooWidget.ts                   ← host Shadow DOM chat (même pattern ShopifyWidget.ts)
├── WooWidgetApp.tsx               ← root Preact app (même pattern ShopifyWidgetApp.tsx)
├── styles.ts                      ← WIDGET_CSS Shadow DOM (thème violet/indigo pour différencier)
├── types.ts                       ← UIMessage, UIProduct, UICartItem, PanelView, events custom
├── components/
│   ├── FloatingButton.tsx         ← bouton flottant (indigo pour WooCommerce)
│   ├── VoiceOrb.tsx               ← visualisation voix
│   ├── ChatMessages.tsx           ← bulles de messages
│   └── ChatInput.tsx              ← input texte + bouton micro
├── views/
│   ├── ProductGridView.tsx        ← grille produits (UIProduct[])
│   ├── ProductDetailView.tsx      ← fiche produit (UIProduct + variations WooCommerce)
│   └── CartView.tsx               ← panier (UICartItem[])
└── payment/
    ├── WooPaymentWidget.ts        ← host Shadow DOM modal paiement (séparé du chat)
    ├── WooPaymentWidgetApp.tsx    ← root Preact, machine d'état steps
    ├── payment-styles.ts          ← CSS modal paiement (backdrop blur, stepper, forms)
    ├── types.ts                   ← CheckoutState, WooShippingRate, WooPaymentMethod, AddressData
    └── steps/
        ├── OrderSummary.tsx       ← récapitulatif panier (WooCartItem[] → affichage)
        ├── AddressForm.tsx        ← formulaire adresse (billing + shipping, PUT /checkout)
        ├── ShippingRates.tsx      ← taux de livraison (GET /cart → shipping_rates[])
        ├── PromoCode.tsx          ← code promo (POST /cart/coupons + feedback)
        └── PaymentMethods.tsx     ← Stripe Elements / PayPal / redirect /checkout
src/tools/
└── UITools.ts                     ← NOUVEAU — tools IA → Custom Events → Widget UI
```

**Fichiers modifiés :**
- `src/OwlLayerWoo.ts` — mount WooWidget + UITools + WooPaymentWidget conditionnel
- `package.json` — ajout dépendance `preact`
- `tsconfig.json` — ajout `"jsx": "react-jsx"`, `"jsxImportSource": "preact"`
- `esbuild.config.mjs` — ajout loader JSX pour `.tsx`
- `plugin/includes/class-admin-settings.php` — ajout champ `stripe_publishable_key`, `paypal_client_id`
- `plugin/owllayer-woocommerce.php` — passer `stripeKey`, `paypalClientId` dans la config JS injectée

---

## Tâches — Bloc A : Chat Widget UI

### 6.1 — Dépendances et configuration build

#### `package.json` — ajout Preact
```json
{
  "dependencies": {
    "@owllayer/browser": "workspace:*",
    "@owllayer/core": "workspace:*",
    "preact": "^10.26.4"
  }
}
```

#### `tsconfig.json` — support JSX
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact"
  }
}
```

#### `esbuild.config.mjs` — loader JSX + preact bundlé
```js
const shared = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  sourcemap: true,
  target: 'es2022',
  loader: { '.tsx': 'tsx', '.ts': 'ts' }, // ← AJOUT
  jsxFactory: 'h',                         // ← AJOUT
  jsxFragment: 'Fragment',                 // ← AJOUT
  jsxImportSource: 'preact',               // ← AJOUT
};
```

- [ ] Ajouter `preact` dans `package.json`
- [ ] Ajouter `jsx` + `jsxImportSource` dans `tsconfig.json`
- [ ] Ajouter `loader` + JSX config dans `esbuild.config.mjs`
- [ ] `pnpm install` pour charger Preact

### 6.2 — `src/ui/types.ts` — Types UI WooCommerce

Types UI indépendants des types Store API (couche présentation) :

```ts
export type AgentState = 'connecting' | 'idle' | 'listening' | 'thinking' | 'speaking' | 'streaming' | 'error';

export interface UIMessage { id: string; role: 'user' | 'agent'; content: string; streaming?: boolean; }

export interface UIProduct {
  id: string;         // String(wooProduct.id)
  handle: string;     // wooProduct.slug
  title: string;      // wooProduct.name
  price: string;      // formaté depuis wooProduct.prices.price (minor units / 100 + currency)
  compareAtPrice?: string;
  imageUrl: string;   // wooProduct.images[0]?.src ?? ''
  description?: string; // wooProduct.short_description (HTML strippé)
  available: boolean; // wooProduct.is_in_stock
  vendor?: string;    // wooProduct.brands[0]?.name ou ''
  variants?: UIVariant[];
}

export interface UIVariant { id: string; title: string; available: boolean; price: string; }

export interface UICartItem {
  id: string;         // wooCartItem.key
  title: string;      // wooCartItem.name
  price: string;      // formaté depuis wooCartItem.prices.price (minor units)
  imageUrl: string;   // wooCartItem.images?.[0]?.src ?? '' (WC Store API v1 cart items)
  quantity: number;
  variantId?: string; // wooCartItem.variation (stringified)
}

export type PanelView =
  | { type: 'none' }
  | { type: 'products'; products: UIProduct[]; query?: string }
  | { type: 'product-detail'; product: UIProduct }
  | { type: 'cart'; items: UICartItem[] }
  | { type: 'upsell'; product: UIProduct; reason: string };

// Custom Events (émis par UITools → écoutés par WooWidgetApp)
export interface UIShowProductsDetail   { products: UIProduct[]; query?: string; }
export interface UIShowProductDetailDetail { product: UIProduct; }
export interface UIShowCartDetail       { items: UICartItem[]; }
export interface UIShowNotificationDetail { message: string; variant: 'success'|'info'|'warning'|'error'; duration?: number; }
export interface UIShowUpsellDetail     { product: UIProduct; reason: string; }
```

**Note mapping prix WooCommerce (minor units) :**
```ts
// WC Store API retourne les prix en minor units (centimes)
// "1999" → "19.99 EUR"
function formatWooPrice(minor: string, currencyCode: string): string {
  return `${(parseInt(minor, 10) / 100).toFixed(2)} ${currencyCode}`;
}
```

- [ ] Créer `src/ui/types.ts`

### 6.3 — `src/ui/styles.ts` — CSS Widget (thème indigo WooCommerce)

Même structure que `@owllayer/shopify` `styles.ts` — CSS injecté dans le Shadow DOM. Thème indigo/violet pour différencier visuellement WooCommerce (orange = Shopify, indigo = WooCommerce) :

```ts
export const WIDGET_CSS = `
/* ... même structure que @owllayer/shopify styles.ts ... */
/* Couleur principale : #6366f1 (indigo-500) au lieu de #f97316 (orange-500) */
.float-btn {
  background: linear-gradient(135deg, #6366f1, #4f46e5); /* indigo */
  box-shadow: 0 8px 28px rgba(99,102,241,0.4);
}
/* ... icônes WooCommerce SVG ... */
`;
```

- [ ] Créer `src/ui/styles.ts` (adapter couleurs indigo depuis Shopify styles.ts)

### 6.4 — Composants (`src/ui/components/`)

Identiques à Shopify Sprint 6 — adapter les couleurs et les types WooCommerce :

| Composant | Adapations WooCommerce |
|-----------|----------------------|
| `FloatingButton.tsx` | Couleur indigo, badge cart count depuis `WooCart.items_count` |
| `VoiceOrb.tsx` | Identique Shopify — aucune adaptation |
| `ChatMessages.tsx` | Identique Shopify — aucune adaptation |
| `ChatInput.tsx` | Identique Shopify — aucune adaptation |

- [ ] Créer `src/ui/components/FloatingButton.tsx`
- [ ] Créer `src/ui/components/VoiceOrb.tsx`
- [ ] Créer `src/ui/components/ChatMessages.tsx`
- [ ] Créer `src/ui/components/ChatInput.tsx`

### 6.5 — Vues (`src/ui/views/`)

| Vue | Données WooCommerce |
|-----|---------------------|
| `ProductGridView.tsx` | `UIProduct[]` — mapping depuis `WooProduct` fait dans UITools |
| `ProductDetailView.tsx` | `UIProduct` + `UIVariant[]` — afficher les attributs WooCommerce (taille, couleur) |
| `CartView.tsx` | `UICartItem[]` — mapping depuis `WooCartItem` fait dans UITools |

- [ ] Créer `src/ui/views/ProductGridView.tsx`
- [ ] Créer `src/ui/views/ProductDetailView.tsx`
- [ ] Créer `src/ui/views/CartView.tsx`

### 6.6 — `src/ui/WooWidgetApp.tsx` — Root Preact App

Même structure que `ShopifyWidgetApp.tsx` — adapter les types et les event names :

```tsx
// Events spécifiques WooCommerce
window.addEventListener('owllayer:ui:show_products', handleShowProducts);
window.addEventListener('owllayer:ui:show_product_detail', handleShowProductDetail);
window.addEventListener('owllayer:ui:show_cart', handleShowCart);
window.addEventListener('owllayer:ui:show_notification', handleShowNotification);
window.addEventListener('owllayer:ui:show_upsell', handleShowUpsell);
window.addEventListener('owllayer:ui:close_panel', handleClosePanel);
// Event de mise à jour du panier (émis par CartContextSync)
window.addEventListener('owllayer:woo:cart_updated', handleCartUpdate);
```

**Event `owllayer:woo:cart_updated`** — émis par `CartContextSync` quand le panier change :
```ts
// CartContextSync.ts — à ajouter lors du sync
window.dispatchEvent(new CustomEvent('owllayer:woo:cart_updated', {
  detail: { items: mappedUICartItems, count: cart.items_count }
}));
```

- [ ] Créer `src/ui/WooWidgetApp.tsx`

### 6.7 — `src/ui/WooWidget.ts` — Shadow DOM Host

Identique à `ShopifyWidget.ts` — même pattern :

```ts
const HOST_ID = 'owllayer-woo-chat-host';

export class WooWidget {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private bridge: OwlLayerBridge;

  constructor(bridge: OwlLayerBridge) { this.bridge = bridge; }

  mount(): void {
    if (document.getElementById(HOST_ID)) return;
    this.host = document.createElement('div');
    this.host.id = HOST_ID;
    this.host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483638;';
    document.body.appendChild(this.host);
    this.shadow = this.host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = WIDGET_CSS;
    this.shadow.appendChild(style);
    const container = document.createElement('div');
    container.style.cssText = 'pointer-events:auto;';
    this.shadow.appendChild(container);
    render(h(WooWidgetApp, { owllayer: this.bridge }), container);
  }

  unmount(): void { /* cleanup */ }
}
```

- [ ] Créer `src/ui/WooWidget.ts`

### 6.8 — `src/tools/UITools.ts` — Tools IA → UI

Adapté de Shopify `UITools.ts` avec mapping WooCommerce :

```ts
// Mapping WooProduct → UIProduct (helpers)
function wooProductToUI(p: WooProduct): UIProduct {
  const price = formatWooPrice(p.prices.price, p.prices.currency_code);
  const compareAt = p.prices.regular_price !== p.prices.price
    ? formatWooPrice(p.prices.regular_price, p.prices.currency_code)
    : undefined;
  return {
    id: String(p.id),
    handle: p.slug,
    title: p.name,
    price,
    compareAtPrice: compareAt,
    imageUrl: p.images[0]?.src ?? '',
    description: p.short_description.replace(/<[^>]+>/g, ''),  // strip HTML
    available: p.is_in_stock,
    variants: p.variations?.map((v) => ({
      id: String(v.id),
      title: v.attributes.map((a) => a.value ?? a.name).join(' / '),
      available: true,
      price,
    })),
  };
}

// Mapping WooCartItem → UICartItem
function wooCartItemToUI(item: WooCartItem): UICartItem {
  return {
    id: item.key,
    title: item.name,
    price: formatWooPrice(item.prices.price, item.prices.currency_code),
    imageUrl: (item as any).images?.[0]?.src ?? '',
    quantity: item.quantity,
  };
}
```

**Tools à enregistrer :**

| Tool | Event émis | Paramètres |
|------|-----------|------------|
| `show_products` | `owllayer:ui:show_products` | `query?: string`, `product_ids?: string[]` |
| `show_product_detail` | `owllayer:ui:show_product_detail` | `product_id: string` (required) |
| `show_cart` | `owllayer:ui:show_cart` | — |
| `show_notification` | `owllayer:ui:show_notification` | `message: string`, `variant?: string` |
| `show_upsell` | `owllayer:ui:show_upsell` | `product_id: string`, `reason: string` |
| `close_panel` | `owllayer:ui:close_panel` | — |

**Note :** Les UITools WooCommerce n'ont pas de `MOCK_PRODUCTS` — les produits sont passés directement via le contexte (`window.__woo_context__?.product`) ou via les tools ProductTools qui ont déjà cherché les produits. La `show_products` reçoit les produits via `product_ids` (IDs déjà connus) ou affiche un message "Aucun produit" si query sans résultats.

- [ ] Créer `src/tools/UITools.ts`

### 6.9 — Mise à jour `src/OwlLayerWoo.ts`

```ts
import { WooWidget } from './ui/WooWidget.js';
import { registerUITools } from './tools/UITools.js';

export const OwlLayerWoo = {
  async init(config: OwlLayerWooConfig): Promise<void> {
    // ... (Sprints 1-4 inchangés) ...

    // Sprint 6 Bloc A — Chat Widget UI
    const bridge: OwlLayerBridge = {
      startVoice: () => OwlLayer.startVoice?.(),
      stopVoice: () => OwlLayer.stopVoice?.(),
      muteMic: () => OwlLayer.muteMic?.(),
      sendText: (text: string) => OwlLayer.sendMessage?.(text),
      onAgentStateChange: (cb) => OwlLayer.onStateChange?.(cb) ?? (() => {}),
      onResponse: (cb) => OwlLayer.onResponse?.(cb) ?? (() => {}),
    };

    if (typeof document !== 'undefined') {
      const widget = new WooWidget(bridge);
      widget.mount();
    }

    registerUITools(OwlLayer);

    // Sprint 6 Bloc B — PaymentWidget (conditionnel)
    if (config.features?.inChatPayments) {
      const { WooPaymentWidget } = await import('./ui/payment/WooPaymentWidget.js');
      const { registerPaymentTools } = await import('./tools/PaymentTools.js');
      const payWidget = new WooPaymentWidget(api, config);
      if (typeof document !== 'undefined') payWidget.mount();
      registerPaymentTools(OwlLayer, payWidget);
    }
  },
};
```

- [ ] Mettre à jour `src/OwlLayerWoo.ts`

---

## Tâches — Bloc B : WooPaymentWidget

### 6.10 — `src/ui/payment/types.ts` — Types PaymentWidget

```ts
export interface AddressData {
  first_name: string; last_name: string;
  email: string; phone: string;
  address_1: string; address_2?: string;
  city: string; postcode: string; country: string;
  state?: string;
}

export interface WooShippingRate {
  rate_id: string;
  name: string;
  price: string;       // formaté
  currency_code: string;
  instance_id: number;
}

export type PaymentMethod = 'stripe' | 'paypal' | 'redirect';

export interface CheckoutState {
  step: 1 | 2 | 3 | 4 | 5;
  billingAddress: Partial<AddressData>;
  shippingAddress: Partial<AddressData>;
  sameAsShipping: boolean;
  availableRates: WooShippingRate[];
  selectedRate: WooShippingRate | null;
  promoCode: string;
  promoApplied: boolean;
  promoDiscount: string;
  selectedPayment: PaymentMethod | null;
  loading: boolean;
  error: string | null;
}
```

- [ ] Créer `src/ui/payment/types.ts`

### 6.11 — `src/ui/payment/payment-styles.ts` — CSS Modal

```ts
export const PAYMENT_CSS = `
/* Modal backdrop + animation */
.backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); z-index:2147483645; }
.modal { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:2147483647;
  background:#0b1220; border:1px solid #1e293b; border-radius:16px;
  width:min(560px, 95vw); max-height:90vh; overflow-y:auto;
  box-shadow:0 25px 60px rgba(0,0,0,0.5); animation:modal-in 0.25s ease both; }
@keyframes modal-in {
  from { opacity:0; transform:translate(-50%,-50%) scale(0.96); }
  to   { opacity:1; transform:translate(-50%,-50%) scale(1); }
}
/* Steps stepper */
.stepper { display:flex; gap:8px; padding:16px 24px; border-bottom:1px solid #1e293b; }
.step-dot { width:28px; height:28px; border-radius:50%; border:2px solid #334155;
  display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700;
  color:#64748b; transition:all 0.2s; }
.step-dot.active { border-color:#6366f1; background:#6366f1; color:#fff; }
.step-dot.done { border-color:#22c55e; background:#22c55e; color:#fff; }
/* Form inputs */
.form-group { display:flex; flex-direction:column; gap:4px; margin-bottom:12px; }
.form-label { font-size:12px; color:#94a3b8; font-weight:500; }
.form-input { background:#1e293b; border:1px solid #334155; border-radius:8px;
  padding:10px 14px; color:#e2e8f0; font-size:14px; outline:none; transition:border-color 0.2s; }
.form-input:focus { border-color:#6366f1; }
/* Shipping rate cards */
.rate-card { border:2px solid #1e293b; border-radius:10px; padding:12px 16px; cursor:pointer;
  transition:all 0.15s; display:flex; align-items:center; gap:12px; margin-bottom:8px; }
.rate-card.selected { border-color:#6366f1; background:#1e1b4b; }
/* Payment buttons */
.pay-btn { width:100%; padding:14px; border-radius:10px; font-size:15px; font-weight:700;
  cursor:pointer; border:none; transition:all 0.2s; }
.pay-btn-stripe { background:linear-gradient(135deg,#6366f1,#4f46e5); color:#fff; }
.pay-btn-paypal { background:#f0b429; color:#1a1a1a; }
.pay-btn-redirect { background:#334155; color:#e2e8f0; }
`;
```

- [ ] Créer `src/ui/payment/payment-styles.ts`

### 6.12 — Steps (`src/ui/payment/steps/`)

#### `OrderSummary.tsx` — Step 1

Affiche les items du panier WooCommerce + totaux. Les données viennent de l'API au montage.

```tsx
// Appel GET /cart pour récupérer items + totals + coupons
// Affiche : nom, quantité, prix, image (si disponible)
// Affiche : sous-total, frais livraison (si sélectionnés), remise coupon, total
```

- [ ] Créer `src/ui/payment/steps/OrderSummary.tsx`

#### `AddressForm.tsx` — Step 2

Formulaire adresse facturation + livraison. Si le client est connecté (données dans `WooContextBuilder`), pré-remplir depuis le contexte.

```tsx
// Champs : first_name, last_name, email, phone, address_1, address_2, city, postcode, country
// Toggle "Adresse de livraison identique à la facturation" (coché par défaut)
// Validation avant avancer : tous les champs requis non vides + email valide
// À la validation : PUT /checkout avec billingAddress (+ shippingAddress si différent)
// ⚠️ PUT /checkout WC Blocks : objet complet obligatoire (pas de champ individuel)
```

- [ ] Créer `src/ui/payment/steps/AddressForm.tsx`

#### `ShippingRates.tsx` — Step 3

```tsx
// GET /cart → shipping_rates[] (tableau par package)
// Endpoint WC Store API : /wp-json/wc/store/v1/cart
// shipping_rates[0].shipping_rates[] → liste des méthodes disponibles
// Si aucun taux disponible (pas d'adresse ou WC config) : message "Livraison calculée à la commande" + bouton suivant
// Sélection → POST /cart/select-shipping-rate { package_id, rate_id }
```

- [ ] Créer `src/ui/payment/steps/ShippingRates.tsx`

#### `PromoCode.tsx` — Step 4

```tsx
// Input code promo + bouton "Appliquer"
// Appel POST /cart/coupons { code } (même endpoint que CartTools.apply_coupon)
// Si succès : afficher la remise, passer au step 5
// Si erreur (coupon invalide/expiré) : message d'erreur inline
// Bouton "Passer" si pas de code promo
```

- [ ] Créer `src/ui/payment/steps/PromoCode.tsx`

#### `PaymentMethods.tsx` — Step 5

```tsx
// Gateway detection depuis config (passé par plugin PHP via owllayer_config.features)
// Options affichées selon disponibilité :
//   - "Payer par carte" → Stripe Elements (stripe.js chargé dynamiquement depuis CDN)
//   - "PayPal" → PayPal Smart Buttons (paypal.js chargé dynamiquement)
//   - "Finaliser sur le site" → redirect window.location.href = '/checkout' (fallback toujours présent)
//
// Stripe flow :
//   1. Charger dynamiquement https://js.stripe.com/v3/ si stripeKey présent dans config
//   2. stripe.elements() → monter CardElement dans un div du Shadow DOM
//   3. stripe.createPaymentMethod() → paymentMethodId
//   4. POST /checkout { payment_data: { stripe_payment_method_id: pm.id } }
//
// PayPal flow :
//   1. Charger dynamiquement https://www.paypal.com/sdk/js?client-id={clientId}
//   2. paypal.Buttons({ createOrder: ..., onApprove: ... }).render('#paypal-container')
//   3. onApprove → POST /checkout { payment_data: { paypal_order_id: orderId } }
//
// MVP : si stripeKey et paypalClientId absents → afficher seulement "Finaliser sur le site"
```

⚠️ **Sécurité** : Le JS Stripe/PayPal est chargé dynamiquement depuis les domaines officiels (js.stripe.com, paypal.com). OwlLayer ne touche jamais les données de carte brutes — toujours via les SDKs tiers.

- [ ] Créer `src/ui/payment/steps/PaymentMethods.tsx`

### 6.13 — `WooPaymentWidgetApp.tsx` + `WooPaymentWidget.ts`

#### `WooPaymentWidgetApp.tsx` — Machine d'état steps
```tsx
// state: CheckoutState (step 1..5, adresses, rates, promo, payment)
// Navigation : next() / prev() — validation avant avancer
// Chaque step reçoit state + dispatch action
// Communication avec StoreApiClient via props (api injecté)
```

#### `WooPaymentWidget.ts` — Shadow DOM Host (séparé du chat)
```ts
const PAY_HOST_ID = 'owllayer-woo-pay-host';

// Écoute window event 'owllayer:payment:open' → render/afficher la modale
// Écoute window event 'owllayer:payment:close' → unmount/masquer
// z-index: 2147483647 (au-dessus de tout)
```

- [ ] Créer `src/ui/payment/WooPaymentWidgetApp.tsx`
- [ ] Créer `src/ui/payment/WooPaymentWidget.ts`

### 6.14 — `src/tools/PaymentTools.ts` — Tool `initiate_checkout_modal`

```ts
export function registerPaymentTools(owllayer: unknown, widget: WooPaymentWidget): void {
  const d = owllayer as OwlLayerInstance;
  d.registerTool('initiate_checkout_modal', {
    description: 'Ouvre la modale de paiement in-chat WooCommerce. Vérifie que le panier est non vide avant d\'ouvrir.',
    risk: 'high',
    parameters: { type: 'object', properties: {} },
    handler: async () => {
      const cart = await api.get<{ items_count: number }>('/cart');
      if (!cart.items_count || cart.items_count === 0) {
        return { success: false, error: 'Panier vide.' };
      }
      window.dispatchEvent(new CustomEvent('owllayer:payment:open'));
      return { success: true };
    },
  });
}
```

- [ ] Créer `src/tools/PaymentTools.ts`

### 6.15 — Plugin PHP — champs gateway

Ajouter dans `class-admin-settings.php` :
```php
// Nouveaux champs dans la section "Fonctionnalités"
owllayer_add_settings_field('stripe_publishable_key', 'Stripe Publishable Key', ...);
owllayer_add_settings_field('paypal_client_id', 'PayPal Client ID', ...);
```

Dans `owllayer-woocommerce.php` — passer dans la config JS :
```php
'features' => [
  // ... existants ...
  'stripeKey'       => esc_js($settings['stripe_publishable_key'] ?? ''),
  'paypalClientId'  => esc_js($settings['paypal_client_id'] ?? ''),
],
```

- [ ] Modifier `plugin/includes/class-admin-settings.php`
- [ ] Modifier `plugin/owllayer-woocommerce.php`

---

## Tests (Bloc A + B)

### Tests à créer

| Fichier test | Ce qu'il teste | Tests estimés |
|---|---|---|
| `WooWidget.test.ts` | mount (crée host + shadow), unmount (retire du DOM), double mount ignoré | 5 |
| `WooWidgetApp.test.ts` | render états (connecting/idle/open), panelView switch, toast, cart_updated event | 12 |
| `UITools.test.ts` | 6 tools → events CustomEvent dispatched correctement, mapping wooProductToUI, wooCartItemToUI | 15 |
| `WooPaymentWidget.test.ts` | mount/unmount, événement owllayer:payment:open ouvre modal, fermeture | 5 |
| `PaymentWidgetApp.test.ts` | navigation steps 1→5, validation step 2 (champs vides bloquent), promo applied | 10 |
| `PaymentTools.test.ts` | initiate_checkout_modal : panier vide → erreur, panier non-vide → event dispatché | 5 |

**Total estimé :** +52 tests → **188 tests**

### Commande
```bash
pnpm test  # doit passer tous les tests existants + nouveaux
node esbuild.config.mjs  # doit inclure les .tsx dans le bundle
```

---

## Critères de succès

- [ ] `pnpm install` sans erreur (Preact installé)
- [ ] `pnpm test` : 188+ tests ✓ (136 existants + ~52 nouveaux)
- [ ] `node esbuild.config.mjs` : bundle `.tsx` compilé sans erreur, taille raisonnable (ESM < 100 KB, IIFE < 300 KB)
- [ ] `features.inChatPayments: false` (ou absent) → `initiate_checkout` Sprint 4 inchangé, pas de WooPaymentWidget monté
- [ ] `features.inChatPayments: true` → modale WooPaymentWidget s'ouvre sur `initiate_checkout_modal`
- [ ] Shadow DOM isolé chat + Shadow DOM isolé paiement (0 fuite CSS)
- [ ] Mapping `WooProduct → UIProduct` correct (prix en €, images, is_in_stock)
- [ ] Mapping `WooCartItem → UICartItem` correct
- [ ] PaymentMethods MVP : si pas `stripeKey` et pas `paypalClientId` → bouton "Finaliser sur le site" uniquement
- [ ] Plugin PHP : champs stripeKey/paypalClientId en admin + passés en config JS
- [ ] `plugin/assets/owllayer-woocommerce.min.js` mis à jour par build

---

## Rétrocompatibilité garantie

| Config | Comportement |
|--------|-------------|
| `features.inChatPayments` absent ou `false` | Widget chat actif, `initiate_checkout` = redirection (Sprint 4) |
| `features.inChatPayments: true` sans `stripeKey`/`paypalClientId` | WooPaymentWidget actif, step 5 = redirect `/checkout` uniquement |
| `features.inChatPayments: true` avec `stripeKey` | WooPaymentWidget actif, step 5 = Stripe Elements + redirect |
| `features.inChatPayments: true` avec `paypalClientId` | WooPaymentWidget actif, step 5 = PayPal + redirect |
