---
title: "DomosAgent Frontend Usage (React/Vue/Svelte/Browser)"
description: Documentation DomOS.
---

# DomosAgent Frontend Usage (React/Vue/Svelte/Browser)

## Principe

`DomosAgent` vit cote frontend pour conserver la logique agent locale (session, feedback, contexte), puis synchronise la persistence via un adapter distant.

## Pattern recommande (Hybrid sync)

```ts
import { DomosAgent, RemoteMemoryAdapter } from '@domos/core';

const adapter = new RemoteMemoryAdapter({
  transport: {
    load: (identity) => api.memory.load(identity),
    save: (identity, snapshot) => api.memory.save(identity, snapshot),
    delete: (identity) => api.memory.delete(identity),
  },
});

const agent = new DomosAgent({ adapter, saveDebounceMs: 300 });
await agent.init({ sessionId: 'sess_123', userId: 'user_42' });

agent.onUserRequest({ content: 'Planifie mon voyage' });
agent.onAgentResponse({ content: 'Voici un itineraire optimise' });
await agent.flush();
```

## Cas d'usage concrets

1. React:
- creer `DomosAgent` dans le `DomOSProvider`
- lire `agent.getMemorySnapshot()` depuis `useAgent`
- appeler `flush()` sur unmount

2. Vue/Svelte:
- stock/composable global pour l'instance `DomosAgent`
- sync memoire via `RemoteMemoryAdapter`

3. Browser SDK:
- `DomOS.init` cree un `DomosAgent`
- fallback local automatique (cache localStorage de `RemoteMemoryAdapter`) si reseau KO

## Notes

- Aucun SDK frontend n'a besoin de SQLite directement.
- SQLite reste strictement cote serveur.
