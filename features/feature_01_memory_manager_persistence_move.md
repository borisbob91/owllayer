# Feature #01 : Déplacement de MemoryManager vers persistence/ et suppression des stores dupliqués

**Statut** : 🟡 Validée  
**Domaine** : server  
**Porteur** : @BorisBob  
**Validé par** : @BorisBob  
**Date** : 2026-03-25  

---

## Besoin

### User story

> En tant que contributeur du domaine `server`, je veux que chaque dossier ait une responsabilité unique et claire, afin que le code soit prévisible et maintenable sans avoir à deviner où chercher une classe.

---

## Périmètre strict

### Ce que cette feature fait

- Déplace `packages/server/src/agent/MemoryManager.ts` vers `packages/server/src/persistence/MemoryManager.ts`
- Supprime les deux classes internes dupliquées dans `MemoryManager` : `InMemoryAgentStore` et `MongoAgentStore`
- Remplace ces deux classes par des imports directs des stores originaux : `MemoryStore` (persistence/MemoryStore.ts) et `MongoStore` (persistence/MongoStore.ts)
- Adapte `MongoStore` si nécessaire pour implémenter `AgentMemoryStore` (l'interface de persistence/agentMemory.types.ts) en plus de `SessionStore`
- Met à jour l'import de `MemoryManager` dans `DomOSServer.ts` (chemin relatif uniquement)
- Met à jour l'export de `MemoryManager` dans `packages/server/src/index.ts`
- Supprime le dossier `packages/server/src/agent/` qui devient vide

### Ce que cette feature ne fait PAS (hors scope)

- Pas de modification de la logique interne de `MemoryManager` (méthodes, comportement)
- Pas d'injection de mémoire dans les prompts LLM (feature suivante)
- Pas de modification de `packages/core/src/agent/` (DomosAgent, agent.types, RemoteMemoryAdapter)
- Pas de modification de `persistence/MemoryStore.ts`, `persistence/SQLiteStore.ts`, `persistence/agentMemory.types.ts`
- Pas de modification du domaine `core`, `react`, `vue`, `svelte`, `browser`

> ⚠️ Toute fonctionnalité hors de ce périmètre requiert une nouvelle feature.

---

## Analyse d'impact

### Fonctionnalités existantes pouvant être affectées

| Fonctionnalité | Impact | Mitigation |
|---|---|---|
| `DomOSServer` instanciation de `MemoryManager` | Import mis à jour (chemin relatif) | Changement de chemin uniquement, comportement identique |
| Export public `@domos/server` | `MemoryManager` reste exporté depuis `index.ts` | Re-export mis à jour |
| Tests `MemoryManager.test.ts` | Import du chemin mis à jour | Chemin à corriger dans le test si présent |

### Packages touchés

| Package | Modification | Rétro-compatibilité |
|---|---|---|
| `@domos/server` | Déplacement interne d'un fichier + suppression stores dupliqués | ✅ Oui — API publique inchangée |

### Fichiers qui seront modifiés

| Fichier | Nature de la modification |
|---|---|
| `packages/server/src/agent/MemoryManager.ts` | Supprimé (remplacé par le fichier ci-dessous) |
| `packages/server/src/persistence/MemoryManager.ts` | Créé — contenu de l'ancien fichier, sans `InMemoryAgentStore` ni `MongoAgentStore`, avec imports directs vers `MemoryStore` et `MongoStore` |
| `packages/server/src/persistence/MongoStore.ts` | Étendu pour implémenter `AgentMemoryStore` si les interfaces sont compatibles, sinon adapté minimalement |
| `packages/server/src/core/DomOSServer.ts` | Import `MemoryManager` mis à jour : `../agent/MemoryManager.js` → `../persistence/MemoryManager.js` |
| `packages/server/src/index.ts` | Export `MemoryManager` mis à jour vers le nouveau chemin |
| `packages/server/tests/MemoryManager.test.ts` | Import mis à jour si présent |

### Fichiers qui ne seront PAS modifiés

- `packages/server/src/persistence/MemoryStore.ts`
- `packages/server/src/persistence/SQLiteStore.ts`
- `packages/server/src/persistence/agentMemory.types.ts`
- `packages/server/src/persistence/types.ts`
- `packages/server/src/memory/ConversationBuffer.ts`
- `packages/server/src/memory/SessionGraph.ts`
- `packages/server/src/core/SessionManager.ts`
- `packages/server/src/core/ToolRouter.ts`
- `packages/core/src/agent/DomosAgent.ts`
- `packages/core/src/agent/agent.types.ts`
- `packages/core/src/agent/RemoteMemoryAdapter.ts`
- Tous les packages SDKs (react, vue, svelte, browser)

---

## Implémentation

### Étapes séquentielles

1. **Étape 1** — Créer `packages/server/src/persistence/MemoryManager.ts` avec le contenu de l'ancien fichier, en remplaçant `InMemoryAgentStore` par `MemoryStore` et `MongoAgentStore` par `MongoStore`. Fichier : `persistence/MemoryManager.ts`
2. **Étape 2** — Vérifier que `MongoStore` et `MemoryStore` implémentent `AgentMemoryStore`. Si manque d'interface, adapter minimalement. Fichiers : `persistence/MongoStore.ts` (si besoin)
3. **Étape 3** — Mettre à jour l'import dans `DomOSServer.ts`. Fichier : `core/DomOSServer.ts`
4. **Étape 4** — Mettre à jour l'export dans `index.ts`. Fichier : `server/src/index.ts`
5. **Étape 5** — Mettre à jour l'import dans les tests si présents. Fichier : `tests/MemoryManager.test.ts`
6. **Étape 6** — Supprimer `packages/server/src/agent/MemoryManager.ts` et le dossier `agent/`
7. **Étape 7** — Build + tests

---

## Tests

- [ ] `pnpm --filter @domos/server build` passe avec exit 0
- [ ] `pnpm test` ne régresse pas
- [ ] Vérifier manuellement que `MemoryManager` s'instancie correctement depuis `persistence/`

---

## Critères d'acceptation

- [ ] `packages/server/src/agent/` n'existe plus
- [ ] `packages/server/src/persistence/MemoryManager.ts` existe et compile
- [ ] `InMemoryAgentStore` et `MongoAgentStore` n'existent plus comme classes dupliquées
- [ ] `DomOSServer.ts` importe depuis `../persistence/MemoryManager.js`
- [ ] L'API publique de `@domos/server` est inchangée
- [ ] La PR référence ce document : `refactor: déplacement MemoryManager vers persistence/ (ref feature_01)`
