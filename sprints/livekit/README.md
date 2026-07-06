---
mode: agent
description: >
  Plan directeur LiveKit pour DomOS. Ce dossier de sprints decrit comment
  integrer LiveKit Agents sans remplacer le coeur DomOS.
---

# LiveKit pour DomOS - Plan directeur

Date: 2026-07-04

## Decision d'architecture

LiveKit Agents ne remplace pas DomOS.

LiveKit Agents devient une couche optionnelle pour:

- rooms WebRTC;
- voice/video realtime;
- turn detection et interruptions;
- pipelines STT / LLM / TTS;
- AgentSession;
- telephony/SIP;
- observabilite media et transcripts.

DomOS garde le controle de:

- Neural-DOM Binding;
- Shadow Context;
- cycle mount/unmount des tools client;
- API keys client;
- sessions DomOS;
- surface effective des tools;
- dashboard admin;
- execution des tools client dans le vrai runtime UI.

## Architecture cible

```txt
Client UI DomOS
  - React / Angular / Vue / Browser SDK
  - Shadow Context
  - tools locaux montes/demontes par composants
  - option: LiveKit room participant

        |
        | ADTP / WebSocket / optional LiveKit Data/RPC bridge
        v

DomOS Server
  - SessionManager
  - ToolRouter
  - ClientAuthManager
  - AdminAPI + dashboard
  - LiveAdapter interface
  - TTSService interface
  - Bridge LiveKit optionnel

        |
        | adapter boundary
        v

LiveKit Agents runtime
  - AgentSession
  - Room IO
  - provider-agnostic AI pipeline
  - Gemini Live, OpenAI Realtime, Anthropic/OpenAI text, Deepgram, Cartesia, ElevenLabs, Gemini TTS, etc.
```

## Regle produit

La valeur de DomOS n'est pas "avoir un agent vocal".

La valeur de DomOS est:

> un agent qui comprend l'etat vivant d'une interface, voit uniquement les tools actuellement montes, appelle un tool, et le client execute l'action dans son vrai contexte UI.

LiveKit apporte la couche realtime media robuste. DomOS apporte la liaison agentique UI.

## Provider-agnostic par defaut

Ne pas coder l'architecture autour de Gemini uniquement.

Gemini est un excellent premier provider pour:

- `GeminiLiveAdapter`;
- `GeminiTTSService`;
- demo native audio;
- voix Gemini.

Mais le design doit accepter:

- OpenAI Realtime;
- Azure OpenAI Realtime;
- Amazon Nova Sonic;
- Cartesia TTS;
- Deepgram STT;
- ElevenLabs TTS;
- Google Cloud STT/TTS;
- LiveKit Inference;
- tout autre provider LiveKit Agents.

## Dossier de sprints

| Sprint | Objectif |
| --- | --- |
| `SPRINT-LK-00-architecture-contract.md` | Poser le contrat architecture DomOS x LiveKit |
| `SPRINT-LK-01-package-foundation.md` | Preparer packages, options serveur et contrats types |
| `SPRINT-LK-02-gemini-tts-service.md` | Ajouter Gemini TTS comme `TTSService` |
| `SPRINT-LK-03-realtime-live-adapters.md` | Ajouter adapters realtime provider-agnostic |
| `SPRINT-LK-04-agent-session-bridge.md` | Brancher LiveKit AgentSession sans perdre les tools DomOS |
| `SPRINT-LK-05-client-room-frontends.md` | Ajouter integration room cote SDK/client |
| `SPRINT-LK-06-dashboard-ops.md` | Exposer LiveKit dans dashboard admin |
| `SPRINT-LK-07-tests-docs-security.md` | Verrouiller tests, docs, securite et publication |
| `SPRINT-LK-08-telephony-deploy.md` | Preparer telephony, deploy, scaling et observabilite avancee |

## Sources de reference

- LiveKit Agents overview: https://docs.livekit.io/agents/
- AgentSession: https://docs.livekit.io/agents/logic/sessions/
- Gemini Live API plugin: https://docs.livekit.io/agents/models/realtime/plugins/gemini/
- Gemini TTS plugin: https://docs.livekit.io/agents/models/tts/gemini/
- Agents Node.js: https://github.com/livekit/agents-js

PS: a la fin tu dois ajouter un dossier docs livekit comme les autres en version francais dans : C:\Users\BorisBob\Documents\futur4tech\projet\DomOS\framework\domos\apps\docs-site (tu peux confier a un agent explorer pour le faire)