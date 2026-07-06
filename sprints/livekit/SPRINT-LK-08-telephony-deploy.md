---
mode: agent
description: >
  Sprint LK-08 - Telephony, deployment, scaling et observabilite avancee LiveKit.
---

# Sprint LK-08 - Telephony Deploy

**Base :** LK-04 a LK-07 valides.  
**Perimetre :** production ops, SIP, scaling, observabilite avancee.  
**Objectif :** preparer les usages call center / voice commerce / support vocal.

## Objectif

Exploiter LiveKit au-dela du widget web:

- appels entrants/sortants;
- SIP/telephony;
- rooms persistantes;
- scaling workers;
- dispatch d'agents;
- observabilite transcripts/traces;
- handoff humain ou multi-agent.

## Fichiers cibles

| Fichier | Action |
| --- | --- |
| `packages/adapter-livekit/src/telephony/*` | couche SIP/telephony si exposee |
| `packages/adapter-livekit/src/deploy/*` | helpers config deploy |
| `packages/adapter-livekit/src/observability/*` | traces/transcripts |
| `packages/server/src/admin/AdminAPI.ts` | endpoints ops avances |
| `packages/ui/src/dashboard/pages/StatusPage.tsx` | status telephony/rooms |
| `packages/ui/src/dashboard/pages/SessionDetailPage.tsx` | transcripts/call metadata |
| `apps/demo-server/src/server.ts` | demo self-host |
| `docs/livekit/telephony.md` ou docs-site equivalent | guide |

## Cas d'usage cibles

- Agent vocal e-commerce qui accompagne une session web.
- Support vocal relie a l'UI client.
- Call center avec tools DomOS serveur et client.
- Realtime translation avec contexte UI.
- Handoff humain ou agent specialise.

## Points d'architecture

Telephony ne doit pas casser le modele DomOS:

- un appel peut creer une session DomOS;
- une session DomOS peut etre sans UI client;
- si UI client disponible, Shadow Context enrichit l'agent;
- si UI absente, seuls les tools serveur sont exposes;
- les tools client ne doivent apparaitre que si un client DomOS est connecte et a monte ces tools.

## Observabilite

Ajouter ou mapper:

- room created/closed;
- participant joined/left;
- agent state changed;
- transcript user/agent;
- tool requested/result/error;
- handoff started/completed;
- call duration;
- provider latency;
- interruptions/barge-in.

## Gates

- [ ] Un appel/room peut etre lie a une session DomOS.
- [ ] Sans UI client, seuls les tools serveur sont exposes.
- [ ] Avec UI client, les tools montes apparaissent puis disparaissent au demontage.
- [ ] Le dashboard affiche call/room/session sans secrets.
- [ ] Les transcripts sont exportables ou consultables selon politique de retention.
- [ ] Le deploy self-host et LiveKit Cloud sont documentes separement.

