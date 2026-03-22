# Sprint 1 - @domos/browser (MVP technique)

## Objectif
Poser une base SDK browser universelle (sans framework) avec API publique, build ESM/CDN, auto-discovery HTML, HITL global et persistance de session.

## Fonctionnalites implementees

### 1) Package + build
- Nouveau package `@domos/browser` cree dans `packages/browser`.
- Build double sortie:
  - `dist/index.mjs` (ESM)
  - `dist/domos.min.js` (IIFE CDN, global `window.DomOS`)
- Outils de build/tests configures:
  - `esbuild.config.mjs`
  - `tsconfig.json`
  - `vitest.config.ts`

### 2) API publique MVP
- `DomOS.init(config)`
- `DomOS.registerTool(name, definition)`
- `DomOS.unregisterTool(name)`
- `DomOS.updateContext(data)`
- `DomOS.sendText(text)`
- `DomOS.destroy()`

### 3) Runtime browser singleton
- Orchestrateur principal: `runtime/BrowserDomOS.ts`
- Integration `DomOSClient` (core) pour:
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
- Branding present: `by DomOS AI`.

### 6) Auto-discovery data-domos-*
- Manager DOM: `runtime/autoDiscovery.ts`
- Scan initial + `MutationObserver`.
- Attributs supportes:
  - `data-domos-tool`
  - `data-domos-description`
  - `data-domos-risk`
  - `data-domos-action` (`click`, `focus`, `scrollIntoView`, `setValue`)
  - `data-domos-selector` (optionnel)
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
