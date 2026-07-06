---
mode: agent
description: >
  Sprint LK-00 - Contrat d'architecture entre DomOS et LiveKit Agents.
---

# Sprint LK-00 - Contrat d'architecture DomOS x LiveKit

**Base :** DomOS possede deja `LiveAdapter`, `LiveSession`, `TTSService`, `AdminAPI`, `runtimeVoiceConfig` et le cycle Neural-DOM Binding.  
**Perimetre :** architecture, contrats, documentation technique.  
**But :** eviter une integration LiveKit qui contourne le coeur DomOS.

## Objectif

Definir le contrat stable entre:

- DomOS Server;
- DomOS SDK client;
- LiveKit Agents;
- providers IA branches via LiveKit.

Le resultat attendu est un document technique et des types de base avant toute implementation lourde.

## Principe central

LiveKit Agents gere le realtime media et l'AgentSession.

DomOS gere:

- l'identite agent;
- le Shadow Context;
- les tools effectifs;
- le routing des tool calls;
- le dashboard;
- la securite API key/session;
- le cycle mount/unmount des tools client.

## Fichiers cibles

| Fichier | Action |
| --- | --- |
| `sprints/livekit/README.md` | maintenir le plan directeur |
| `docs/CONCEPTS.md` | ajouter une section future "LiveKit optional runtime" si ce fichier reste le bon endroit |
| `framwork.md` | ajouter l'orientation LiveKit comme couche optionnelle, pas coeur |
| `packages/core/src/voice/contracts.ts` | verifier si `LiveSessionConfig` suffit |
| `packages/server/src/core/DomOSServer.ts` | verifier les points d'entree `live`, `tts`, `runtimeVoiceConfig` |
| `packages/server/src/admin/AdminAPI.ts` | verifier capabilities live/tts exposees |

## Architecture fonctionnelle

```txt
DomOSClient
  registerTool() / unregisterTool()
  updateContext()
  sendAudioStream()

DomOSServer
  buildEffectiveTools()
  create LiveSession via adapter
  forward tool calls to client/server router

LiveKit Agents Bridge
  create AgentSession
  connect to room
  map DomOS tools to LiveKit tools
  emit transcripts/events

Provider layer
  Gemini Live
  OpenAI Realtime
  Deepgram STT
  Cartesia TTS
  Gemini TTS
  LiveKit Inference
```

## Contraintes non negociables

- Aucun tool client ne doit etre execute cote LiveKit sans passer par DomOS.
- Le dashboard DomOS reste la source d'exploitation des agents DomOS.
- Les secrets LiveKit et provider restent cote serveur/env.
- Les rooms LiveKit ne remplacent pas les API keys DomOS.
- L'integration doit rester optionnelle et tree-shakable autant que possible.
- Gemini ne doit pas etre hardcode comme seul provider.

## Decisions a prendre dans ce sprint

- Nom du package adapter:
  - option A: `@domos/adapter-livekit`
  - option B: `@domos/adapter-livekit-agents`
  - recommandation: `@domos/adapter-livekit`
- Nom du bridge:
  - `LiveKitDomOSBridge`
  - `DomOSLiveKitAgentBridge`
  - recommandation: `DomOSLiveKitAgentBridge`
- Strategy provider:
  - `LiveKitAgentRuntime` provider-agnostic;
  - `GeminiLiveAdapter` et `GeminiTTSService` comme premiers adapters concrets.

## Gates

- [ ] Le contrat dit clairement ce que LiveKit fait et ce que DomOS garde.
- [ ] Aucune decision ne rend Gemini obligatoire.
- [ ] Les fichiers cibles d'implementation sont listes.
- [ ] Les risques secrets/API keys/rooms sont documentes.
- [ ] La suite de sprints peut etre executee sans redecouvrir l'architecture.

