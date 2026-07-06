---
mode: agent
description: >
  Sprint LK-04 - Bridge entre LiveKit AgentSession et les sessions/tools DomOS.
---

# Sprint LK-04 - LiveKit AgentSession Bridge

**Base :** Sprint LK-03.  
**Perimetre :** bridge runtime, pas frontend.  
**Objectif :** utiliser `AgentSession` sans perdre le controle DomOS sur les tools et le Shadow Context.

## Objectif

Creer un bridge qui connecte:

- une session DomOS;
- une room LiveKit;
- un `AgentSession`;
- la surface effective des tools DomOS;
- les tool results DomOS.

## Fichiers cibles

| Fichier | Action |
| --- | --- |
| `packages/adapter-livekit/src/bridge/DomOSLiveKitAgentBridge.ts` | creer bridge principal |
| `packages/adapter-livekit/src/bridge/LiveKitRoomManager.ts` | gestion room/token/participant |
| `packages/adapter-livekit/src/bridge/DomOSToolBridge.ts` | mapping tool calls/results |
| `packages/adapter-livekit/src/bridge/DomOSContextBridge.ts` | injection Shadow Context/chat context |
| `packages/adapter-livekit/src/bridge/events.ts` | events bridge |
| `packages/adapter-livekit/tests/DomOSLiveKitAgentBridge.test.ts` | tests |
| `packages/server/src/core/DomOSServer.ts` | option de branchement bridge si necessaire |
| `packages/server/src/admin/AdminAPI.ts` | stats/capabilities bridge si necessaire |

## Flux attendu

```txt
1. Client DomOS se connecte.
2. DomOS cree une session.
3. Option LiveKit activee: bridge cree/recupere une room.
4. AgentSession LiveKit demarre comme participant agent.
5. DomOS transmet prompt + tools effectifs.
6. Utilisateur parle dans la room.
7. AgentSession recoit audio/text.
8. Le modele demande un tool.
9. Bridge convertit vers tool call DomOS.
10. DomOS route:
    - server tool local;
    - client tool via ADTP vers le navigateur.
11. Resultat retourne a AgentSession.
12. Dashboard DomOS journalise session/tool/result.
```

## Regles de responsabilite

LiveKit AgentSession peut orchestrer la conversation vocale.

DomOS doit rester responsable de:

- la validite de la session;
- les permissions API key;
- la liste effective des tools;
- les collisions server/client;
- HITL/approval;
- le retour tool result.

## Gestion du Shadow Context

Le bridge ne doit pas pousser tout le DOM au modele.

Il doit utiliser:

- `session.context.url`;
- `session.context.title`;
- `session.context.data`;
- resume compact;
- tools effectifs;
- prompt systeme resolu.

## Gates

- [ ] Un bridge peut demarrer une AgentSession pour une session DomOS.
- [ ] Un tool call LiveKit revient dans le pipeline DomOS existant.
- [ ] Un client tool reste execute cote client DomOS.
- [ ] Un server tool reste execute cote serveur DomOS.
- [ ] Les context updates DomOS mettent a jour la surface exposee au bridge.
- [ ] Le bridge ferme proprement room/AgentSession quand la session DomOS ferme.
- [ ] Tests couvrent tool call, tool error, session close, context update.

