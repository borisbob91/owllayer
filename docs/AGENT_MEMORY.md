# AGENT MEMORY (V1)

Ce document decrit la memoire persistante adaptable de OwlLayer.

## Vue d'ensemble

- Runtime agent: `OwlLayerAgent` dans `@owllayer/core` (frontend-first).
- Persistence durable: geree cote serveur via `MemoryManager`.
- Contrat commun: `MemoryAdapter` (independant du backend).

## Backends supportes

| Backend | Usage | Persistance |
| --- | --- | --- |
| `MemoryStore` | Dev/tests, zero dependance | Non (RAM uniquement) |
| `SQLiteStore` | Recommande sans Mongo | Oui (fichier local) |
| `MongoStore` | Deploy distribue optionnel | Oui (MongoDB) |

## Configuration serveur

```ts
import { OwlLayerServer } from '@owllayer/server';

const server = new OwlLayerServer({
  llm,
  agentMemory: {
    provider: 'sqlite',
    sqlitePath: './data/owllayer-memory.db',
    journalMode: 'WAL',
  },
});
```

Options:
- `provider`: `'memory' | 'sqlite' | 'mongo'`
- `sqlitePath`: chemin du fichier SQLite (defaut: `./data/owllayer-memory.db`)
- `journalMode`: `'WAL' | 'DELETE'` (defaut: `WAL`)

## API memory interne serveur

`OwlLayerServer` expose:
- `loadAgentMemory(identity)`
- `saveAgentMemory(identity, snapshot)`
- `deleteAgentMemory(identity)`

Identity:
- `sessionId` obligatoire
- `userId` optionnel

## Comportement runtime

- `OwlLayerAgent` hydrate la memoire au `init()`.
- Ecritures debounced (`300ms` par defaut).
- `flush()` force la sauvegarde.
- Lors de fermeture session serveur: `flush` automatique avant cleanup.
