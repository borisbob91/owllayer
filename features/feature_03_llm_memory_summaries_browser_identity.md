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

> En tant qu'utilisateur d'une app intégrant DomOS, je veux que l'agent se souvienne de moi entre les sessions — résumant l'historique, mes préférences implicites et mes contextes — sans qu'un serveur soit nécessaire.

> En tant que développeur qui intègre `@domos/react`, `@domos/vue`, `@domos/svelte` ou `@domos/browser`, je veux activer la mémoire persistante en une ligne, avec une API identique quel que soit le framework.

### Problème actuel

1. `DomosAgent.persistent.preferences` existe mais n'est jamais alimenté — aucun tool LLM, aucun accès depuis les packages framework.
2. Aucun résumé cumulatif : l'historique de session est volatile, l'agent repart de zéro à chaque reload.
3. `userId` dans browser est absent ou mal défini — pas d'identité stable pour lier les sessions.
4. Les packages React/Vue/Svelte n'ont aucune abstraction mémoire — chaque développeur devrait reconstruire tout le câblage à la main.

### Principe architectural

```
@domos/core
├── DomosAgent                   ← runtime mémoire (inchangé)
│   + appendSummary(text)        ← NOUVEAU
├── agent.types.ts
│   AgentPersistentMemory
│   + summaries: AgentSummaryEntry[]  ← NOUVEAU (s'ajoute aux champs existants)
├── getBrowserId()               ← NOUVEAU — UUID stable en localStorage
├── LocalStorageTransport        ← DÉPLACÉ depuis @domos/browser
└── registerMemoryTools(client, agent) ← NOUVEAU — enregistre tool LLM

Chaque package framework expose un wrapper idiomatique :

@domos/browser   → automatique si memory.enabled (câblé feature #02 + tool auto)
@domos/react     → hook useMemory(options)
@domos/vue       → composable useMemory(options)
@domos/svelte    → fonction initMemory(options) + store memorySnapshot
```

**Source unique de vérité** : `registerMemoryTools()` dans `@domos/core`. Un seul endroit. Chaque framework l'appelle — personne ne le réimplémente.

---

## Détail du tool LLM

### `domos_save_summary`

Le LLM appelle ce tool quand il estime utile de mémoriser le contexte courant.  
Il génère un **résumé complet et cumulatif** — pas un delta, pas une liste de facts isolés.

```ts
// Tool declaration (enregistré via registerMemoryTools)
{
  name: 'domos_save_summary',
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

### `DomosAgent.appendSummary(text)` — nouvelle méthode

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
export function getBrowserId(storageKey = 'domos_browser_id'): string {
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
| `domos_browser_id` | `userId` — identité stable du navigateur | Permanente (supprimée si l'user vide localStorage) |
| `domos_session_id` (ou dérivé de `storageKey`) | `sessionId` — par conversation | Session ou regénéré à chaque `init()` |

`DomosAgent.init({ sessionId, userId })` reçoit **les deux** séparément.  
La mémoire persistent est indexée par `userId` → les summaries survivent aux sessions.

---

## `registerMemoryTools(client, agent)` — point central

```ts
// packages/core/src/agent/registerMemoryTools.ts
import type { DomOSClient } from '../client/DomOSClient.js';
import type { DomosAgent } from './DomosAgent.js';

