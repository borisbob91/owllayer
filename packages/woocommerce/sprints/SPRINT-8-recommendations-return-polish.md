# @domos/woocommerce — Sprint 8
## Recommandations · Retours · select_variant · Public API Polish

**Durée estimée :** 4-5 jours  
**Branche :** `feat/woo-sprint-8`  
**Dépendance :** Sprint 7 ✅ (Store Connect, REST API PHP, storeIdentity)  
**Référence CDC :**
- `DomOS_CDC_Shopify_WooCommerce.md` §7.3 (tools natifs), §9.2 CU-W02 (retour produit)
- `DomOS_CDC_Shopify_WooCommerce.md` §3.6 / §7 Recommandations personnalisées

---

## Analyse des gaps résiduels (post Sprint 7)

### Gaps `DomOSWooConfig` non couverts par Sprints 1-7

| Champ | Statut après Sprint 7 | Sprint 8 |
|---|---|---|
| `apiKey` | ✅ Sprint 1 | — |
| `endpoint` | ✅ Sprint 1 | — |
| `nonce` | ✅ Sprint 1 | — |
| `storeApiBase` | ✅ Sprint 1 | — |
| `features.orderTracking` | ✅ Sprint 4 | — |
| `features.inChatPayments` | ✅ Sprint 6 | — |
| `features.paymentGateway` | ✅ Sprint 6 | — |
| `stripeKey` | ✅ Sprint 6 (type + PHP) | — |
| `paypalClientId` | ✅ Sprint 6 (type + PHP) | — |
| `shopId` | ✅ Sprint 7 | — |
| `siteUrl` | ✅ Sprint 7 (auto-détecté) | — |
| `features.productRecommendations` | ❌ **Manquant** | **8.1** |
| `features.storeConnect` | ✅ Sprint 7 | — |

> **Note sur `storeUrl` vs `apiKey` :** `storeUrl` n'existe pas dans `DomOSWooConfig` et ne doit pas exister.
> - `apiKey` = clé DomOS Cloud (authentification WebSocket)
> - La store URL WooCommerce est auto-détectée côté PHP (`get_home_url()`) et passée comme `siteUrl` en Sprint 7
> - Les tests qui utilisaient `storeUrl` sont incorrects → corriger en `apiKey`

### Tools manquants vs CDC §7.3

| Tool | CDC §7.3 / Shopify équivalent | Sprint |
|---|---|---|
| `show_products`, `show_cart`... (UITools ×6) | ✅ Sprint 6 | — |
| `initiate_checkout_modal` | ✅ Sprint 6 | — |
| `select_variant` | §3.3 Shopify — `select_variant` DOM update | **8.2** |
| `initiate_return` | §9.2 CU-W02 — high risk | **8.3** |
| `get_recommendations` | §7.3/§3.6 — `features.productRecommendations` | **8.4** |

---

## Tâches Sprint 8

### 8.1 — `features.productRecommendations` — type + activation

#### `src/types.ts` — ajout dans `WooFeatures`

```ts
export interface WooFeatures {
  inChatPayments?: boolean;
  paymentGateway?: 'stripe' | 'paypal' | 'auto';
  orderTracking?: boolean;
  storeConnect?: boolean;       // Sprint 7
  /** Active les recommandations personnalisées basées sur l'historique de navigation */
  productRecommendations?: boolean;  // ← AJOUT Sprint 8
}
```

#### `src/DomOSWoo.ts` — enregistrement conditionnel

```ts
// Sprint 8 — Recommandations (conditionnel)
if (config.features?.productRecommendations) {
  const { registerRecommendationTools } = await import('./tools/RecommendationTools.js');
  registerRecommendationTools(DomOS, apiClient);
}
```

#### Plugin PHP — ajout champ admin

```php
// class-admin-settings.php — section "Fonctionnalités"
add_settings_field('product_recommendations', __('Recommandations personnalisées', 'domos-woocommerce'), ...);
// Si coché → features.productRecommendations = true dans config JS
```

- [ ] Mettre à jour `src/types.ts`
- [ ] Mettre à jour `src/DomOSWoo.ts`
- [ ] Mettre à jour `plugin/includes/class-admin-settings.php`
- [ ] Mettre à jour `plugin/domos-woocommerce.php`

### 8.2 — Tool `select_variant` — Sélection de variation WooCommerce

