# Sprint 1 - @owllayer/browser (MVP technique)

## Objectif
Poser une base SDK browser universelle (sans framework) avec API publique, build ESM/CDN, auto-discovery HTML, HITL global et persistance de session.

## Fonctionnalites implementees

### 1) Package + build
- Nouveau package `@owllayer/browser` cree dans `packages/browser`.
- Build double sortie:
  - `dist/index.mjs` (ESM)
  - `dist/owllayer.min.js` (IIFE CDN, global `window.OwlLayer`)
- Outils de build/tests configures:
  - `esbuild.config.mjs`
  - `tsconfig.json`
  - `vitest.config.ts`

### 2) API publique MVP
- `OwlLayer.init(config)`
- `OwlLayer.registerTool(name, definition)`
- `OwlLayer.unregisterTool(name)`
- `OwlLayer.updateContext(data)`
- `OwlLayer.sendText(text)`
- `OwlLayer.destroy()`

### 3) Runtime browser singleton
- Orchestrateur principal: `runtime/BrowserOwlLayer.ts`
- Integration `OwlLayerClient` (core) pour:
  - connexion
  - sync tools
  - messages agent
  - approvals HITL
- Gestion idempotente de `init`.

### 4) HITL global bloquant
- UI globale Preact: `ui/HitlOverlay.tsx`
- Modal bloquant pour approvals `high/critical`.
- Resolution explicite `approve/deny`.

### 5) Widget browser (MVP texte)
- Host widget Preact: `ui/WidgetHost.tsx`
- Ouverture/fermeture, envoi texte, affichage streaming agent (upsert dernier message).
- Branding present: `by OwlLayer AI`.

### 6) Auto-discovery data-owllayer-*
- Manager DOM: `runtime/autoDiscovery.ts`
- Scan initial + `MutationObserver`.
- Attributs supportes:
  - `data-owllayer-tool`
  - `data-owllayer-description`
  - `data-owllayer-risk`
  - `data-owllayer-action` (`click`, `focus`, `scrollIntoView`, `setValue`)
  - `data-owllayer-selector` (optionnel)
- Enregistrement/desenregistrement auto des tools selon cycle DOM.

### 7) Session persistence basique
- Module: `runtime/sessionPersistence.ts`
- Sauvegarde localStorage:
  - `sessionId`
  - contexte
  - 10 derniers messages
- Resume au `init` si snapshot valide.
- TTL configurable via `sessionPersistence.ttlMs`.

### 8) Tests livres
- `tests/sessionPersistence.test.ts`
- `tests/autoDiscovery.test.ts`
- `tests/lifecycle.test.ts`
- Statut: build et tests package OK.

## TODO restants (post Sprint 1)
- Durcir la reprise de session cote serveur (resume reel du `sessionId`).
- Ajouter mode audio widget browser (capture/playback).
- Ajouter UI presets widget (`call/chat/travel`) cote browser.
- Ajouter docs d'integration Laravel/Shopify/WordPress dediees.
- Ajouter e2e navigateur reel (Playwright) pour flux HITL + auto-discovery.
- Ajouter options de theming widget/HITL dans API browser.
