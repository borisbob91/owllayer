# Feature #03 : Mémoire persistante LLM-driven — summaries cumulatifs et identité browser stable

**Statut** : 🟡 Validée  
**Domaine** : core + browser + react + vue + svelte  
**Porteur** : @BorisBob  
**Validé par** : @BorisBob  
**Date** : 2026-03-25  
**Dépend de** : Feature #02 (LocalStorageTransport et câblage RemoteMemoryAdapter dans browser)

---

## Besoin

### User story

> En tant qu'utilisateur d'une app intégrant OwlLayer, je veux que l'agent se souvienne de moi entre les sessions — résumant l'historique, mes préférences implicites et mes contextes — sans qu'un serveur soit nécessaire.

> En tant que développeur qui intègre `@owllayer/react`, `@owllayer/vue`, `@owllayer/svelte` ou `@owllayer/browser`, je veux activer la mémoire persistante en une ligne, avec une API identique quel que soit le framework.

### Problème actuel

1. `OwlLayerAgent.persistent.preferences` existe mais n'est jamais alimenté — aucun tool LLM, aucun accès depuis les packages framework.
2. Aucun résumé cumulatif : l'historique de session est volatile, l'agent repart de zéro à chaque reload.
3. `userId` dans browser est absent ou mal défini — pas d'identité stable pour lier les sessions.
4. Les packages React/Vue/Svelte n'ont aucune abstraction mémoire — chaque développeur devrait reconstruire tout le câblage à la main.

### Principe architectural

```
@owllayer/core
├── OwlLayerAgent                   ← runtime mémoire (inchangé)
│   + appendSummary(text)        ← NOUVEAU
├── agent.types.ts
│   AgentPersistentMemory
│   + summaries: AgentSummaryEntry[]  ← NOUVEAU (s'ajoute aux champs existants)
├── getBrowserId()               ← NOUVEAU — UUID stable en localStorage
├── LocalStorageTransport        ← DÉPLACÉ depuis @owllayer/browser
└── registerMemoryTools(client, agent) ← NOUVEAU — enregistre tool LLM

Chaque package framework expose un wrapper idiomatique :

@owllayer/browser   → automatique si memory.enabled (câblé feature #02 + tool auto)
@owllayer/react     → hook useMemory(options)
@owllayer/vue       → composable useMemory(options)
@owllayer/svelte    → fonction initMemory(options) + store memorySnapshot
```

**Source unique de vérité** : `registerMemoryTools()` dans `@owllayer/core`. Un seul endroit. Chaque framework l'appelle — personne ne le réimplémente.

---

## Détail du tool LLM

### `owllayer_save_summary`

Le LLM appelle ce tool quand il estime utile de mémoriser le contexte courant.  
Il génère un **résumé complet et cumulatif** — pas un delta, pas une liste de facts isolés.

```ts
// Tool declaration (enregistré via registerMemoryTools)
{
  name: 'owllayer_save_summary',
  description: `Sauvegarde un résumé complet de la session courante et de l'historique connu de l'utilisateur.
Appelle ce tool à la fin d'une session significative, ou quand tu détectes une préférence ou un contexte important à retenir.
Le résumé doit être cumulatif : inclure ce qui était connu avant + ce qui est nouveau.
Format : texte libre, max 500 mots.`,
  parameters: {
    type: 'OBJECT',
    properties: {
      summary: {
        type: 'STRING',
        description: 'Résumé complet et cumulatif de l\'utilisateur et de ses sessions.'
      }
    },
    required: ['summary']
  },
  risk: 'none'
}
```

Le handler appelle `agent.appendSummary(args.summary)` → écrit dans `persistent.summaries[]`.

### Lors du prochain `init()`

Le snapshot est rechargé via `adapter.loadMemory()`.  
Le dernier résumé (ou les N derniers) est injecté dans le `context` du client via `updateContext({ __memory_summary: summaries.at(-1)?.text })`.  
→ L'agent LLM le reçoit dans son contexte passif sans modification du prompt.

---

## Structure de données

### `AgentSummaryEntry` — nouveau type dans `agent.types.ts`

