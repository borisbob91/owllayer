# Rapport de recherche — Shopify APIs pour @owllayer/shopify

> Rédigé après audit complet des docs officielles Shopify (mars 2026)  
> Objectif : valider les choix d'implémentation actuels et identifier les ajustements nécessaires avant Sprint 2–5

---

## 1. Résumé exécutif

**Notre architecture est correcte.** Les APIs choisies (Cart AJAX + Storefront GraphQL) sont les bonnes pour notre cas d'usage (SDK embarqué dans le thème). Un ajustement critique est à appliquer dès Sprint 2 : les **locale-aware URLs** (`window.Shopify.routes.root`). Le reste est validation.

Concernant l'Admin GraphQL API que tu as mentionnée : elle est **explicitement hors scope** pour nous — elle ne peut pas être appelée depuis le navigateur du client (token privé côté serveur requis). Elle n'est pas une option pour un SDK client-side.

---

## 2. Cartographie des APIs Shopify disponibles

| API | Côté | Auth | Notre usage |
|-----|------|------|-------------|
| **Cart AJAX API** | Client (thème) | Aucune | ✅ Sprint 2 — panier |
| **Storefront GraphQL API** | Client | Public token | ✅ Sprint 3 — produits |
| **Admin GraphQL API** | Serveur uniquement | Token privé OAuth | ❌ Interdit côté client |
| **Section Rendering API** | Client (thème) | Aucune | ➖ Non utilisé |
| **Web Pixels API** | Sandbox isolée | N/A | ❌ Non applicable |
| **Checkout MCP (UCP)** | Agent externe | JWT Bearer | ➖ Hors scope (voir §6) |
| **Catalog MCP (UCP)** | Agent externe | JWT Bearer | ➖ Hors scope (voir §6) |

---

## 3. Cart AJAX API — Validation ✅

### Statut
Toujours l'API standard recommandée pour les thèmes Shopify. Pas de dépréciation annoncée. Pas de token requis.

### Endpoints utilisés (Sprint 2)
```
GET  /cart.js                          → état complet du panier
POST /cart/add.js   { items: [...] }   → ajouter un ou plusieurs articles
POST /cart/change.js { id, quantity }  → modifier / supprimer (qty=0)
POST /cart/update.js { attributes }    → attributs du panier (notes, etc.)
```

### Headers requis sur tous les POST
```
Content-Type: application/json
X-Requested-With: XMLHttpRequest
```

### Format de réponse confirmé
```json
{
  "token": "...",
  "item_count": 2,
  "total_price": 9999,
  "currency": "EUR",
  "items": [
    {
      "id": 123456789,
      "variant_id": 123456789,
      "product_id": 987654321,
      "title": "Red T-Shirt - L",
      "quantity": 1,
      "price": 4999
    }
  ]
}
```
> **Note :** tous les montants sont en **centimes** → diviser par 100 systématiquement

---

## 4. ⚠️ Ajustement critique : Locale-aware URLs

### Problème
Notre code actuel utilise des chemins hardcodés :
```ts
fetch('/cart.js')        // ❌ casse sur les boutiques internationales
fetch('/cart/add.js')    // ❌
```

Sur les boutiques avec marchés/langues (`/fr/`, `/de/`, `/en-us/` etc.), Shopify génère des URL dynamiques préfixées. Les requêtes vers `/cart.js` sans préfixe retournent des réponses dans la langue par défaut et peuvent causer des incohérences de session panier.

### Solution officielle Shopify
Shopify expose `window.Shopify.routes.root` qui :
- Finit toujours par `/`
- Gère automatiquement tous les préfixes de langue/marché
- Est disponible sur toutes les pages d'un thème hébergé Shopify

### Correction à appliquer (Sprint 2 — dans tous les fetch panier)
```ts
// Avant (❌)
fetch('/cart.js')
fetch('/cart/add.js')
fetch('/cart/change.js')

// Après (✅)
const root = window.Shopify?.routes?.root ?? '/';
fetch(`${root}cart.js`)
fetch(`${root}cart/add.js`)
fetch(`${root}cart/change.js`)
```

### Fichiers impactés
| Fichier | Status |
|---------|--------|
| `src/context/CartContextSync.ts` | ⚠️ À corriger — `_fetchAndEmit()` ligne avec `/cart.js` |
| `src/tools/CartTools.ts` | ⚠️ À appliquer à l'implémentation Sprint 2 |
| `src/tools/CheckoutTools.ts` | ⚠️ À appliquer si checkout via cart permalink |

