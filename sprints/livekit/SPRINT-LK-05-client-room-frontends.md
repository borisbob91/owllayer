---
mode: agent
description: >
  Sprint LK-05 - Integration room LiveKit cote SDK clients DomOS.
---

# Sprint LK-05 - Client Room Frontends

**Base :** Sprint LK-04.  
**Perimetre :** SDK clients et demos.  
**Objectif :** permettre a une app DomOS d'entrer dans une room LiveKit sans casser ADTP ni les tools client.

## Objectif

Ajouter une integration frontend optionnelle pour:

- rejoindre une room LiveKit;
- publier audio micro;
- recevoir audio agent;
- conserver le canal DomOS pour Shadow Context et tools;
- lier room participant et session DomOS.

## Fichiers cibles

| Fichier | Action |
| --- | --- |
| `packages/browser/src/livekit/*` | si package browser existe ou chemin equivalent |
| `packages/react/src/livekit/useDomOSLiveKitRoom.ts` | hook React optionnel |
| `packages/angular/src/lib/services/livekit/*` | service Angular optionnel |
| `packages/vue/src/composables/useDomOSLiveKitRoom.ts` | composable Vue optionnel |
| `packages/core/src/livekit/types.ts` | types communs si necessaire |
| `apps/demo-server/src/server.ts` | endpoint token room demo |
| `apps/demo-angular/**` | demo si Angular prioritaire |
| `apps/demo-react/**` si disponible | demo React si plus rapide |

## Contrat frontend

Le frontend LiveKit ne remplace pas `DomOSClient`.

Il ajoute:

- `connectRoom()`;
- `disconnectRoom()`;
- `muteMicrophone()`;
- `unmuteMicrophone()`;
- `agentSpeaking`;
- `roomState`;
- `participantIdentity`.

Le `DomOSClient` continue de porter:

- `updateContext()`;
- `registerTool()`;
- `unregisterTool()`;
- `TOOL_CALL`;
- `TOOL_RESULT`;
- auth client DomOS.

## Token room

Ajouter un endpoint serveur optionnel:

- `POST /admin/livekit/token` pour admin/debug si besoin;
- ou endpoint client securise `POST /domos/livekit/token`.

Regles:

- token genere cote serveur;
- TTL court;
- lie a `sessionId` ou API key;
- pas de secret LiveKit cote client.

## Gates

- [ ] Le client peut rejoindre une room LiveKit avec token serveur.
- [ ] La session DomOS reste active et synchronise le Shadow Context.
- [ ] Les tools client montes restent visibles dans DomOS.
- [ ] Couper la room ne detruit pas forcement la session DomOS si le mode texte reste actif.
- [ ] Couper la session DomOS ferme la room si elle etait liee.
- [ ] Demo minimale documentee.

