---
title: "OwlLayerAgent Frontend Usage (React/Vue/Svelte/Browser)"
description: Documentation OwlLayer.
---

# OwlLayerAgent Frontend Usage (React/Vue/Svelte/Browser)

## Principe

`OwlLayerAgent` vit cote frontend pour conserver la logique agent locale (session, feedback, contexte), puis synchronise la persistence via un adapter distant.

## Pattern recommande (Hybrid sync)

```ts
import { OwlLayerAgent, RemoteMemoryAdapter } from '@owllayer/core';

const adapter = new RemoteMemoryAdapter({
  transport: {
    load: (identity) => api.memory.load(identity),
    save: (identity, snapshot) => api.memory.save(identity, snapshot),
    delete: (identity) => api.memory.delete(identity),
  },
});

const agent = new OwlLayerAgent({ adapter, saveDebounceMs: 300 });
await agent.init({ sessionId: 'sess_123', userId: 'user_42' });

agent.onUserRequest({ content: 'Planifie mon voyage' });
agent.onAgentResponse({ content: 'Voici un itineraire optimise' });
await agent.flush();
```

## Cas d'usage concrets

1. React:
- creer `OwlLayerAgent` dans le `OwlLayerProvider`
- lire `agent.getMemorySnapshot()` depuis `useAgent`
- appeler `flush()` sur unmount

2. Vue/Svelte:
- stock/composable global pour l'instance `OwlLayerAgent`
- sync memoire via `RemoteMemoryAdapter`

3. Browser SDK:
- `OwlLayer.init` cree un `OwlLayerAgent`
- fallback local automatique (cache localStorage de `RemoteMemoryAdapter`) si reseau KO

## Notes

- Aucun SDK frontend n'a besoin de SQLite directement.
- SQLite reste strictement cote serveur.
