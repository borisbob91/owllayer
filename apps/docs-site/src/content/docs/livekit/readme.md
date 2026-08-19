---
title: "@owllayer/adapter-livekit"
description: Comprendre le role de l adapter LiveKit et choisir le bon point d entree.
---

# @owllayer/adapter-livekit

`@owllayer/adapter-livekit` est l'adaptateur optionnel qui permet d'utiliser LiveKit avec une application OwlLayer existante.

Il ne remplace pas le runtime OwlLayer. Votre serveur conserve les sessions, les API keys, les tools, le HITL et le routage AITP. LiveKit ajoute une room temps reel et le runtime media ou agent dont votre application a besoin.

## Ce que vous pouvez faire

| Besoin | API a utiliser | Ou l'utiliser |
| --- | --- | --- |
| Utiliser Gemini Live comme adapter vocal OwlLayer | `GeminiLiveAdapter` | Serveur, dans `new OwlLayerServer({ live })` |
| Utiliser Gemini TTS dans le pipeline OwlLayer | `GeminiTTSService` | Serveur, dans `new OwlLayerServer({ tts })` |
| Autoriser le navigateur a rejoindre une room | `createLiveKitRoomToken` | Endpoint HTTP de votre serveur |
| Connecter une app React a la room | `useOwlLayerLiveKitRoom` | Client React, apres `OwlLayerProvider` |
| Relier une `AgentSession` LiveKit aux tools OwlLayer | `OwlLayerLiveKitAgentBridge` | Serveur ou worker avance |

## Le flux complet

```text
Application React
    │
    ├── OwlLayerProvider + AITP : session, contexte, tools
    │
    └── useOwlLayerLiveKitRoom
          │ demande un token
          ▼
Serveur OwlLayer
    │
    ├── verifie l API key et la session
    ├── genere un token LiveKit court
    └── garde les secrets LiveKit et Google
          │
          ▼
LiveKit room + adapter LiveKit
```

Un tool cote client continue d'etre execute dans l'application via OwlLayerClient et AITP. Le navigateur ne recoit jamais la cle secrete LiveKit ni la cle Google.

## Installation

Pour le serveur :

```bash
pnpm add @owllayer/adapter-livekit
```

Pour un client React qui rejoint une room :

```bash
pnpm add @owllayer/react livekit-client
```

`livekit-client` est charge uniquement lorsque le hook React se connecte a une room.

## Par ou commencer

- [Bien debuter avec l'adapter](/livekit/getting-started/) : installation, variables, serveur, endpoint token et client React.
- [Deploy, observabilite et telephonie](/livekit/telephony-deploy-observability/) : guide avance. La telephonie SIP y est encore decrite comme future work.

## Limites actuelles

- L'implementation fournie utilise actuellement Gemini Live et Gemini TTS via les plugins Google de LiveKit.
- Les types du package laissent la porte ouverte a d'autres providers, mais ils ne sont pas encore tous branches par une implementation OwlLayer prete a l'emploi.
- La telephonie SIP n'est pas implementee.
- Le bridge `AgentSession` est reserve aux usages avances. Pour une premiere integration, utilisez `GeminiLiveAdapter` et `useOwlLayerLiveKitRoom`.

## Documentation officielle LiveKit

- [Gemini Live API avec LiveKit Agents](https://docs.livekit.io/agents/models/realtime/plugins/gemini/)
- [Gemini TTS avec LiveKit Agents](https://docs.livekit.io/agents/models/tts/gemini/)
- [Vue d'ensemble des modeles LiveKit Agents](https://docs.livekit.io/agents/models/)
