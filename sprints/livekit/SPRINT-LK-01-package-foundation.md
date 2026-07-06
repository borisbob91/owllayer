---
mode: agent
description: >
  Sprint LK-01 - Fondation package LiveKit, options serveur et contrats types.
---

# Sprint LK-01 - Fondation package LiveKit

**Base :** Sprint LK-00 valide.  
**Perimetre :** package optionnel, exports, types, configuration.  
**Objectif :** preparer une integration LiveKit propre avant Gemini/TTS/AgentSession.

## Objectif

Creer une base package qui permet de brancher LiveKit sans charger cette dependance dans le serveur core par defaut.

## Fichiers cibles

| Fichier | Action |
| --- | --- |
| `packages/adapter-livekit/package.json` | creer package optionnel |
| `packages/adapter-livekit/src/index.ts` | exports publics |
| `packages/adapter-livekit/src/types.ts` | options LiveKit et provider |
| `packages/adapter-livekit/src/LiveKitRuntimeConfig.ts` | config normalisee |
| `packages/adapter-livekit/src/errors.ts` | erreurs adapter |
| `packages/adapter-livekit/tsconfig.json` | config TS |
| `packages/adapter-livekit/tsup.config.ts` ou script equivalent | build |
| `pnpm-workspace.yaml` si necessaire | verifier inclusion package |
| `packages/server/src/index.ts` | ne pas importer LiveKit directement; documenter import externe |

## Dependances candidates

- `@livekit/agents`
- `@livekit/agents-plugin-google`
- `livekit-server-sdk`

Regle: dependances dans `packages/adapter-livekit`, pas dans `packages/server`, sauf contrat necessaire.

## Types a creer

```ts
export interface LiveKitDomOSOptions {
  livekitUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  roomName?: string;
  agentName?: string;
  provider?: 'gemini' | 'openai' | 'livekit-inference' | string;
}

export interface LiveKitModelProviderConfig {
  realtimeModel?: string;
  llmModel?: string;
  sttModel?: string;
  ttsModel?: string;
  voice?: string;
  language?: string;
}
```

## Variables d'environnement a documenter

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `GOOGLE_API_KEY`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`

## Regles de securite

- Ne jamais exposer `LIVEKIT_API_SECRET` au client.
- Ne jamais exposer `GOOGLE_API_KEY` au dashboard.
- Generer les tokens room cote serveur.
- Lier un token LiveKit a une session DomOS ou une API key DomOS.
- Journaliser les creations de room sans secrets.

## Gates

- [ ] `packages/adapter-livekit` build en isolation.
- [ ] Le serveur core ne depend pas directement de LiveKit.
- [ ] Les exports sont minimaux et documentes.
- [ ] Les options ne forcent pas Gemini.
- [ ] Les secrets restent uniquement cote serveur.