Équivalent de `select_variant` dans Shopify (§3.3). WooCommerce gère les variantes via des attributs : taille, couleur, etc.

#### Source API
- Page produit variable WC : le DOM contient des `<select>` ou `<input>` pour chaque attribut
- Store API : `/products/{id}` → `variations[]` + `attributes[]`
- Pas d'API Store pour "changer la variation en cours" — passage par DOM obligatoire

#### Fichier : `src/tools/ProductTools.ts` — ajout `select_variant`

```ts
d.registerTool('select_variant', {
  description:
    "Sélectionne une variation de produit WooCommerce (taille, couleur, etc.) en mettant à jour les sélecteurs du DOM. " +
    "À utiliser sur une page produit variable pour pré-sélectionner une variante avant l'ajout au panier.",
  risk: 'none',
  parameters: {
    type: 'object',
    required: ['attribute', 'value'],
    properties: {
      attribute: {
        type: 'string',
        description: "Nom de l'attribut à sélectionner (ex: 'pa_color', 'pa_size', 'Taille', 'Couleur').",
      },
      value: {
        type: 'string',
        description: "Valeur de l'attribut à sélectionner (ex: 'rouge', 'L', 'XL').",
      },
    },
  },
  handler: (params: { attribute: string; value: string }) => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'DOM non disponible' };
    }

    // WooCommerce Classic: sélecteur <select name="attribute_pa_color">
    const normalizedAttr = params.attribute.toLowerCase().startsWith('pa_')
      ? params.attribute.toLowerCase()
      : `pa_${params.attribute.toLowerCase()}`;

    const selectors = [
      `select[name="attribute_${normalizedAttr}"]`,       // WC Classic taxonomy attribute
      `select[name="attribute_${params.attribute}"]`,      // WC Classic custom attribute
      `.variations select[data-attribute_name="attribute_${normalizedAttr}"]`,
    ];

    for (const selector of selectors) {
      const el = document.querySelector<HTMLSelectElement>(selector);
      if (el) {
        // Find matching option (case-insensitive)
        const option = Array.from(el.options).find(
          (o) => o.value.toLowerCase() === params.value.toLowerCase()
                  || o.text.toLowerCase() === params.value.toLowerCase(),
        );
        if (option) {
          el.value = option.value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return {
            success: true,
            attribute: params.attribute,
            selected: option.value,
            label: option.text,
            mode: 'classic',
          };
        }
        return {
          success: false,
          error: `Valeur "${params.value}" introuvable pour l'attribut "${params.attribute}". Options disponibles : ${Array.from(el.options).map(o => o.text).filter(Boolean).join(', ')}`,
        };
      }
    }

    return {
      success: false,
      error: `Attribut "${params.attribute}" introuvable sur cette page. Vérifier que vous êtes sur une page produit variable.`,
    };
  },
});
```

**Tests `select_variant` :**
- Sélecteur trouvé + option matchée → `success: true`, `mode: 'classic'`, `dispatchEvent` appelé
- Sélecteur trouvé + valeur absente → `success: false` + message avec options disponibles
- Sélecteur introuvable → `success: false` + message
- DOM indisponible (SSR) → `success: false`
- Matching case-insensitive (`'rouge'` = `'Rouge'`)

- [ ] Ajouter `select_variant` dans `src/tools/ProductTools.ts`
- [ ] Créer tests dans `ProductTools.test.ts`

### 8.3 — Tool `initiate_return` — Retour produit (CDC §9.2 CU-W02)

Scénario CDC :
> L'agent guide le client dans la procédure de retour WooCommerce. Le client mentionne une commande à retourner, l'agent récupère le statut et propose d'initier un retour.

**risk: high** — action irréversible (du point de vue utilisateur) → HITL obligatoire.

#### Fichier : `src/tools/OrderTools.ts` — ajout `initiate_return`

```ts
d.registerTool('initiate_return', {
  description:
    "Initie une procédure de retour pour une commande WooCommerce. " +
    "Vérifie l'éligibilité au retour (commande livrée, dans le délai de retour) et redirige l'utilisateur vers la page de gestion de commande.",
  risk: 'high',
  parameters: {
    type: 'object',
    required: ['order_id'],
    properties: {
      order_id: {
        type: 'number',
        description: 'ID numérique de la commande à retourner.',
      },
      reason: {
        type: 'string',
        description: "Raison du retour (défaut, non-conforme, changement d'avis, etc.).",
      },
    },
  },
  handler: async (params: { order_id: number; reason?: string }) => {
    // Vérifier le statut de la commande via Store API
    try {
      const order = await api.get<{
        id: number;
        status: string;
        billing: { email: string };
        date_created: string;
      }>(`/order/${params.order_id}`);

      // Statuts éligibles au retour WooCommerce : completed, processing (selon politique boutique)
      const eligibleStatuses = ['completed', 'processing'];
      if (!eligibleStatuses.includes(order.status)) {
        return {
          success: false,
          reason: `Commande #${params.order_id} en statut "${order.status}" — non éligible au retour.`,
        };
      }

      // Redirection vers la page de gestion de commande WooCommerce
      const returnUrl = `/my-account/view-order/${params.order_id}/`;
      if (typeof window !== 'undefined') {
        window.location.href = returnUrl;
      }

      return {
        success: true,
        order_id: params.order_id,
        redirecting: true,
        returnUrl,
        reason: params.reason ?? '',
        message: `Redirection vers la gestion de la commande #${params.order_id}. Utilisez le formulaire de retour pour finaliser votre demande.`,
      };
    } catch {
      return {
        success: false,
        error: `Commande #${params.order_id} introuvable ou accès refusé.`,
      };
    }
  },
});
```

**Note :** WooCommerce ne propose pas d'endpoint Store API pour créer un retour (RMA) directement. La procédure standard est une redirection vers `/my-account/view-order/{id}/`. Pour une intégration LMS complète, il faudrait un plugin WooCommerce RMA (ex: WooCommerce Return & Warranty Manager) — hors scope MVP.

**Tests `initiate_return` :**
- Commande status `completed` → `success: true`, redirect
- Commande status `pending` → `success: false` + message éligibilité
- API error (404) → `success: false` + message générique
- `risk: 'high'` vérifié dans la définition du tool

- [ ] Ajouter `initiate_return` dans `src/tools/OrderTools.ts`
- [ ] Créer tests `initiate_return` dans `OrderTools.test.ts`

### 8.4 — `src/tools/RecommendationTools.ts` — Recommandations (CDC §7.3)

#### Contexte
La CDC §3.6 et §7.3 définit des recommandations basées sur :
- Le produit actuellement consulté (contexte WooContextBuilder → `product.id`)
- Les catégories vues en session
- (Futur) L'historique client mémorisé par DomosAgent

#### Implémentation WooCommerce — via Store API `/products`

WooCommerce n'a pas d'API de recommandations native. On utilise des proxies :
- Produits de la même catégorie que le produit actuel
- Produits en promotion (`on_sale: true`)
- Produits liés/suggestions (WC REST API v3, pas Store API)

```ts
// src/tools/RecommendationTools.ts

