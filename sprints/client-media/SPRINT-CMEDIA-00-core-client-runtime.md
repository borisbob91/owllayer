# Sprint CMEDIA-00 - Runtime média du client core

Statut : **Planifié après ADTP-01 et OAI-02**

## Objectif

Ajouter un contrôleur média provider-neutre au client core, distinct de
`ClientTransport = 'websocket' | 'webrtc'` qui transporte ADTP.

## Contrat proposé

```ts
type MediaTransportPolicy = 'websocket' | 'webrtc' | 'auto';
type MediaFallbackPolicy = 'websocket' | 'none';
```

La configuration par défaut est `{ transport: 'websocket', fallback:
'websocket' }`. Le nom final du contrôleur est validé avant création ;
`MediaSessionController` est le candidat actuel.

## Responsabilités

- demander et lire les capacités via ADTP ;
- sélectionner le transport selon la politique ;
- exposer `selectedTransport`, `selectionReason` et l'état de session ;
- ouvrir, interrompre, muter, fermer et nettoyer une session média ;
- conserver le chemin `AUDIO_STREAM` comme implémentation WebSocket ;
- déléguer SDP/ICE/tracks à un adapter WebRTC injecté ;
- empêcher une double capture ou deux sorties audio concurrentes ;
- réinitialiser le tour avant fallback ;
- fermer le média au disconnect ADTP et au changement de session.

## Fichiers cibles

- `packages/core/src/client/DomOSClient.ts`
- nouveau dossier `packages/core/src/media/client/`
- `packages/core/src/protocol/` après ADTP-01
- exports publics core ciblés
- tests unitaires core

## Tests

- défaut WebSocket sans capacité WebRTC ;
- WebRTC explicite disponible/indisponible ;
- `auto` avec et sans capacité ;
- échec bootstrap et fallback ;
- interruption pendant un tour ;
- fermeture au disconnect/reconnect ;
- aucune confusion avec le `WebRTCTransport` ADTP.

## Definition of Done

- [ ] Le défaut reste WebSocket.
- [ ] Le choix effectif est observable et testé.
- [ ] Aucun type OpenAI ou LiveKit n'entre dans core.
- [ ] Les deux transports ne produisent pas d'audio simultanément.
- [ ] Le fallback respecte le lifecycle du tour.
- [ ] Les anciens appels `sendAudioStream` restent compatibles.

## Hors scope

- Capture micro et playback propres à un framework.
- UI du widget.
- Implémentation provider serveur.

## Commit recommandé

`feat(core): add provider-neutral client media runtime`

