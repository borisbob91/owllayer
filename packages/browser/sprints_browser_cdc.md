# Plan Global Sprints - @domos/browser (aligné CdC)

Ce plan se base explicitement sur :
- **CdC §9.1 Exigences fonctionnelles** (`EF-B01` ... `EF-B10`)
- **CdC §9.2 Exigences techniques** (`ET-B01` ... `ET-B07`)
- **CdC §10.1 Roadmap** (`v1.0`, `v1.1`, `v1.2`, `v2.0`)

## Statut global

| Sprint | Version | Statut | Détail |
|---|---|---|---|
| Sprint 1 | v1.0 socle | ✅ Terminé | API de base, auto-discovery MVP, session basique, Widget/HITL Preact |
| Sprint 2 | v1.0 conformité | ✅ Terminé (22/03/2026) | Shadow DOM, API events (onResponse/onError/onReady/onToolCall/setContext/disconnect/getSession), auto-discovery complet (show/hide/addClass/removeClass + target interpolation + schema), session beforeunload + storageKey configurable, JSON Schema natif |
| Sprint 3 | v1.1 | 🔜 À démarrer | Voix, mémoire DomosAgent, SSR guides, plugin WordPress |
| Sprint 4 | v1.2 | ⏳ CdC Shopify/WooCommerce en attente | E-commerce, Webflow, analytics |
| Sprint 5 | v2.0 | ⏳ Après S4 | Offline-first, Service Worker, PWA |

## Sprint 1 - Socle v1.0 (MVP technique)

### Références CdC
- Roadmap `10.1 v1.0` (init/registerTool/auto-discovery/session/widget/HITL/API imperative)
- EF-B01 (CDN sans npm), ET-B01 (double format build), ET-B02 (Preact interne), ET-B03 (reuse types core)

### Livrables
- Package `@domos/browser` créé.
- API de base: `init/registerTool/unregisterTool/updateContext/sendText/destroy`.
- Build ESM + IIFE (global `window.DomOS`).
- Runtime singleton adossé à `@domos/core`.
- Auto-discovery MVP (`click/focus/scrollIntoView/setValue`).
- Persistance locale basique (TTL + restore au init).
- HITL overlay global bloquant (base).
- Widget browser texte (base).

### Critères d’acceptation
- Build package OK.
- Tests unitaires initiaux OK (persistance, auto-discovery, lifecycle).

---

## Sprint 2 - Conformité v1.0 CdC (production readiness)

### Références CdC
- EF-B02, EF-B04, EF-B05, EF-B06, EF-B08, EF-B09, EF-B10
- ET-B04, ET-B05, ET-B07

### Livrables
- `registerTool()` avec JSON Schema standard (pas dépendant Zod).
- `beforeunload` + auto-resume robustes.
- Widget + modal HITL en Shadow DOM isolé.
- Parité HITL 4 niveaux avec SDK framework.
- API events: `onResponse`, `onError`, `onReady`.
- Auto-discovery complet: `show/hide/click/scrollIntoView/setValue/addClass/removeClass`.
- Support `data-domos-args` JSON.
- Validation “1 seul MutationObserver”.
- Docs intégration Laravel/Shopify/WordPress/HTML statique.
- Exports npm finalisés.

### Critères d’acceptation
- Toutes exigences critiques v1.0 couvertes.
- Tests unit/intégration + build CI verts.
- Intégration sans erreur sur 4 plateformes cibles (EF-B10).

---

## Sprint 3 - v1.1 (voix + mémoire + SSR guide)

### Références CdC
- Roadmap `10.1 v1.1`: voice mode, memory level 3, SSR Next/Nuxt, WordPress plugin officiel

### Livrables
- API voix: `startVoice/stopVoice/isVoiceActive`.
- Flux audio browser: capture PCM, stream, playback, interruption.
- Fallback micro->texte.
- Connecteur mémoire persistante DomosAgent (niveau 3).
- Guides SSR officiels (Next client component, Nuxt plugin client).
- Plugin WordPress officiel minimum (config API key/endpoint + inject script).

### Critères d’acceptation
- Voix stable (texte/audio switch, interruption, fallback).
- Mémoire persistante activable sans casser S1/S2.
- Guides SSR validés sur exemples réels.
- Plugin WordPress installable.

---

## Sprint 4 - v1.2 (écosystème e-commerce + analytics)

### Références CdC
- Roadmap `10.1 v1.2`: plugin Shopify officiel, WooCommerce natif, SDK Webflow, analytics browser

### Livrables
- Plugin Shopify officiel (app + injection contrôlée + outils globaux boutique).
- Intégration WooCommerce native (panier, checkout actions contrôlées).
- SDK/loader Webflow dédié.
- Module analytics browser opt-in (temps page, scroll depth, events agent).

### Critères d’acceptation
- Shopify + WooCommerce + Webflow: parcours smoke test OK.
- Analytics non-intrusif, désactivable, documenté RGPD/basic privacy.

---

## Sprint 5 - v2.0 (offline-first / PWA)

### Références CdC
- Roadmap `10.1 v2.0`: support offline, sync différé tool calls, intégration PWA

### Livrables
- Service Worker pour mode offline.
- File de `tool calls` différés + stratégie de replay.
- États de cohérence et résolution de conflits à la reconnexion.
- Intégration PWA (installable + cache stratégie).

### Critères d’acceptation
- Expérience dégradée maîtrisée sans réseau.
- Replay fiable à la reconnexion.
- Documentation offline-first + limites fonctionnelles.

---

## Gouvernance et cadence

- Sprint 1 + 2 = **release v1.0**
- Sprint 3 = **release v1.1**
- Sprint 4 = **release v1.2**
- Sprint 5 = **release v2.0**

Recommandation: cadence 2 semaines/sprint avec une phase “hardening” de 3-5 jours avant chaque release mineure.
