# Feature #02 : Câblage du RemoteMemoryAdapter dans BrowserOwlLayer (persistance localStorage)

**Statut** : 🟡 Validée  
**Domaine** : browser  
**Porteur** : @BorisBob  
**Validé par** : @BorisBob  
**Date** : 2026-03-25  
**Dépend de** : Feature #01 (aucun — domaines orthogonaux, peuvent s'implémenter en parallèle)

---

## Besoin

### User story

> En tant que développeur qui intègre `@owllayer/browser` avec `memory.enabled: true`, je veux que la mémoire de session persiste entre les rechargements de page, afin que l'agent se souvienne des préférences et de l'historique sans nécessiter un serveur de persistance.

### Problème actuel

```ts
// BrowserOwlLayer.ts ligne 214 — aujourd'hui
this.owllayerAgent = new OwlLayerAgent({ saveDebounceMs: 500 });
//                                 ^^^ aucun adapter passé
```

`OwlLayerAgent` appelle `adapter.saveMemory()` à chaque debounce — mais sans adapter, la sauvegarde ne se produit jamais. La mémoire est entièrement volatile : perdue à chaque reload, inutile en pratique.

`RemoteMemoryAdapter` existe dans `@owllayer/core` précisément pour ce cas, mais n'est jamais instancié dans `@owllayer/browser`. Il attend un `RemoteMemoryTransport` :

```ts
interface RemoteMemoryTransport {
  load(identity: AgentIdentity): Promise<AgentMemorySnapshot | null>;
  save(identity: AgentIdentity, snapshot: AgentMemorySnapshot): Promise<void>;
  delete(identity: AgentIdentity): Promise<void>;
}
```

Il n'existe aucun transport concret dans `@owllayer/browser` qui implémente ce contrat.

### Principe architectural (source de vérité unique)

```
MemoryAdapter  ← interface unique (@owllayer/core/agent.types)
     │
     ├── [server]  MemoryManager.getAdapter()
     │             └── SQLiteStore | InMemoryAgentStore | MongoStore
     │
     └── [browser] RemoteMemoryAdapter(@owllayer/core)
                   └── LocalStorageTransport        ← À CRÉER
                       (localStorage-only, sans serveur requis)
                       │
                       └── [futur] RemoteMemoryTransport via ADTP
                                   (swap de transport, OwlLayerAgent inchangé)
```

Un seul runtime : `OwlLayerAgent`. Une seule interface : `MemoryAdapter`. Chaque contexte injecte son adapter — le runtime ne connaît pas le backend.

---

## Périmètre strict

### Ce que cette feature fait

1. Crée `packages/browser/src/runtime/LocalStorageTransport.ts`
   - Classe `LocalStorageTransport implements RemoteMemoryTransport`
   - `load(identity)` : lit depuis `localStorage` (clé dérivée de `sessionId + userId`)
   - `save(identity, snapshot)` : écrit en `localStorage` avec JSON.stringify
   - `delete(identity)` : supprime la clé
   - Résistant aux erreurs de quota / localStorage désactivé (no-op sur catch)

2. Modifie `packages/browser/src/runtime/BrowserOwlLayer.ts` ligne 214
   - Instancie `RemoteMemoryAdapter` avec `LocalStorageTransport` avant de créer `OwlLayerAgent`
   - Passe l'adapter à `new OwlLayerAgent({ adapter, saveDebounceMs: 500 })`
   - Lit `cacheKeyPrefix` depuis `config.memory.storageKey` pour l'isolation par app

3. Étend le type `memory` dans `packages/browser/src/types.ts`
   - Ajoute le champ optionnel `transport?: RemoteMemoryTransport`
   - Permet aux intégrateurs avancés d'injecter leur propre transport (ex: ADTP futur)
   - Si absent → `LocalStorageTransport` par défaut

4. Exporte depuis `packages/browser/src/index.ts`
   - `LocalStorageTransport`
   - `RemoteMemoryTransport` (re-export du type depuis `@owllayer/core`)
   - Permet aux intégrateurs d'implémenter leur propre transport

### Ce que cette feature ne fait PAS (hors scope)

- Pas de transport ADTP vers le serveur (aucune modification côté `@owllayer/server`)
- Pas de modification de `RemoteMemoryAdapter.ts` dans `@owllayer/core`
- Pas de modification de `OwlLayerAgent.ts` dans `@owllayer/core`
- Pas de modification de `agent.types.ts` dans `@owllayer/core`
- Pas d'injection mémoire dans les prompts LLM (feature #03 éventuelle)
- Pas de synchronisation temps-réel entre onglets (problème différent)
- Pas de migration des données localStorage existantes (format inchangé)
- Pas de modification du domaine `server`

> ⚠️ Toute fonctionnalité hors de ce périmètre requiert une nouvelle feature.

---

## Analyse d'impact

### Changement de comportement observable

| Avant | Après |
|---|---|
| `memory.enabled: true` → mémoire perdue au reload | `memory.enabled: true` → mémoire survit au reload via localStorage |
| `OwlLayerAgent.saveMemory()` silencieux (no adapter) | `OwlLayerAgent.saveMemory()` écrit en localStorage à chaque debounce |
| `getMemorySnapshot()` ne retourne que la session courante | `getMemorySnapshot()` retourne la session + préférences rechargées |

### Rétro-compatibilité

- Aucun breaking change : `memory.enabled` était déjà le flag opt-in
- Les apps n'utilisant pas `memory.enabled` : comportement inchangé
- `storageKey` existait déjà dans le type — sa sémantique s'étend légèrement (devient aussi le `cacheKeyPrefix` de l'adapter)