```ts
export interface AgentSummaryEntry {
  text: string;      // résumé complet généré par le LLM
  savedAt: number;   // Date.now() au moment du save
}
```

### `AgentPersistentMemory` — ajout du champ (sans rompre l'existant)

```ts
export interface AgentPersistentMemory {
  preferences: Record<string, unknown>;   // existant — conservé
  objectives: AgentObjective[];           // existant — conservé
  history: AgentHistoryEntry[];           // existant — conservé
  summaries: AgentSummaryEntry[];         // NOUVEAU — tableau cumulatif
}
```

### `OwlLayerAgent.appendSummary(text)` — nouvelle méthode

```ts
appendSummary(text: string): void {
  this.snapshot.persistent.summaries.push({
    text,
    savedAt: Date.now(),
  });
  this.scheduleSave();  // debounce existant
}
```

---

## Identité browser stable — `getBrowserId()`

### Principe

Un UUID généré une fois, stocké en localStorage permanent. Pattern identique à Segment `anonymousId`, Amplitude, Mixpanel.

```ts
// packages/core/src/agent/getBrowserId.ts
export function getBrowserId(storageKey = 'owllayer_browser_id'): string {
  if (typeof localStorage === 'undefined') return 'server';
  const existing = localStorage.getItem(storageKey);
  if (existing) return existing;
  const id = crypto.randomUUID();  // natif, disponible partout
  localStorage.setItem(storageKey, id);
  return id;
}
```

### Deux identités séparées

