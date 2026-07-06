---
mode: agent
description: >
  Sprint LK-06 - Dashboard admin pour LiveKit, rooms, providers et AgentSession.
---

# Sprint LK-06 - Dashboard Ops LiveKit

**Base :** Sprint LK-04 ou LK-05.  
**Perimetre :** `packages/server/src/admin`, `packages/ui/src/dashboard`.  
**Objectif :** rendre LiveKit observable depuis le dashboard DomOS, sans transformer l'admin en laboratoire.

## Objectif

Ajouter au dashboard DomOS une vue operationnelle LiveKit:

- providers disponibles;
- modeles realtime;
- voix;
- rooms actives;
- participant agent;
- sessions DomOS liees;
- etat AgentSession;
- transcripts et events utiles;
- erreurs provider;
- cout/latence si disponible.

## Fichiers cibles

| Fichier | Action |
| --- | --- |
| `packages/server/src/admin/AdminAPI.ts` | endpoints capabilities/events LiveKit |
| `packages/ui/src/dashboard/api.ts` | types et client HTTP |
| `packages/ui/src/dashboard/pages/CapabilitiesPage.tsx` | provider LiveKit/Gemini/OpenAI |
| `packages/ui/src/dashboard/pages/StatusPage.tsx` | rooms et agent state resume |
| `packages/ui/src/dashboard/pages/SessionDetailPage.tsx` | room liee, participant, transcripts |
| `packages/ui/src/dashboard/pages/ToolsPage.tsx` | surface tool DomOS exposee au bridge |
| `packages/ui/src/dashboard/pages/LinesPage.tsx` | ne pas melanger virtual lines avec rooms, seulement lien si pertinent |
| `packages/server/tests/AdminAPI.dashboard.test.ts` | tests endpoints |

## Endpoints proposes

- `GET /admin/livekit/status`
- `GET /admin/livekit/rooms`
- `GET /admin/livekit/sessions`
- `GET /admin/livekit/capabilities`
- `GET /admin/livekit/events`

Ces endpoints doivent etre optionnels:

- si LiveKit non configure: `enabled: false`;
- aucun secret retourne;
- erreurs actionnables.

## Donnees a afficher

```ts
interface LiveKitRuntimeStatus {
  enabled: boolean;
  urlConfigured: boolean;
  provider: string;
  activeRooms: number;
  activeAgentSessions: number;
  model?: string;
  voice?: string;
  lastError?: string;
}
```

## Gates

- [ ] Le dashboard indique clairement si LiveKit est configure ou non.
- [ ] Les rooms actives sont visibles sans secrets.
- [ ] Une session DomOS affiche sa room/participant si liee.
- [ ] Les capabilities montrent que LiveKit peut brancher plusieurs providers, pas seulement Gemini.
- [ ] Les events LiveKit alimentent `/admin/events` ou une source dediee.
- [ ] Tests AdminAPI couvrent enabled=false et enabled=true mock.