export function registerRecommendationTools(
  domos: unknown,
  api: StoreApiClient,
): void {
  const d = domos as DomOSInstance;

  d.registerTool('get_recommendations', {
    description:
      "Retourne des recommandations de produits pertinentes basées sur le contexte actuel de navigation. " +
      "Si l'utilisateur est sur une page produit, retourne des produits similaires (même catégorie). " +
      "Sinon, retourne les produits en promotion ou les plus vendus.",
    risk: 'none',
    parameters: {
      type: 'object',
      properties: {
        context: {
          type: 'string',
          enum: ['related', 'on_sale', 'upsell'],
          description: "Type de recommandation : 'related' (même catégorie), 'on_sale' (promotions), 'upsell' (produits complémentaires).",
        },
        limit: {
          type: 'number',
          description: 'Nombre de recommandations (défaut : 4, max : 8).',
        },
      },
    },
    handler: async (params: { context?: string; limit?: number }) => {
      const limit = Math.min(params.limit ?? 4, 8);
      const context = params.context ?? 'related';

      // Lire le contexte WooCommerce injecté par le plugin PHP
      const wooCtx = (() => {
        try {
          const el = document.getElementById('domos-woo-context');
          return el ? JSON.parse(el.textContent ?? '{}') : {};
        } catch { return {}; }
      })();

      let queryParams: Record<string, string | number> = { per_page: limit };

      if (context === 'related' && wooCtx.product?.categories?.[0]?.id) {
        // Produits de la même catégorie
        queryParams = { ...queryParams, category: wooCtx.product.categories[0].id };
      } else if (context === 'on_sale') {
        // Produits en promotion
        queryParams = { ...queryParams, on_sale: 1 };
      }
      // 'upsell' : même logique que 'related' sans filtre catégorie (top produits)

      const products = await api.get<WooProduct[]>('/products', queryParams);

      // Filtrer le produit actuel pour ne pas recommander ce qu'on consulte déjà
      const currentId = wooCtx.product?.id;
      const filtered = products
        .filter((p: WooProduct) => p.id !== currentId && p.is_in_stock)
        .slice(0, limit);

      if (filtered.length === 0) {
        return { success: true, products: [], message: 'Aucune recommandation disponible pour le moment.' };
      }

      // Dispatch UI event pour afficher les recommandations dans le widget
      window.dispatchEvent(new CustomEvent('domos:ui:show_products', {
        detail: {
          products: filtered.map(wooProductToUI),
          query: context === 'on_sale' ? '🏷️ Offres spéciales' : '💡 Pour vous',
        },
      }));

      return {
        success: true,
        count: filtered.length,
        context,
        products: filtered.map((p: WooProduct) => ({ id: p.id, name: p.name })),
      };
    },
  });
}
```

**Note :** `wooProductToUI` doit être partagé — extraire dans `src/ui/helpers.ts` (helper commun entre UITools et RecommendationTools).

- [ ] Créer `src/tools/RecommendationTools.ts`
- [ ] Extraire `wooProductToUI` + `wooCartItemToUI` dans `src/ui/helpers.ts` (refactor depuis UITools.ts)
- [ ] Créer tests `RecommendationTools.test.ts`

---

## 8.5 — Mise à jour `src/types.ts` — Consolidation complète

Ajouter tous les champs manquants identifiés lors du gap analysis :

```ts
export interface WooFeatures {
  inChatPayments?: boolean;
  paymentGateway?: 'stripe' | 'paypal' | 'auto';
  orderTracking?: boolean;
  storeConnect?: boolean;
  /** Active les recommandations personnalisées (Sprint 8) */
  productRecommendations?: boolean;
}

