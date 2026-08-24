# @owllayer/shopify — Setup Guide

## Installation

Add the script to your `theme.liquid` (App Embed Block ou juste avant `</body>`) :

```html
<script src="https://cdn.owllayer.dev/shopify/owllayer-shopify.min.js"></script>
<script>
  OwlLayerShopify.init({
    apiKey: 'YOUR_OWLLAYER_API_KEY',
    storefrontToken: '{{ shop.metafields.owllayer.storefront_token }}',
    shopDomain: '{{ shop.permanent_domain }}',
  });
</script>
```

---

## Configuration complète

```js
OwlLayerShopify.init({
  // Requis
  apiKey: 'dk_live_xxxx',

  // Storefront API — nécessaire pour search_products, get_product, get_order_status
  storefrontToken: '{{ shop.metafields.owllayer.storefront_token }}',
  shopDomain: '{{ shop.permanent_domain }}',

  // Version API Storefront (défaut: '2026-01', fallback: '2024-01')
  storefrontApiVersion: '2026-01',

  // Endpoint WebSocket OwlLayer (défaut: wss://cloud.owllayer.dev/owllayer)
  endpoint: 'wss://cloud.owllayer.dev/owllayer',

  // Fonctionnalités optionnelles
  features: {
    orderTracking: true,        // Active get_order_status
    productRecommendations: true,
  },

  // Widget
  widget: {
    agentName: 'Léa',
    agentTitle: "Assistante boutique",
    mode: 'text', // 'text' | 'voice'
  },
});
```

---

## Suivi de commandes (optionnel)

Pour que `get_order_status` retourne les vraies données de commande (et non un lien vers le compte),
injectez le customer access token via Liquid dans `theme.liquid` :

```liquid
{% if customer %}
  <script>
    window.__owllayer_customer_token = {{ customer.access_token | json }};
  </script>
{% endif %}
```

Sans cette injection, `get_order_status` retournera un lien vers `/account/orders`.

---

## Outils disponibles

### Panier — Sprint 2
| Outil | Description | Risk |
|-------|-------------|------|
| `add_to_cart` | Ajoute un article au panier | `low` |
| `update_cart` | Met à jour la quantité d'un article | `low` |
| `remove_from_cart` | Retire un article du panier | `low` |
| `get_cart` | Retourne l'état actuel du panier | `none` |

### Produits — Sprint 3
| Outil | Description | Risk |
|-------|-------------|------|
| `search_products` | Recherche avec filtres (type, tag, prix) | `none` |
| `get_product` | Détails complets d'un produit + variantes | `none` |
| `select_variant` | Sélectionne une variante sur la page produit | `none` |
| `navigate_to_product` | Navigue vers une page produit | `none` |
| `navigate_to_collection` | Navigue vers une collection | `none` |

> `search_products` et `get_product` nécessitent `storefrontToken` + `shopDomain`.

### Checkout & Commandes — Sprint 4
| Outil | Description | Risk |
|-------|-------------|------|
| `initiate_checkout` | Redirige vers `/checkout` (confirme via HITL) | `high` |
| `apply_discount` | Applique un code promo et redirige vers le checkout | `none` |
| `get_order_status` | Statut des commandes du client connecté | `none` |

> `initiate_checkout` avec `risk: 'high'` affiche automatiquement un modal de confirmation avant exécution.  
> `get_order_status` nécessite l'injection du customer access token (voir section ci-dessus) ou `features.orderTracking: true`.

---

## Contexte injecté automatiquement

Au démarrage, OwlLayerShopify injecte dans le contexte de l'agent :

```ts
{
  shop: {
    name: string,
    currency: string,
    locale: string,
    domain: string,
  },
  customer: {
    isLoggedIn: boolean,
    id?: string,        // présent si connecté
  },
  cart: {
    itemCount: number,
    totalPrice: number,
    currency: string,
    items: ShopifyCartItem[],
  }
}
```

Le contexte panier est mis à jour en temps réel (événements `cart:updated`, `cart:refresh`, MutationObserver + polling).

---

## Versions API Storefront supportées

| Version | Statut |
|---------|--------|
| `2026-01` | ✅ Défaut |
| `2024-01` | ✅ Legacy opt-in |

Pour forcer la version legacy : `storefrontApiVersion: '2024-01'` dans la config.

---

## Thèmes compatibles (`select_variant`)

`select_variant` couvre 3 patterns DOM :

| Pattern | Thèmes |
|---------|--------|
| `select[name="id"]` | Debut, legacy themes |
| Radios + selects par option (`data-option`) | Dawn, Prestige, Impulse |
| `CustomEvent('variant:selected')` | Hydrogen, headless |

Pour les thèmes headless, écoutez l'événement côté thème :
```js
document.addEventListener('variant:selected', (e) => {
  const { variantId, options } = e.detail;
  // mettre à jour votre UI
});
```