| Clé localStorage | Rôle | Durée de vie |
|---|---|---|
| `owllayer_browser_id` | `userId` — identité stable du navigateur | Permanente (supprimée si l'user vide localStorage) |
| `owllayer_session_id` (ou dérivé de `storageKey`) | `sessionId` — par conversation | Session ou regénéré à chaque `init()` |

`OwlLayerAgent.init({ sessionId, userId })` reçoit **les deux** séparément.  
La mémoire persistent est indexée par `userId` → les summaries survivent aux sessions.

---

## `registerMemoryTools(client, agent)` — point central

```ts
// packages/core/src/agent/registerMemoryTools.ts
import type { OwlLayerClient } from '../client/OwlLayerClient.js';
import type { OwlLayerAgent } from './OwlLayerAgent.js';

export function registerMemoryTools(
  client: OwlLayerClient,
  agent: OwlLayerAgent
): () => void {
  client.registerTool({
    declaration: { name: 'owllayer_save_summary', ... },
    handler: async (args) => {
      agent.appendSummary(String(args.summary));
      return { ok: true };
    },
    componentId: 'owllayer:memory',
    global: true,
  });

  return () => {
    client.unregisterTool('owllayer_save_summary');
  };
}
```

Retourne une fonction de cleanup — chaque framework peut l'appeler au unmount.

---

## Déplacement de `LocalStorageTransport`

`LocalStorageTransport` créé en feature #02 dans `@owllayer/browser/src/runtime/` sera **déplacé** vers `@owllayer/core/src/agent/LocalStorageTransport.ts`.

**Pourquoi** : `@owllayer/core` exporte déjà `RemoteMemoryAdapter` qui utilise localStorage avec des guards `typeof localStorage === 'undefined'`. C'est le précédent. Centraliser `LocalStorageTransport` dans `@owllayer/core` permet à React/Vue/Svelte de l'importer sans dépendre de `@owllayer/browser`.

**Impact sur feature #02** : l'import dans `BrowserOwlLayer.ts` passe de `./LocalStorageTransport.js` à `@owllayer/core`.

---

## Périmètre strict

### Ce que cette feature fait

**`@owllayer/core`** :
- Ajoute `AgentSummaryEntry` à `agent.types.ts`
- Ajoute `summaries: AgentSummaryEntry[]` à `AgentPersistentMemory` (avec valeur par défaut `[]` dans `createEmptySnapshot()`)
- Ajoute `appendSummary(text: string)` à `OwlLayerAgent`
- Déplace `LocalStorageTransport` depuis `@owllayer/browser` vers `@owllayer/core/src/agent/LocalStorageTransport.ts`
- Crée `getBrowserId(storageKey?)` dans `@owllayer/core/src/agent/getBrowserId.ts`
- Crée `registerMemoryTools(client, agent)` dans `@owllayer/core/src/agent/registerMemoryTools.ts`
- Exporte tout depuis `packages/core/src/index.ts`

**`@owllayer/browser`** (`BrowserOwlLayer.ts`) :
- Utilise `getBrowserId()` pour générer `userId` stable
- Sépare `userId` (stable) et `sessionId` (par session)
- Appelle `registerMemoryTools(this.client, this.owllayerAgent)` automatiquement si `memory.enabled`
- Met à jour l'import `LocalStorageTransport` vers `@owllayer/core`

**`@owllayer/react`** — nouveau hook `useMemory(options?)` :
- Crée `OwlLayerAgent` avec `RemoteMemoryAdapter(LocalStorageTransport)`
- Appelle `getBrowserId()` pour `userId`
- Appelle `registerMemoryTools(client, agent)` au mount, cleanup au unmount
- S'abonne à `onAgentResponse` pour alimenter `agent.onAgentResponse()`
- Wrape `sendText` pour alimenter `agent.onUserRequest()`
- Retourne `{ snapshot: AgentMemorySnapshot | null, appendSummary }`
- Injecte le dernier summary dans le context via `updateContext({ __memory_summary })`

**`@owllayer/vue`** — nouveau composable `useMemory(options?)` :
- Même logique, retourne des `ref` / `computed` réactifs
- Cleanup dans `onUnmounted`

**`@owllayer/svelte`** — nouvelle fonction `initMemory(options?)` :
- Intègre avec `owllayerClient` store existant
- Exporte `memorySnapshot` writable store

### Ce que cette feature ne fait PAS

- Pas de modification du serveur (`@owllayer/server`)
- Pas d'envoi du summary au serveur (feature #04 éventuelle via transport ADTP)
- Pas de suppression de `preferences`, `objectives`, `history` de `AgentPersistentMemory` (rétro-compatibilité)
- Pas de migration de données localStorage existantes
- Pas de truncation automatique du tableau `summaries` (pas de limite — responsabilité du LLM)
- Pas de modification de `RemoteMemoryAdapter`
- Pas d'injection dans le system prompt LLM (uniquement via `updateContext` → Shadow Context)

---

## Analyse d'impact

### Packages touchés

| Package | Modification | Rétro-compatibilité |
|---|---|---|
| `@owllayer/core` | Nouveau champ `summaries[]`, nouvelles méthodes + utils | ✅ Oui — champ optionnel init à `[]` |
| `@owllayer/browser` | Câblage `getBrowserId` + `registerMemoryTools` + déplacement import | ✅ Oui |
| `@owllayer/react` | Nouveau hook `useMemory` | ✅ Oui — opt-in |
| `@owllayer/vue` | Nouveau composable `useMemory` | ✅ Oui — opt-in |
| `@owllayer/svelte` | Nouvelle fonction `initMemory` + store | ✅ Oui — opt-in |
| `@owllayer/server` | Aucune | — |

### Fichiers créés

| Fichier | Description |
|---|---|
| `packages/core/src/agent/getBrowserId.ts` | UUID stable localStorage |
| `packages/core/src/agent/registerMemoryTools.ts` | Enregistrement centralisé du tool LLM |
| `packages/core/src/agent/LocalStorageTransport.ts` | Déplacé depuis `@owllayer/browser` |
| `packages/react/src/hooks/useMemory.ts` | Hook React opt-in |
| `packages/vue/src/composables/useMemory.ts` | Composable Vue opt-in |
| `packages/svelte/src/stores/memory.store.ts` | Store Svelte + `initMemory()` |

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `packages/core/src/agent/agent.types.ts` | + `AgentSummaryEntry` + `summaries` dans `AgentPersistentMemory` |
| `packages/core/src/agent/OwlLayerAgent.ts` | + `appendSummary()` + init `summaries: []` dans `createEmptySnapshot()` |
| `packages/core/src/index.ts` | Exports des nouveaux symboles |
| `packages/browser/src/runtime/BrowserOwlLayer.ts` | `getBrowserId()`, `registerMemoryTools`, import LST |
| `packages/browser/src/runtime/LocalStorageTransport.ts` | Supprimé (déplacé vers core) |
| `packages/react/src/index.ts` | Export `useMemory` |
| `packages/vue/src/index.ts` | Export `useMemory` |
| `packages/svelte/src/index.ts` | Export `initMemory`, `memorySnapshot` |

### Fichiers non touchés

- `packages/core/src/agent/OwlLayerAgent.ts` (sauf méthode + init snapshot)
- `packages/core/src/agent/RemoteMemoryAdapter.ts`
- `packages/server/**`
- `packages/browser/src/runtime/BrowserOwlLayerCore.ts` (bundle léger — pas de mémoire agent, intentionnel)

---

## Usage attendu par les développeurs

### Browser (vanilla / widget)
```ts
OwlLayer.init({
  endpoint: '...',
  apiKey: '...',
  memory: { enabled: true }  // ← tout câblé automatiquement
});
```

### React
```tsx
function App() {
  const { snapshot } = useMemory(); // hook opt-in, crée OwlLayerAgent + tool LLM
  return <OwlLayerProvider ...><Chat /></OwlLayerProvider>;
}
```

### Vue
```ts
const { snapshot } = useMemory(); // dans setup()
```

### Svelte
```ts
// dans layout racine
initMemory(); // branche sur owllayerClient store existant
// dans composant
$memorySnapshot?.persistent.summaries.at(-1)?.text
```

---

## Étapes séquentielles

1. Modifier `agent.types.ts` — `AgentSummaryEntry` + `summaries`
2. Modifier `OwlLayerAgent.ts` — `appendSummary()` + `createEmptySnapshot()`
3. Créer `getBrowserId.ts` dans `@owllayer/core`
4. Déplacer `LocalStorageTransport.ts` de `@owllayer/browser` vers `@owllayer/core`
5. Créer `registerMemoryTools.ts` dans `@owllayer/core`
6. Mettre à jour `@owllayer/core/src/index.ts`
7. Mettre à jour `BrowserOwlLayer.ts` — `getBrowserId`, `registerMemoryTools`, import LST
8. Créer `useMemory.ts` dans `@owllayer/react`
9. Créer `useMemory.ts` dans `@owllayer/vue`
10. Créer `memory.store.ts` dans `@owllayer/svelte`
11. Mettre à jour les index d'exports (react, vue, svelte)
12. Build tous les packages concernés — exit 0
13. Tests unitaires

---

## Tests

- [ ] `pnpm --filter @owllayer/core build` exit 0
- [ ] `pnpm --filter @owllayer/browser build` exit 0
- [ ] `pnpm --filter @owllayer/react build` exit 0
- [ ] `pnpm --filter @owllayer/vue build` exit 0
- [ ] `pnpm --filter @owllayer/svelte build` exit 0
- [ ] `getBrowserId()` retourne le même UUID sur deux appels successifs
- [ ] `appendSummary("test")` → `getMemorySnapshot().persistent.summaries.length === 1`
- [ ] Après `flush()` + reload simulé via `loadMemory()`, le summary est présent
- [ ] `registerMemoryTools` enregistre `owllayer_save_summary` sur le client
- [ ] Tool call `owllayer_save_summary({ summary: "..." })` appelle `appendSummary`
- [ ] `createEmptySnapshot()` initialise `summaries: []` sans régression sur les tests existants

---

## Critères d'acceptation

- [ ] `packages/core/src/agent/registerMemoryTools.ts` existe — point central unique
- [ ] `LocalStorageTransport` est dans `@owllayer/core`, pas dans `@owllayer/browser`
- [ ] `BrowserOwlLayer` utilise `getBrowserId()` — `userId` stable à vie dans le browser
- [ ] `owllayer_save_summary` est accessible au LLM quand `memory.enabled`
- [ ] `snapshot.persistent.summaries` est non-null après un call au tool
- [ ] React, Vue, Svelte exposent `useMemory` / `initMemory` dans leur API publique
- [ ] Aucune régression sur les tests existants de `@owllayer/core` et `@owllayer/browser`
- [ ] La PR référence ce document : `feat(memory): summaries LLM-driven + getBrowserId + registerMemoryTools (ref feature_03)`
