---
title: "AGENT MEMORY (V1)"
description: Documentation DomOS.
---

# AGENT MEMORY (V1)

Ce document decrit la memoire persistante adaptable de DomOS.

## Vue d'ensemble

- Runtime agent: `DomosAgent` dans `@domos/core` (frontend-first).
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
import { DomOSServer } from '@domos/server';

const server = new DomOSServer({
  llm,
  agentMemory: {
    provider: 'sqlite',
    sqlitePath: './data/domos-memory.db',
    journalMode: 'WAL',
  },
});
```

Options:
- `provider`: `'memory' | 'sqlite' | 'mongo'`
- `sqlitePath`: chemin du fichier SQLite (defaut: `./data/domos-memory.db`)
- `journalMode`: `'WAL' | 'DELETE'` (defaut: `WAL`)

## API memory interne serveur

`DomOSServer` expose:
- `loadAgentMemory(identity)`
- `saveAgentMemory(identity, snapshot)`
- `deleteAgentMemory(identity)`

Identity:
- `sessionId` obligatoire
- `userId` optionnel

## Comportement runtime

- `DomosAgent` hydrate la memoire au `init()`.
- Ecritures debounced (`300ms` par defaut).
- `flush()` force la sauvegarde.
- Lors de fermeture session serveur: `flush` automatique avant cleanup.
