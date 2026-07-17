# Sprint CMEDIA-05 - Raccordement Browser SDK

Statut : **Planifié après CMEDIA-04**

## Objectif

Raccorder `VoiceManager` au runtime média core sans casser l'API vanilla.

## Fichiers cibles

- `packages/browser/src/runtime/VoiceManager.ts`
- `packages/browser/src/runtime/BrowserDomOS.ts`
- configuration et tests Browser SDK

## Definition of Done

- [ ] WebSocket, WebRTC et `auto` sont configurables en vanilla JS.
- [ ] `destroy()` libère tracks, AudioContext utilisable, listeners et session.
- [ ] Le fallback n'émet pas deux sorties audio.
- [ ] Build et tests Browser passent.

## Hors scope

- Autres SDK et plugins e-commerce.

## Commit recommandé

`feat(browser): connect voice manager to core media runtime`

