# Sprint 4 - @domos/browser (Roadmap v1.2)

## Objectif

Implémenter les intégrations e-commerce et no-code : **Shopify**, **WooCommerce**, **Webflow**, et le module analytics opt-in.

> **Prérequis** : Sprint 3 (v1.1) complété.  
> ⏳ **CdC Shopify et WooCommerce en attente** — les spécifications dédiées seront partagées avant de démarrer ce sprint.  
> Le SDK `@domos/browser` est déjà compatible MPA grâce aux Sprints 1–3 : Shadow DOM, `beforeunload`, `data-domos-target` avec interpolation, JSON Schema natif.

## Référence CdC

- Roadmap `10.1 v1.2` : Plugin Shopify officiel, intégration WooCommerce native, SDK Webflow, analytics browser

---

## Ce que les Sprints 1-3 ont préparé pour ce sprint

| Fonctionnalité S1-S3 | Utilité concrète pour S4 |
|---|---|
| Shadow DOM fermé | Widget opérationnel dans les thèmes Liquid/WooCommerce sans conflits CSS |
| `beforeunload` | Session préservée lors des navigations PDP→Cart→Checkout |
| `data-domos-target` + interpolation | Outils déclarables 100% en HTML Liquid/Blade : `data-domos-target="#variant-{id}"` |
| `data-domos-schema` JSON natif | Pas de Zod, pas de build step — compatible Shopify Liquid et WordPress PHP |
| `onReady` / `onError` callbacks | Pages hôtes réactives à l'état DomOS sans couplage fort |
| `setContext()` | Remplacement complet du contexte lors du changement de produit/page |
| `DomOS.memory` | Persistance des préférences utilisateur cross-session (panier, taille, etc.) |
| Mode vocal | Assistant vocal disponible dans les boutiques (commande vocale add-to-cart) |

---

## TODO détaillés (à compléter après réception des CdC Shopify et WooCommerce)

---

### Tâche 1 — Plugin Shopify officiel

> ⏳ **En attente du CdC Shopify**

**Périmètre prévu** :

- [ ] App Shopify (ou extension de thème) — injection contrôlée du script DomOS
- [ ] Tools globaux Shopify prêts à l'emploi (injectés automatiquement) :
  - `get_cart` — lecture du contenu panier via `/cart.js`
  - `add_to_cart` — ajout produit/variante au panier via `/cart/add.js`
  - `remove_from_cart` — suppression via `/cart/change.js`
  - `navigate_to` — navigation interne boutique
  - `select_variant` — sélection variante (taille, couleur)
- [ ] Injection du contexte Shopify automatique (produit courant, variantes, prix, stock) depuis les variables Liquid
- [ ] Guide d'intégration `theme.liquid` complet
- [ ] Stockage sécurisé de la clé API dans les métachamps Shopify

---

### Tâche 2 — Intégration WooCommerce native

> ⏳ **En attente du CdC WooCommerce**

**Périmètre prévu** :

- [ ] Plugin WordPress dédié WooCommerce (extension du plugin WordPress Sprint 3)
- [ ] Tools WooCommerce prêts à l'emploi :
  - `get_cart` — lecture panier WooCommerce
  - `add_to_cart` — ajout via AJAX WooCommerce
  - `remove_from_cart` — suppression
  - `update_cart_item_quantity` — mise à jour quantité
  - `get_product_info` — infos produit courant
- [ ] Injection du contexte WooCommerce automatique (produit, variantes, prix, stock) depuis les hooks PHP
- [ ] Compatibilité avec les thèmes WooCommerce standard (Storefront, Astra, etc.)

---

### Tâche 3 — SDK Webflow

- [ ] Créer un guide d'intégration Webflow dédié dans `docs/integration-webflow.md`
- [ ] Tester le chargement du CDN dans un projet Webflow (injection dans "Custom Code" head/footer)
- [ ] Documenter les limitations Webflow (pas d'accès au DOM natif pour certains éléments CMS)
- [ ] Fournir des snippets `data-domos-*` utilisables dans les attributs HTML Webflow
- [ ] Vérifier compatibilité avec Webflow Interactions (animations) — s'assurer que le Shadow DOM ne crée pas de conflit z-index

---

### Tâche 4 — Module analytics browser opt-in

**Nouveau fichier** : `src/runtime/AnalyticsTracker.ts`

- [ ] Créer `AnalyticsTracker` avec :
  - `timeOnPage` — temps passé sur la page (performance.now())
  - `scrollDepth` — pourcentage de la page scrollée (IntersectionObserver)
  - `agentEvents` — nombre d'interactions avec l'agent (messages envoyés, tools appelés)
  - `errorCount` — erreurs SDK
  - `handshakeLatency` — temps entre `init()` et premier `connected`

- [ ] Ajouter la config dans `DomOSBrowserConfig` :
  ```ts
  analytics?: {
    enabled?: boolean;        // défaut: false — opt-in explicite
    onReport?: (report: AnalyticsReport) => void;  // callback pour recevoir les métriques
    reportInterval?: number;  // ms — défaut: 30000 (30s)
  };
  ```

- [ ] NE PAS envoyer les métriques à un serveur tiers sans consentement explicite — uniquement via le callback `onReport`

- [ ] Ajouter le type `AnalyticsReport` dans `src/types.ts`

- [ ] Dans `BrowserDomOS` : instancier et démarrer le tracker si `analytics.enabled: true`

- [ ] Exposer dans `index.ts` : `DomOS.getAnalytics()` pour lire le rapport courant

---

### Tâche 5 — Tests Sprint 4

**Dossier** : `tests/`

- [ ] `tests/analytics.test.ts` — **nouveau** :
  - Opt-in : tracker instancié si `analytics.enabled: true`
  - Opt-out (défaut) : tracker non instancié
  - `onReport` appelé après `reportInterval`
  - `handshakeLatency` calculée correctement (mock)

- [ ] Tests smoke Shopify et WooCommerce — **après réception des CdC**

---

## Definition of Done Sprint 4

- [ ] Plugin Shopify officiel testé sur une boutique dev Shopify
- [ ] Intégration WooCommerce testée sur une install WordPress dev
- [ ] Guide Webflow validé sur un projet exemple
- [ ] Module analytics disponible, opt-in, non-bloquant, documenté RGPD/privacy
- [ ] Aucune régression sur les tests Sprint 1/2/3
