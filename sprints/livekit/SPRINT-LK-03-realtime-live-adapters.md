---
mode: agent
description: >
  Sprint LK-03 - Adapters realtime provider-agnostic pour LiveKit/Gemini/OpenAI.
---

# Sprint LK-03 - Realtime Live Adapters

**Base :** Sprint LK-01 et, idealement, LK-02.  
**Perimetre :** implementation `LiveAdapter` pour realtime models.  
**Objectif :** permettre a DomOS d'utiliser LiveKit/Gemini Live sans specialiser le coeur serveur.

## Objectif

Creer une couche adapter qui mappe les sessions realtime LiveKit/providers vers le contrat DomOS:

- `LiveAdapter`;
- `LiveSession`;
- `LiveSessionConfig`;
- `LLMToolCall`;
- `ToolDeclaration`.

## Providers vises

Premier provider concret:

- Gemini Live API.

Design ouvert pour:

- OpenAI Realtime;
- Azure OpenAI Realtime;
- Amazon Nova Sonic;
- LiveKit Inference realtime;
- autres providers LiveKit Agents.

## Fichiers cibles

| Fichier | Action |
| --- | --- |
| `packages/adapter-livekit/src/live/LiveKitRealtimeAdapter.ts` | base provider-agnostic |
| `packages/adapter-livekit/src/live/GeminiLiveAdapter.ts` | adapter concret Gemini |
| `packages/adapter-livekit/src/live/LiveKitLiveSession.ts` | implementation `LiveSession` |
| `packages/adapter-livekit/src/live/toolMapping.ts` | mapping tools DomOS -> provider tools |
| `packages/adapter-livekit/src/live/audioMapping.ts` | formats audio MIME/base64 |
| `packages/adapter-livekit/src/live/capabilities.ts` | capabilities models/voices |
| `packages/adapter-livekit/tests/GeminiLiveAdapter.test.ts` | tests |
| `packages/core/src/voice/contracts.ts` | verifier besoin de nouveaux callbacks, eviter si possible |
| `packages/server/src/core/DomOSServer.ts` | devrait consommer l'adapter sans changement majeur |

## Contrat `LiveSession`

L'adapter doit fournir:

- `sendAudio(audioBase64, mimeType)`;
- `sendText(text)`;
- `sendToolResponse(callId, name, result)`;
- `endAudioTurn()`;
- `interrupt()`;
- `updateTools(tools)`;
- `close()`;
- `isActive`.

## Points sensibles Gemini

- Gemini Live supporte audio bidirectionnel basse latence.
- Certains modeles supportent tools et audio nativement.
- Les modeles Gemini 3.1 Live ont des limitations sur les updates mid-session.
- DomOS doit donc detecter/annoncer si `updateTools()` ou `updateInstructions()` est degrade.

## Provider-agnostic capabilities

`getCapabilities()` doit inclure:

- provider;
- providerName;
- models;
- voices;
- currentModel;
- currentVoice;
- limitations eventuelles:
  - `supportsToolUpdates`;
  - `supportsAsyncToolCalls`;
  - `supportsNativeAudio`;
  - `supportsVideoInput`;

Si le type core ne porte pas encore ces champs, les garder en metadata ou documenter un sprint type-extension.

## Gates

- [ ] `GeminiLiveAdapter` implemente `LiveAdapter`.
- [ ] Les callbacks audio/text/tool/error/close sont mappes vers DomOS.
- [ ] `updateTools()` respecte le cycle mount/unmount DomOS ou signale une limitation.
- [ ] Les limitations Gemini 3.1 sont documentees et visibles via capabilities.
- [ ] Aucun tool client n'est execute directement dans LiveKit/provider.
- [ ] Tests unitaires de mapping tools et erreurs.