export interface DomOSWooConfig {
  /** DomOS Cloud API key — format: pk_(live|dev)_woo_{hash}_{random} après Store Connect, ou clé legacy */
  apiKey: string;
  /** DomOS WebSocket endpoint — defaults to wss://cloud.domos.dev/domos */
  endpoint?: string;
  /** WooCommerce Store API base URL — defaults to /wp-json/wc/store/v1 */
  storeApiBase?: string;
  /** WordPress nonce for authenticated Store API requests (wp_create_nonce('wc_store_api')) */
  nonce?: string;
  /**
   * Stripe Publishable Key — enables Stripe Elements in WooPaymentWidget.
   * Set via plugin admin Settings > DomOS > Fonctionnalités > Stripe Key.
   * Sprint 6.
   */
  stripeKey?: string;
  /**
   * PayPal Client ID — enables PayPal Smart Buttons in WooPaymentWidget.
   * Set via plugin admin Settings > DomOS > Fonctionnalités > PayPal Client ID.
   * Sprint 6.
   */
  paypalClientId?: string;
  /**
   * Shop ID UUID — assigned by DomOS Cloud after Store Connect (wc-auth).
   * Injected automatically by plugin PHP after connection.
   * Sprint 7.
   */
  shopId?: string;
  /**
   * Store canonical URL — injected by PHP plugin via get_home_url().
   * Used for Store Connect identity validation.
   * Sprint 7.
   */
  siteUrl?: string;
  features?: WooFeatures;
  widget?: {
    agentName?: string;
    agentTitle?: string;
    mode?: 'text' | 'voice';
  };
}
```

- [ ] Mettre à jour `src/types.ts` avec les champs `stripeKey`, `paypalClientId`, `shopId`, `siteUrl` et `features.productRecommendations`

---

## 8.6 — Public API polish — `DomOSWoo` exports

Compléter les exports publics du package pour que les intégrateurs avancés puissent interagir avec le SDK :

```ts
// src/index.ts — exports Sprint 8
export { DomOSWoo } from './DomOSWoo.js';
export type {
  DomOSWooConfig,
  WooFeatures,
  WooCart,
  WooCartItem,
  WooProduct,
  WooProductVariation,
  WooProductCategory,
} from './types.js';
// Sprint 7
export { resolveSiteUrl, validateApiKey } from './utils/storeIdentity.js';
export type { WooStoreStatus, WooStoreIdentity } from './types.js';
// Sprint 8
export type { WooStoreConnectConfig } from './types/store-connect.js';
```

**Helper public `DomOSWoo.version` :**
```ts
// src/DomOSWoo.ts — ajout
export const DomOSWoo = {
  /** Semver version du package */
  readonly version = '0.8.0',   // ← mis à jour à chaque sprint

  async init(config: DomOSWooConfig): Promise<void> { ... },
  getStoreStatus(): WooStoreStatus | null { ... },
};
```

- [ ] Mettre à jour `src/index.ts` avec tous les exports
- [ ] Ajouter `DomOSWoo.version` dans `src/DomOSWoo.ts`

---

## Tests Sprint 8

| Fichier test | Nouveau contenu | Tests estimés |
|---|---|---|
| `ProductTools.test.ts` | `select_variant` : sélecteur trouvé/absent, case-insensitive, dispatchEvent, DOM indisponible | +8 |
| `OrderTools.test.ts` | `initiate_return` : status completed→redirect, status pending→refus, 404→erreur, risk: high | +6 |
| `RecommendationTools.test.ts` | `get_recommendations` : context related/on_sale, filtre produit actuel, limit cap 8, aucun résultat | +10 |
| `types.test.ts` (nouveau) | Vérifier que `DomOSWooConfig` accepte tous les champs documentés sans erreur TS | +5 |

**Total estimé :** 208 (Sprint 7) + 29 = **~237 tests**

---

## Ordre d'implémentation

1. `src/types.ts` — ajout `stripeKey`, `paypalClientId`, `shopId`, `siteUrl`, `features.productRecommendations`
2. `src/tools/ProductTools.ts` — ajout `select_variant`
3. `src/tools/OrderTools.ts` — ajout `initiate_return`
4. `src/ui/helpers.ts` — extraire `wooProductToUI` + `wooCartItemToUI` (utilisés par UITools + RecommendationTools)
5. `src/tools/RecommendationTools.ts` — nouveau fichier
6. `src/DomOSWoo.ts` — conditionnel `productRecommendations` + `version`
7. `plugin/includes/class-admin-settings.php` — champ `product_recommendations`
8. `plugin/domos-woocommerce.php` — passer `features.productRecommendations`, `stripeKey`, `paypalClientId` dans la config JS (si absent des Sprints 6/7)
9. `src/index.ts` — exports complets
10. Tests (tous)
11. Commit

---

## Critères de succès

- [ ] `pnpm test` : 237+ tests ✓
- [ ] `select_variant` : `document.querySelector('select[name="attribute_pa_size"]').value === 'L'` + `change` event dispatché
- [ ] `select_variant` : valeur absente → `success: false` + message listé des options disponibles
- [ ] `initiate_return` : `risk: 'high'` dans la définition du tool (HITL obligatoire)
- [ ] `initiate_return` : commande `completed` → `redirecting: true` + `returnUrl: '/my-account/view-order/{id}/'`
- [ ] `get_recommendations` : limit respecté (max 8)
- [ ] `get_recommendations` : produit courant exclu des recommandations
- [ ] `get_recommendations` : dispatche `domos:ui:show_products` (widget affiche les résultats)
- [ ] `DomOSWooConfig` accepte `stripeKey`, `paypalClientId`, `shopId`, `siteUrl` sans erreur TS
- [ ] `DomOSWoo.version` retourne `'0.8.0'`
- [ ] Tous exports dans `src/index.ts` disponibles pour les intégrateurs

---

## Récapitulatif Roadmap complète @domos/woocommerce

| Sprint | Contenu | Tests | Commit |
|--------|---------|-------|--------|
| 1 | Setup + Context + DomOS.init | 55 | `8e3b576` |
| 2 | CartTools (6 tools) + CartContextSync | 80 | `2960119` |
| 3 | ProductTools (4 tools) + types WooProduct | 111 | `9a1b586` |
| 4 | CheckoutTools + OrderTools + fix Cart endpoints | 136 | `8e563b2` |
| 5 | Plugin PHP + README + build copy step | 136 | `6d4cffb` |
| 6 | WooWidget UI (Shadow DOM) + WooPaymentWidget | ~188 | — |
| 7 | Store Connect + REST API PHP + storeIdentity | ~208 | — |
| **8** | **select_variant + initiate_return + recommandations + types complets** | **~237** | — |
