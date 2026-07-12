---
title: "@domos/adapter-livekit"
description: Comprendre le role de l adapter LiveKit et choisir le bon point d entree.
---

# @domos/adapter-livekit

`@domos/adapter-livekit` est l'adaptateur optionnel qui permet d'utiliser LiveKit avec une application DomOS existante.

Il ne remplace pas le runtime DomOS. Votre serveur conserve les sessions, les API keys, les tools, le HITL et le routage ADTP. LiveKit ajoute une room temps reel et le runtime media ou agent dont votre application a besoin.

## Ce que vous pouvez faire

| Besoin | API a utiliser | Ou l'utiliser |
| --- | --- | --- |
| Utiliser Gemini Live comme adapter vocal DomOS | `GeminiLiveAdapter` | Serveur, dans `new DomOSServer({ live })` |
| Utiliser Gemini TTS dans le pipeline DomOS | `GeminiTTSService` | Serveur, dans `new DomOSServer({ tts })` |
| Autoriser le navigateur a rejoindre une room | `createLiveKitRoomToken` | Endpoint HTTP de votre serveur |
| Connecter une app React a la room | `useDomOSLiveKitRoom` | Client React, apres `DomOSProvider` |
| Relier une `AgentSession` LiveKit aux tools DomOS | `DomOSLiveKitAgentBridge` | Serveur ou worker avance |

## Le flux complet

```text
Application React
    │
    ├── DomOSProvider + ADTP : session, contexte, tools
    │
    └── useDomOSLiveKitRoom
          │ demande un token
          ▼
Serveur DomOS
    │
    ├── verifie l API key et la session
    ├── genere un token LiveKit court
    └── garde les secrets LiveKit et Google
          │
          ▼
LiveKit room + adapter LiveKit
```

Un tool cote client continue d'etre execute dans l'application via DomOSClient et ADTP. Le navigateur ne recoit jamais la cle secrete LiveKit ni la cle Google.

## Installation

Pour le serveur :

```bash
pnpm add @domos/adapter-livekit
```

Pour un client React qui rejoint une room :

```bash
pnpm add @domos/react livekit-client
```

`livekit-client` est charge uniquement lorsque le hook React se connecte a une room.

## Par ou commencer

- [Bien debuter avec l'adapter](/livekit/getting-started/) : installation, variables, serveur, endpoint token et client React.
- [Deploy, observabilite et telephonie](/livekit/telephony-deploy-observability/) : guide avance. La telephonie SIP y est encore decrite comme future work.

## Limites actuelles

- L'implementation fournie utilise actuellement Gemini Live et Gemini TTS via les plugins Google de LiveKit.
- Les types du package laissent la porte ouverte a d'autres providers, mais ils ne sont pas encore tous branches par une implementation DomOS prete a l'emploi.
- La telephonie SIP n'est pas implementee.
- Le bridge `AgentSession` est reserve aux usages avances. Pour une premiere integration, utilisez `GeminiLiveAdapter` et `useDomOSLiveKitRoom`.

## Documentation officielle LiveKit

- [Gemini Live API avec LiveKit Agents](https://docs.livekit.io/agents/models/realtime/plugins/gemini/)
- [Gemini TTS avec LiveKit Agents](https://docs.livekit.io/agents/models/tts/gemini/)
- [Vue d'ensemble des modeles LiveKit Agents](https://docs.livekit.io/agents/models/)