export function registerMemoryTools(
  client: DomOSClient,
  agent: DomosAgent
): () => void {
  client.registerTool({
    declaration: { name: 'domos_save_summary', ... },
    handler: async (args) => {
      agent.appendSummary(String(args.summary));
      return { ok: true };
    },
    componentId: 'domos:memory',
    global: true,
  });

  return () => {
    client.unregisterTool('domos_save_summary');
  };
}
```

Retourne une fonction de cleanup — chaque framework peut l'appeler au unmount.

---

## Déplacement de `LocalStorageTransport`

`LocalStorageTransport` créé en feature #02 dans `@domos/browser/src/runtime/` sera **déplacé** vers `@domos/core/src/agent/LocalStorageTransport.ts`.

**Pourquoi** : `@domos/core` exporte déjà `RemoteMemoryAdapter` qui utilise localStorage avec des guards `typeof localStorage === 'undefined'`. C'est le précédent. Centraliser `LocalStorageTransport` dans `@domos/core` permet à React/Vue/Svelte de l'importer sans dépendre de `@domos/browser`.

**Impact sur feature #02** : l'import dans `BrowserDomOS.ts` passe de `./LocalStorageTransport.js` à `@domos/core`.

---

## Périmètre strict

### Ce que cette feature fait

**`@domos/core`** :
- Ajoute `AgentSummaryEntry` à `agent.types.ts`
- Ajoute `summaries: AgentSummaryEntry[]` à `AgentPersistentMemory` (avec valeur par défaut `[]` dans `createEmptySnapshot()`)
- Ajoute `appendSummary(text: string)` à `DomosAgent`
- Déplace `LocalStorageTransport` depuis `@domos/browser` vers `@domos/core/src/agent/LocalStorageTransport.ts`
- Crée `getBrowserId(storageKey?)` dans `@domos/core/src/agent/getBrowserId.ts`
- Crée `registerMemoryTools(client, agent)` dans `@domos/core/src/agent/registerMemoryTools.ts`
- Exporte tout depuis `packages/core/src/index.ts`

**`@domos/browser`** (`BrowserDomOS.ts`) :
- Utilise `getBrowserId()` pour générer `userId` stable
- Sépare `userId` (stable) et `sessionId` (par session)
- Appelle `registerMemoryTools(this.client, this.domosAgent)` automatiquement si `memory.enabled`
- Met à jour l'import `LocalStorageTransport` vers `@domos/core`

**`@domos/react`** — nouveau hook `useMemory(options?)` :
- Crée `DomosAgent` avec `RemoteMemoryAdapter(LocalStorageTransport)`
- Appelle `getBrowserId()` pour `userId`
- Appelle `registerMemoryTools(client, agent)` au mount, cleanup au unmount
- S'abonne à `onAgentResponse` pour alimenter `agent.onAgentResponse()`
- Wrape `sendText` pour alimenter `agent.onUserRequest()`
- Retourne `{ snapshot: AgentMemorySnapshot | null, appendSummary }`
- Injecte le dernier summary dans le context via `updateContext({ __memory_summary })`

**`@domos/vue`** — nouveau composable `useMemory(options?)` :
- Même logique, retourne des `ref` / `computed` réactifs
- Cleanup dans `onUnmounted`

**`@domos/svelte`** — nouvelle fonction `initMemory(options?)` :
- Intègre avec `domosClient` store existant
- Exporte `memorySnapshot` writable store

### Ce que cette feature ne fait PAS

- Pas de modification du serveur (`@domos/server`)
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
| `@domos/core` | Nouveau champ `summaries[]`, nouvelles méthodes + utils | ✅ Oui — champ optionnel init à `[]` |
| `@domos/browser` | Câblage `getBrowserId` + `registerMemoryTools` + déplacement import | ✅ Oui |
| `@domos/react` | Nouveau hook `useMemory` | ✅ Oui — opt-in |
| `@domos/vue` | Nouveau composable `useMemory` | ✅ Oui — opt-in |
| `@domos/svelte` | Nouvelle fonction `initMemory` + store | ✅ Oui — opt-in |
| `@domos/server` | Aucune | — |

### Fichiers créés

| Fichier | Description |
|---|---|
| `packages/core/src/agent/getBrowserId.ts` | UUID stable localStorage |
| `packages/core/src/agent/registerMemoryTools.ts` | Enregistrement centralisé du tool LLM |
| `packages/core/src/agent/LocalStorageTransport.ts` | Déplacé depuis `@domos/browser` |
| `packages/react/src/hooks/useMemory.ts` | Hook React opt-in |
| `packages/vue/src/composables/useMemory.ts` | Composable Vue opt-in |
| `packages/svelte/src/stores/memory.store.ts` | Store Svelte + `initMemory()` |

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `packages/core/src/agent/agent.types.ts` | + `AgentSummaryEntry` + `summaries` dans `AgentPersistentMemory` |
| `packages/core/src/agent/DomosAgent.ts` | + `appendSummary()` + init `summaries: []` dans `createEmptySnapshot()` |
| `packages/core/src/index.ts` | Exports des nouveaux symboles |
| `packages/browser/src/runtime/BrowserDomOS.ts` | `getBrowserId()`, `registerMemoryTools`, import LST |
| `packages/browser/src/runtime/LocalStorageTransport.ts` | Supprimé (déplacé vers core) |
| `packages/react/src/index.ts` | Export `useMemory` |
| `packages/vue/src/index.ts` | Export `useMemory` |
| `packages/svelte/src/index.ts` | Export `initMemory`, `memorySnapshot` |

### Fichiers non touchés

- `packages/core/src/agent/DomosAgent.ts` (sauf méthode + init snapshot)
- `packages/core/src/agent/RemoteMemoryAdapter.ts`
- `packages/server/**`
- `packages/browser/src/runtime/BrowserDomOSCore.ts` (bundle léger — pas de mémoire agent, intentionnel)

---

## Usage attendu par les développeurs

### Browser (vanilla / widget)
```ts
DomOS.init({
  endpoint: '...',
  apiKey: '...',
  memory: { enabled: true }  // ← tout câblé automatiquement
});
```

### React
```tsx
function App() {
  const { snapshot } = useMemory(); // hook opt-in, crée DomosAgent + tool LLM
  return <DomOSProvider ...><Chat /></DomOSProvider>;
}
```

### Vue
```ts
const { snapshot } = useMemory(); // dans setup()
```

### Svelte
```ts
// dans layout racine
initMemory(); // branche sur domosClient store existant
// dans composant
$memorySnapshot?.persistent.summaries.at(-1)?.text
```

---

## Étapes séquentielles

1. Modifier `agent.types.ts` — `AgentSummaryEntry` + `summaries`
2. Modifier `DomosAgent.ts` — `appendSummary()` + `createEmptySnapshot()`
3. Créer `getBrowserId.ts` dans `@domos/core`
4. Déplacer `LocalStorageTransport.ts` de `@domos/browser` vers `@domos/core`
5. Créer `registerMemoryTools.ts` dans `@domos/core`
6. Mettre à jour `@domos/core/src/index.ts`
7. Mettre à jour `BrowserDomOS.ts` — `getBrowserId`, `registerMemoryTools`, import LST
8. Créer `useMemory.ts` dans `@domos/react`
9. Créer `useMemory.ts` dans `@domos/vue`
10. Créer `memory.store.ts` dans `@domos/svelte`
11. Mettre à jour les index d'exports (react, vue, svelte)
12. Build tous les packages concernés — exit 0
13. Tests unitaires

---

## Tests

- [ ] `pnpm --filter @domos/core build` exit 0
- [ ] `pnpm --filter @domos/browser build` exit 0
- [ ] `pnpm --filter @domos/react build` exit 0
- [ ] `pnpm --filter @domos/vue build` exit 0
- [ ] `pnpm --filter @domos/svelte build` exit 0
- [ ] `getBrowserId()` retourne le même UUID sur deux appels successifs
- [ ] `appendSummary("test")` → `getMemorySnapshot().persistent.summaries.length === 1`
- [ ] Après `flush()` + reload simulé via `loadMemory()`, le summary est présent
- [ ] `registerMemoryTools` enregistre `domos_save_summary` sur le client
- [ ] Tool call `domos_save_summary({ summary: "..." })` appelle `appendSummary`
- [ ] `createEmptySnapshot()` initialise `summaries: []` sans régression sur les tests existants

---

## Critères d'acceptation

- [ ] `packages/core/src/agent/registerMemoryTools.ts` existe — point central unique
- [ ] `LocalStorageTransport` est dans `@domos/core`, pas dans `@domos/browser`
- [ ] `BrowserDomOS` utilise `getBrowserId()` — `userId` stable à vie dans le browser
- [ ] `domos_save_summary` est accessible au LLM quand `memory.enabled`
- [ ] `snapshot.persistent.summaries` est non-null après un call au tool
- [ ] React, Vue, Svelte exposent `useMemory` / `initMemory` dans leur API publique
- [ ] Aucune régression sur les tests existants de `@domos/core` et `@domos/browser`
- [ ] La PR référence ce document : `feat(memory): summaries LLM-driven + getBrowserId + registerMemoryTools (ref feature_03)`