---

## 5. Storefront GraphQL API — Validation ✅

### Statut
Toujours la bonne API pour les queries produits client-side. Endpoint 2024-01 utilisé dans nos sprints — la version actuelle en production est **2026-01**, mais 2024-01 reste supportée.

> **Recommandation** : passer à `2026-01` dans `StorefrontClient.ts` dès Sprint 3 pour bénéficier des dernières features (notamment les filtres produits améliorés).

### Endpoint
```
POST https://{shopDomain}/api/2026-01/graphql.json
X-Shopify-Storefront-Access-Token: {storefrontToken}
Content-Type: application/json
```

### Ce que l'on peut faire avec (Sprint 3)
- Recherche produits avec filtres combinés (`product_type`, `tag`, `price`, `vendor`)
- Détail d'un produit par `handle` ou `id` avec variantes complètes
- Recommandations produits (`productRecommendations`)
- Collections avec produits paginés

### Limite importante
> 250 variantes maximum par produit via Ajax API (pas Storefront — Storefront n'a pas cette limite explicite mais paginer avec `first: 30` est la pratique courante)

---

## 6. Admin GraphQL API — Pourquoi elle est hors scope

### Ce qu'elle permet
- Lecture/écriture complète de la boutique : produits, commandes, clients, inventaire, webhooks, métadonnées, etc.
- Endpoint : `https://{store}.myshopify.com/admin/api/2026-01/graphql.json`
- Header : `X-Shopify-Access-Token: {token_privé_OAuth}`

### Pourquoi on ne peut PAS l'utiliser
1. **Token privé** — le token Admin est un secret OAuth généré via App Installation. L'exposer dans le front-end serait une faille de sécurité critique (OWASP A02 — Cryptographic Failures).
2. **Pas accessible en cross-origin** — Shopify bloque les appels Admin API depuis un navigateur par design (CORS restreint aux apps installées côté serveur).
3. **Pas conçue pour ça** — elle est faite pour les apps backend (Node.js, Ruby, etc.) qui s'authentifient via OAuth.

### Ce que ça signifie pour nous
Les features qui nécessiteraient l'Admin API (webhooks, metafields avancés, gestion commandes admin, etc.) sont **repoussées à un eventuel backend OwlLayer proxy** — hors scope des sprints 1–5.

Pour le Sprint 4 (OrderTools), on utilise uniquement la **Storefront API** `orders` query — qui retourne les commandes du client authentifié avec son customer token, pas le token admin.

---

## 7. Shopify Agents & Universal Commerce Protocol (UCP) — Contexte

### Ce que Shopify a lancé (mars 2026)
Shopify a lancé un écosystème complet pour les **agents externes** (Claude, GPT, etc.) :
- **Catalog MCP Server** : recherche cross-marchands, discovery produits sur toute la plateforme Shopify
- **Checkout MCP Server** : `create_checkout`, `update_checkout`, `complete_checkout` via JWT
- **Universal Commerce Protocol (UCP)** : standard ouvert (ucp.dev) pour la communication agent ↔ marchand ↔ PSP

### Status-driven checkout flow (UCP)
```
create_checkout → incomplete → update_checkout → ready_for_complete → complete_checkout → completed
                                                                     ↓ requires_escalation
                                                              → redirect vers continue_url (Checkout Kit)
```

### Ce que ça n'est PAS
Ce n'est **pas en compétition** avec `@owllayer/shopify`. Le MCP Shopify cible les agents qui "shoppent" de l'extérieur sur n'importe quelle boutique Shopify. Nous ciblons l'assistant **embarqué dans le thème d'UNE boutique**, avec :
- Accès DOM direct
- HITL (Human-in-the-Loop)
- Contexte temps réel du visiteur
- Tools enregistrés dynamiquement selon la page

### Opportunité future (Post Sprint 5)
Il sera possible de faire un "pont" entre OwlLayer et le Checkout MCP Shopify : l'agent OwlLayer orchestre l'UX dans le thème, et délègue la finalisation checkout au MCP officiel Shopify si le marchand a une App Shopify côté backend. This is a Sprint 6+ concern.

---

## 8. Web Pixels API — Non applicable

La Web Pixels API de Shopify est confinée dans un **sandbox isolé** (WebWorker sécurisé). Elle ne partage pas le DOM ni le contexte JavaScript de la page. Elle ne peut pas communiquer avec notre SDK `@owllayer/browser`. Elle est uniquement destinée au tracking analytique (page_viewed, checkout_completed, etc.) via des pixels sandboxés.

**Conclusion** : aucun usage pour nous, aucune intégration à prévoir.

---

## 9. Section Rendering API — Non utilisé, pas nécessaire

Permets de récupérer le rendu HTML de sections Liquid via AJAX, sans rechargement de page. Utilise `window.Shopify.routes.root` pour les URLs locale-aware.

Notre SDK agit sur le DOM existant et ne re-render pas des sections Liquid. Non pertinent pour nos sprints actuels.

---

## 10. Détection des changements de panier — Analyse des stratégies

### Le problème
Shopify ne standardise **aucun événement DOM officiel** pour les mutations de panier sur le storefront. Les événements comme `cart:updated` sont des **conventions de thème**, pas des events Shopify natifs.

### Stratégie actuelle dans `CartContextSync.ts`
```ts
document.addEventListener('cart:updated', handler);   // Dawn, Debut, etc.
// + polling 30s
```

### Ce qui manque (Sprint 2 à compléter)
```ts
// Événement alternatif utilisé par certains thèmes premium
document.addEventListener('cart:refresh', handler);

// MutationObserver sur [data-cart-count] — fallback si aucun event
const observer = new MutationObserver(handler);
observer.observe(document.querySelector('[data-cart-count]'), { 
  attributes: true, 
  childList: true 
});

// Interception des fetch sortants — option avancée (voir §10.1)
```

### 10.1 Option avancée : Fetch Interception
Certains SDKs interceptent `window.fetch` pour détecter les appels vers `/cart/add.js`, `/cart/change.js` et déclencher une re-sync sans dépendre des événements thème. C'est la méthode la plus robuste mais aussi la plus invasive.

```ts
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const result = await originalFetch(input, init);
  const url = typeof input === 'string' ? input : input.url;
  if (url.includes('cart/add') || url.includes('cart/change')) {
    this._fetchAndEmit(); // re-sync après mutation panier tierce
  }
  return result;
};
```

> **Recommandation** : ne pas implémenter en Sprint 2 — l'approche événement + MutationObserver + polling couvre 95% des cas. L'interception fetch peut être ajoutée en Sprint 5 comme option feature-flag.

### Tableau de couverture par thème
| Thème | `cart:updated` | `cart:refresh` | `[data-cart-count]` | Polling |
|-------|:-:|:-:|:-:|:-:|
| Dawn (officiel Shopify) | ✅ | ❌ | ✅ | fallback |
| Debut (legacy) | ✅ | ❌ | ✅ | fallback |
| Turbo (Out of the Sandbox) | ✅ | ✅ | ✅ | fallback |
| Themes tiers variables | ⚠️ | ⚠️ | ⚠️ | ✅ garanti |

---

## 11. Checkout — Options disponibles (Sprint 4)

### Option A — Cart permalink (implémenté dans notre Sprint 4)
```
https://{domain}/cart/{variantId}:{qty}?discount={code}
```
- Redirige l'utilisateur vers le checkout Shopify natif
- Simple, toujours fonctionnel, aucun token requis
- Adapté à `initiate_checkout` avec `risk: 'high'` (HITL)

### Option B — Checkout MCP Shopify (UCP)
Nécessite une App Shopify côté backend pour l'auth JWT. Hors scope Sprint 4.

### Option C — Buy SDK Shopify (@shopify/buy-sdk)
SDK officiel Shopify pour créer des checkouts programmatiquement via Storefront API. Nécessite `storefrontToken`. Ajoute ~45KB de bundle. Overkill pour notre usage.

### Recommandation Sprint 4
Garder l'Option A (cart permalink) pour `initiate_checkout`. C'est la méthode validée par Shopify pour les thèmes, elle respecte toutes les règles de sécurité (le paiement se fait sur le domaine Shopify, jamais dans le DOM tiers).

```ts
// initiate_checkout handler
const root = window.Shopify?.routes?.root ?? '/';
const itemsPath = items.map(i => `${i.variantId}:${i.qty}`).join(',');
const discountParam = discountCode ? `?discount=${discountCode}` : '';
window.location.href = `${root}cart/${itemsPath}${discountParam}`;
```

---

## 12. Récapitulatif — Points de changement par sprint

### Sprint 2 (CartContextSync + CartTools)
| # | Fichier | Changement | Priorité |
|---|---------|-----------|----------|
| 1 | `CartContextSync.ts` | Remplacer `/cart.js` par `${root}cart.js` | **Bloquant** |
| 2 | `CartContextSync.ts` | Ajouter listener `cart:refresh` | Important |
| 3 | `CartContextSync.ts` | Ajouter MutationObserver sur `[data-cart-count]` | Important |
| 4 | `CartContextSync.ts` | Exposer `stop()` avec `observer.disconnect()` + `removeEventListener` | Important |
| 5 | `CartContextSync.ts` | Aligner format contexte cart sur spec Sprint 2 (`isEmpty`, `productIds`, `variantId`, etc.) | Important |
| 6 | `CartTools.ts` | Utiliser `${root}cart/add.js` etc. sur tous les endpoints | **Bloquant** |
| 7 | `CartTools.ts` | Implémenter les 4 tools (`add_to_cart`, `update_cart`, `remove_from_cart`, `get_cart`) | Core |

### Sprint 3 (ProductTools + StorefrontClient)
| # | Fichier | Changement | Priorité |
|---|---------|-----------|----------|
| 1 | `StorefrontClient.ts` | Passer à version API `2026-01` | Recommandé |
| 2 | `StorefrontClient.ts` | Ajouter `searchProducts()`, `getProduct()`, `getProductRecommendations()` | Core |
| 3 | `ProductTools.ts` | Implémenter `search_products`, `get_product`, `select_variant` | Core |
| 4 | `NavigationTools.ts` | Implémenter `navigate_to_product`, `navigate_to_collection` | Core |

### Sprint 4 (Checkout + Orders)
| # | Fichier | Changement | Priorité |
|---|---------|-----------|----------|
| 1 | `CheckoutTools.ts` | `initiate_checkout` via cart permalink + locale-aware URL | Core |
| 2 | `CheckoutTools.ts` | `apply_discount` via `/cart/update.js` attributes | Core |
| 3 | `OrderTools.ts` | `get_order_status` via Storefront API customer orders query | Core |
| 4 | `CustomerContext.ts` | Nouveau fichier — lecture du customer Shopify connecté | Core |

### Sprint 5 (Build + CDN)
| # | Fichier | Changement | Priorité |
|---|---------|-----------|----------|
| 1 | `esbuild.config.mjs` | Bundle autonome incluant `@owllayer/browser` | Core |
| 2 | `embed/blocks/owllayer-widget.liquid` | App Embed Block officiel | Core |
| 3 | `README.md` | Documentation d'installation et configuration | Core |

---

## 13. Règles de sécurité à respecter (OWASP)

| Règle | Implémentation |
|-------|---------------|
| Ne jamais exposer le `storefrontToken` dans des logs/erreurs | `StorefrontClient` : catch sans logguer le token |
| Ne jamais utiliser l'Admin API côté client | Aucune référence à `X-Shopify-Access-Token` côté browser |
| HITL obligatoire pour `initiate_checkout` (`risk: 'high'`) | Déjà prévu dans `OwlLayerShopify.ts` |
| Sanitizer les inputs des tools avant de les passer aux URLs | Encoder les handles/IDs avant interpolation URL |
| Pas de `any` TypeScript | Utiliser `unknown` + type guards partout |

---

## 14. Sources consultées

| Source | URL | Pertinence |
|--------|-----|-----------|
| Ajax API overview | `shopify.dev/docs/api/ajax` | ✅ Validation Cart AJAX |
| Admin GraphQL API | `shopify.dev/docs/api/admin-graphql/latest` | ❌ Hors scope client |
| Section Rendering API | `shopify.dev/docs/api/ajax/section-rendering` | ➖ Non utilisé |
| Web Pixels API | `shopify.dev/docs/api/web-pixels-api` | ❌ Sandbox isolée |
| DOM Events API | `shopify.dev/docs/api/web-pixels-api/dom-events` | ❌ Sandbox isolée |
| Shopify Agents / UCP | `shopify.dev/docs/agents` | ℹ️ Contexte futur |
| Checkout for agents | `shopify.dev/docs/agents/checkout` | ℹ️ Option B checkout |
| Auth agents | `shopify.dev/docs/agents/get-started/authentication` | ℹ️ Contexte futur |
