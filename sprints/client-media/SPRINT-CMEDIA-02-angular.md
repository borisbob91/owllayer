# Sprint CMEDIA-02 - Raccordement Angular

Statut : **Planifié après CMEDIA-01**

## Objectif

Raccorder `DomOSVoiceService` au runtime média core avec un lifecycle Angular
déterministe.

## Fichiers cibles

- `packages/angular/src/lib/services/voice/DomOSVoiceService.ts`
- service/configuration client Angular
- `packages/angular/src/public-api.ts`
- tests Angular voice et API publique

## Definition of Done

- [ ] WebSocket reste le défaut.
- [ ] WebRTC et `auto` utilisent la négociation core.
- [ ] Destroy/unsubscribe ferme tracks, listeners et média.
- [ ] Mute/interruption/playback restent cohérents.
- [ ] Build et tests Angular passent.

## Hors scope

- Autres SDK et UI spécifique LiveKit.

## Commit recommandé

`feat(angular): connect voice service to core media runtime`

