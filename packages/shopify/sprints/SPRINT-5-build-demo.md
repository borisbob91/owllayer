# @domos/shopify — Sprint 5
## Tests E2E + CDN Build + App Embed Block + Demo Shopify

**Durée estimée :** 4-5 jours  
**Branche :** `feat/shopify-sprint-5`  
**Dépendance :** Sprint 4 ✅

---

## Objectif

Le package est complet, testé, buildé pour CDN et déployable sur une vraie boutique Shopify via l'App Embed Block. Une boutique de démonstration publique est opérationnelle.

---

## Tâches

### 5.1 — Tests

- [ ] Tests unitaires : couvrir CartTools, ProductTools, CheckoutTools, OrderTools, ContextBuilder, CartContextSync
- [ ] Tests d'intégration : `DomOSShopify.init()` avec mocks Shopify DOM + fetch
- [ ] Vérifier que `pnpm test` passe dans `packages/shopify`

### 5.2 — Build CDN

- [ ] Finaliser `esbuild.config.mjs` :
  - `domos-shopify.bundle.mjs` (ESM, external: `@domos/browser`)
  - `domos-shopify.min.js` (IIFE, bundle complet avec `@domos/browser` inclus pour CDN autonome)
- [ ] Tester le bundle CDN sur une page HTML statique (sans bundler)
- [ ] Versionner correctement (`0.1.0`)

### 5.3 — App Embed Block (`embed/`)

Créer les fichiers Shopify App Embed Block :

**`embed/blocks/domos-widget.liquid`** :
```liquid
{% # DomOS App Embed Block — Shopify 2.0 %}
<script src="{{ 'domos-shopify.min.js' | asset_url }}" defer></script>
{% if product %}
<script id="domos-product-json" type="application/json">{{ product | json }}</script>
{% endif %}
{% if collection %}
<script id="domos-collection-json" type="application/json">{{ collection | json }}</script>
{% endif %}
<script>
  document.addEventListener('DOMContentLoaded', function() {
    DomOSShopify.init({
      apiKey: {{ block.settings.api_key | json }},
      storefrontToken: {{ block.settings.storefront_token | json }},
      shopDomain: {{ shop.permanent_domain | json }},
      widget: {
        agentName: {{ block.settings.agent_name | default: "Alex" | json }},
      }
    });
  });
</script>

{% schema %}
{
  "name": "DomOS Chat Widget",
  "target": "body",
  "settings": [
    { "type": "text", "id": "api_key", "label": "DomOS API Key" },
    { "type": "text", "id": "storefront_token", "label": "Shopify Storefront Token" },
    { "type": "text", "id": "agent_name", "label": "Agent Name", "default": "Alex" }
  ]
}
{% endschema %}
```

- [ ] Créer le fichier App Embed Block
- [ ] Tester sur une boutique dev Shopify Partner (Shopify CLI ou manual)

### 5.4 — Demo Shopify

- [ ] Créer une boutique Shopify Partner de démonstration
- [ ] Installer le snippet sur le thème Dawn
- [ ] Documenter le scénario de test complet (chercher → ajouter → checkout)
- [ ] Créer des captures/GIF pour la documentation

### 5.5 — README

- [ ] `packages/shopify/README.md` avec :
  - Installation (CDN, NPM, App Embed)
  - Configuration minimale
  - Liste des tools disponibles
  - Prérequis (Storefront token, endpoint DomOS)

### 5.6 — Sprint futur : PaymentWidget in-chat

> Reporter au Sprint 6+

- [ ] Ouvrir les tickets pour le PaymentWidget in-chat (Shopify Pay, Apple Pay, Google Pay)
- [ ] Documenter les prérequis (certification Shopify App Store, Storefront API checkout mutations)

---

## Critères de succès

- [ ] `pnpm build` + `pnpm test` passent
- [ ] Bundle CDN fonctionne sur une page HTML standalone
- [ ] App Embed Block installable sur une boutique Shopify de dev
- [ ] Démo complète (chercher → cart → checkout) documentée