### Packages touchés

| Package | Modification | Rétro-compatibilité |
|---|---|---|
| `@owllayer/browser` | Nouveau fichier + câblage BrowserOwlLayer + type étendu | ✅ Oui |
| `@owllayer/core` | Aucune | — |
| `@owllayer/server` | Aucune | — |

### Fichiers qui seront modifiés/créés

| Fichier | Nature |
|---|---|
| `packages/browser/src/runtime/LocalStorageTransport.ts` | CRÉÉ — implémente `RemoteMemoryTransport` |
| `packages/browser/src/runtime/BrowserOwlLayer.ts` | Modifié — câble `RemoteMemoryAdapter` + `LocalStorageTransport` à la ligne ~214 |
| `packages/browser/src/types.ts` | Modifié — champ `transport?: RemoteMemoryTransport` dans `memory` |
| `packages/browser/src/index.ts` | Modifié — export de `LocalStorageTransport` et re-export du type `RemoteMemoryTransport` |
| `packages/browser/tests/memory.test.ts` | Modifié — adapter le mock pour tenir compte du wiring `RemoteMemoryAdapter` |

### Fichiers qui ne seront PAS modifiés

- `packages/core/src/agent/RemoteMemoryAdapter.ts`
- `packages/core/src/agent/OwlLayerAgent.ts`
- `packages/core/src/agent/agent.types.ts`
- `packages/core/src/index.ts`
- `packages/server/**`
- `packages/react/**`, `packages/vue/**`, `packages/svelte/**`

---

## Implémentation

### Étape 1 — Créer `LocalStorageTransport.ts`

```ts
// packages/browser/src/runtime/LocalStorageTransport.ts
import type { AgentIdentity, AgentMemorySnapshot } from '@owllayer/core';
import type { RemoteMemoryTransport } from '@owllayer/core';

function key(identity: AgentIdentity, prefix: string): string {
  return `${prefix}:${identity.userId ?? 'anon'}:${identity.sessionId}`;
}

export class LocalStorageTransport implements RemoteMemoryTransport {
  constructor(private readonly prefix: string = 'owllayer:agent-memory') {}

  async load(identity: AgentIdentity): Promise<AgentMemorySnapshot | null> {
    try {
      const raw = localStorage.getItem(key(identity, this.prefix));
      return raw ? (JSON.parse(raw) as AgentMemorySnapshot) : null;
    } catch { return null; }
  }

  async save(identity: AgentIdentity, snapshot: AgentMemorySnapshot): Promise<void> {
    try {
      localStorage.setItem(key(identity, this.prefix), JSON.stringify(snapshot));
    } catch { /* quota ou désactivé */ }
  }

  async delete(identity: AgentIdentity): Promise<void> {
    try { localStorage.removeItem(key(identity, this.prefix)); } catch { /* no-op */ }
  }
}
```

### Étape 2 — Câbler dans `BrowserOwlLayer.ts`

Remplacer (ligne ~214) :
```ts
this.owllayerAgent = new OwlLayerAgent({ saveDebounceMs: 500 });
```

Par :
```ts
const transport = (config.memory as { transport?: RemoteMemoryTransport })?.transport
  ?? new LocalStorageTransport(memKey);
const adapter = new RemoteMemoryAdapter({ transport, cacheKeyPrefix: memKey });
this.owllayerAgent = new OwlLayerAgent({ adapter, saveDebounceMs: 500 });
```

### Étape 3 — Étendre le type `OwlLayerBrowserConfig.memory`

```ts
memory?: {
  enabled?: boolean;
  storageKey?: string;
  userId?: string;
  /** Transport custom (ex: ADTP futur). Par défaut: LocalStorageTransport */
  transport?: RemoteMemoryTransport;
};
```

### Étape 4 — Exports

```ts
// packages/browser/src/index.ts
export { LocalStorageTransport } from './runtime/LocalStorageTransport.js';
export type { RemoteMemoryTransport } from '@owllayer/core';
```

### Étapes séquentielles

1. Créer `LocalStorageTransport.ts`
2. Câbler dans `BrowserOwlLayer.ts`
3. Étendre le type dans `types.ts`
4. Mettre à jour `index.ts`
5. Adapter `tests/memory.test.ts`
6. `pnpm --filter @owllayer/browser build` → exit 0
7. `pnpm test` → tous les tests passent

---

## Tests

- [ ] `pnpm --filter @owllayer/browser build` passe avec exit 0
- [ ] `pnpm --filter @owllayer/core build` inchangé, exit 0
- [ ] `pnpm test` ne régresse pas
- [ ] Test unitaire : `LocalStorageTransport.save()` puis `LocalStorageTransport.load()` retourne le même snapshot
- [ ] Test intégration : `BrowserOwlLayer.init({ memory: { enabled: true } })` → `getMemorySnapshot()` non null après un `sendText()`

---

## Critères d'acceptation

- [ ] `packages/browser/src/runtime/LocalStorageTransport.ts` existe et compile
- [ ] `BrowserOwlLayer` avec `memory.enabled: true` instancie `OwlLayerAgent` avec un adapter non-null
- [ ] `getMemorySnapshot()` retourne un snapshot rechargeable (data persistée en localStorage)
- [ ] Un `transport` custom passé via `config.memory.transport` est utilisé à la place de `LocalStorageTransport`
- [ ] `LocalStorageTransport` est exporté dans l'API publique de `@owllayer/browser`
- [ ] Aucun changement dans `@owllayer/core` ou `@owllayer/server`
- [ ] La PR référence ce document : `feat(browser): câblage RemoteMemoryAdapter + LocalStorageTransport (ref feature_02)`
