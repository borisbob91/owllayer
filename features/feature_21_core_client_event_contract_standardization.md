# Feature #21 : Sprint 5 — Contrat canonique des événements client-side dans `@owllayer/core`

**Statut** : 🟡 Validée  
**Domaine** : core  
**Porteur** : @BorisBob  
**Validé par** : @BorisBob  
**Date** : 2026-04-01

---

## Objectif

Standardiser les événements utilisés côté client OwlLayer sans toucher à ADTP.

Le besoin est de sortir d'un modèle éclaté de callbacks ad hoc pour converger vers un contrat canonique réutilisable par :

- `@owllayer/core` côté `OwlLayerClient`
- `@owllayer/react` côté provider et hooks
- `@owllayer/vue` côté plugin et composables
- `@owllayer/svelte` côté stores et composables
- `@owllayer/browser` côté runtime browser
- `@owllayer/ui/devtools` côté inspection et debug
- `packages/adapter-*` quand un adapter expose des callbacks ou des événements runtime côté SDK

Le modèle de référence visé est proche de ce qui fonctionne déjà dans Velocity sur la voix live :

- liste fermée d'event types
- union de payloads typés
- map `type -> payload`
- listeners typés par nom d'événement
- listener global possible pour le debug

---

## Positionnement

Ce sprint ne modifie pas ADTP.

Ce sprint ne change pas le transport, le format des messages websocket, ni les `MessageType` serveur.

Ce sprint crée seulement une couche canonique d'événements client-side au-dessus du protocole existant, afin d'améliorer :

- la lisibilité des SDKs
- la DX des intégrateurs
- l'observabilité des DevTools
- la cohérence entre adapters, React, Vue, Svelte, Browser et DevTools UI

---

## Règles de design

1. Ne pas modifier `packages/core/src/protocol/**`.
2. Ne pas renommer les événements ADTP existants.
3. Le contrat canonique doit être purement client-side et framework-agnostic.
4. Les événements canoniques doivent être fermés, typés et exportés publiquement depuis `@owllayer/core`.
5. Le contrat doit supporter un listener ciblé par type et un listener global.
6. Les noms d'événements doivent être stables et orientés DX, pas orientés transport brut.
7. Le contrat doit pouvoir être consommé par `react`, `vue`, `svelte`, `browser`, `ui` et `adapter-google` sans dépendance circulaire.
8. Le contrat doit être adopté au même niveau par React, Vue, Svelte et Browser.
9. Aucun changement de comportement serveur n'est autorisé dans ce sprint.

---

## Diagnostic actuel

Aujourd'hui, les événements sont exposés de manière dispersée :

- `OwlLayerClient` utilise `ClientEventHandlers` à callbacks nommés dans [packages/core/src/client/OwlLayerClient.ts](packages/core/src/client/OwlLayerClient.ts)
- `OwlLayerProvider` recompose une partie de ces callbacks dans [packages/react/src/provider/OwlLayerProvider.tsx](packages/react/src/provider/OwlLayerProvider.tsx)
- `OwlLayerPlugin` Vue reconstruit aussi l'état et les subscriptions audio à partir des callbacks dans [packages/vue/src/plugin/OwlLayerPlugin.ts](packages/vue/src/plugin/OwlLayerPlugin.ts)
- les stores Svelte rejouent les callbacks client dans [packages/svelte/src/stores/owllayer.store.ts](packages/svelte/src/stores/owllayer.store.ts)
- `BrowserOwlLayer` fait son propre mapping callbacks -> runtime state dans [packages/browser/src/runtime/BrowserOwlLayer.ts](packages/browser/src/runtime/BrowserOwlLayer.ts)
- `useDevTools` et `@owllayer/ui/devtools` lisent de l'état au polling au lieu de consommer un flux standardisé dans [packages/react/src/plugins/useDevTools.ts](packages/react/src/plugins/useDevTools.ts) et [packages/ui/src/devtools/index.ts](packages/ui/src/devtools/index.ts)
- Vue et Svelte montent aussi `@owllayer/ui/devtools` via getters/polling dans [packages/vue/src/composables/useDevTools.ts](packages/vue/src/composables/useDevTools.ts) et [packages/svelte/src/composables/createDevTools.ts](packages/svelte/src/composables/createDevTools.ts)
- Browser monte lui aussi `@owllayer/ui/devtools` via getters/polling dans [packages/browser/src/runtime/BrowserOwlLayer.ts](packages/browser/src/runtime/BrowserOwlLayer.ts)
- `GoogleLiveAdapter` expose lui aussi un lot de callbacks hétérogènes (`onAudioOutput`, `onTranscript`, `onTextOutput`, `onInterrupted`, `onWaitingForInput`, `onClose`, `onError`) dans [packages/adapter-google/src/GoogleLiveAdapter.ts](packages/adapter-google/src/GoogleLiveAdapter.ts)

Le résultat est un modèle DX éclaté :

- pas de liste fermée d'event types
- pas de `EventMap` commune
- pas de listener global cohérent pour le debug
- pas de bridge uniforme entre adapters, React, Vue, Svelte, Browser et UI

---

## APRÈS

`@owllayer/core` devient la source de vérité du contrat d'événements client-side.

Le package exporte :

- une liste de `OWLLAYER_CLIENT_EVENT_TYPES`
- un type `OwlLayerClientEventType`
- une union `OwlLayerClientEvent`
- une map `OwlLayerClientEventMap`
- des helpers de listener typé
- un mini emitter réutilisable côté client SDK

Le contrat couvre au minimum les familles suivantes :

- `connection.state.changed`
- `session.started`
- `agent.response.delta`
- `agent.response.done`
- `turn.started`
- `turn.completed`
- `turn.interrupted`
- `turn.waiting_for_input`
- `playback.completed`
- `tool.registry.synced`
- `tool.call.requested`
- `approval.requested`
- `audio.output.chunk`
- `line.state.changed`
- `system.error`

---

## POURQUOI

Sans contrat central, chaque package reconstruit son propre vocabulaire d'événements.

À court terme, cela rend le DevTools plus difficile à fiabiliser.

À moyen terme, cela empêche de proposer :

- des hooks/composables `useOwlLayerEvent()` ou équivalents propres
- des logs DevTools structurés
- des adapters consommables avec une DX uniforme
- des intégrations client plus simples pour React, Vue, Svelte et Browser

---

## Fichiers impactés

| Fichier | AVANT | APRÈS | POURQUOI |
|---|---|---|---|
| `packages/core/src/client/OwlLayerClient.ts` | callbacks ad hoc seulement | branchement sur un contrat d'événements canonique | centraliser la DX client-side |
| `packages/core/src/client/events.ts` | absent | types, constantes, map d'événements canoniques | rendre le contrat public |
| `packages/core/src/client/EventEmitter.ts` | absent | emitter typé minimal | éviter de réinventer un bus par package |
| `packages/core/src/index.ts` | exports client existants | exports du contrat d'événements | surface publique stable |

### Ce qui ne sera pas modifié

- `packages/core/src/protocol/**`
- `packages/server/**`
- `packages/react/**`
- `packages/browser/**`
- `packages/ui/**`
- `packages/adapter-google/**`

---

## Interface cible

### Types publics

```ts
export const OWLLAYER_CLIENT_EVENT_TYPES = [
  'connection.state.changed',
  'session.started',
  'agent.response.delta',
  'agent.response.done',
  'turn.started',
  'turn.completed',
  'turn.interrupted',
  'turn.waiting_for_input',
  'playback.completed',
  'tool.registry.synced',
  'tool.call.requested',
  'approval.requested',
  'audio.output.chunk',
  'line.state.changed',
  'system.error',
] as const;

export type OwlLayerClientEventType = typeof OWLLAYER_CLIENT_EVENT_TYPES[number];

export interface OwlLayerClientEventMap {
  'connection.state.changed': { previous: ClientState; current: ClientState };
  'session.started': { sessionId: string };
  'agent.response.delta': { text: string };
  'agent.response.done': { text: string };
  'turn.started': { source: 'provider' | 'server' | 'client'; sessionId?: string };
  'turn.completed': { source: 'provider' | 'server' | 'client'; sessionId?: string };
  'turn.interrupted': { source: 'provider' | 'server' | 'client'; reason?: string; sessionId?: string };
  'turn.waiting_for_input': { source: 'provider' | 'server' | 'client'; sessionId?: string };
  'playback.completed': { source: 'browser' | 'sdk'; sessionId?: string };
  'tool.registry.synced': { tools: ToolDeclaration[] };
  'tool.call.requested': { callId: string; name: string; args: Record<string, unknown> };
  'approval.requested': { callId: string; toolName: string; risk: 'high' | 'critical' };
  'audio.output.chunk': { audioBase64: string; mimeType: string };
  'line.state.changed': { lineNumber: string | null; waiting: boolean; state: 'idle' | 'waiting' | 'busy' };
  'system.error': { message: string; kind?: string };
}
```

Point de design important :

- `agent.response.done` signifie fin de génération côté runtime
- `turn.completed` signifie fin de tour conversationnel
- `playback.completed` signifie fin réelle de restitution audio là où le SDK peut la connaître

Ces trois signaux ne doivent pas être confondus dans le contrat DX.

### API minimale côté client

```ts
client.onEvent('session.started', (event) => { ... });
client.onAnyEvent((event) => { ... });
client.offEvent(...);
```

Les callbacks historiques `on({ onSessionId, onAgentResponse, ... })` restent compatibles pendant la phase d'adoption.

---

## Plan journalier

### Jour 1 — Audit et verrouillage du vocabulaire

- relever tous les callbacks actuellement exposés par `OwlLayerClient`
- identifier les événements vraiment utiles côté DX
- distinguer explicitement fin de génération, fin de tour et fin de playback
- figer la liste fermée des event types canoniques

**Livrable Jour 1**
- vocabulaire canonique validé

### Jour 2 — Types publics du contrat

- créer `events.ts`
- définir constantes, union, map et helpers de listener
- définir la structure d'un emitter typé minimal

**Livrable Jour 2**
- contrat public `@owllayer/core` écrit et exportable

### Jour 3 — Intégration `OwlLayerClient`

- brancher l'emitter dans `OwlLayerClient`
- conserver les callbacks historiques
- émettre les événements canoniques depuis les points déjà existants

**Livrable Jour 3**
- `OwlLayerClient` émet un flux canonique parallèle aux callbacks historiques

### Jour 4 — Compatibilité et validation de surface publique

- exporter le contrat depuis `packages/core/src/index.ts`
- vérifier qu'aucune API publique existante n'est cassée
- documenter la coexistence temporaire callbacks + events

**Livrable Jour 4**
- surface publique stable

### Jour 5 — Gate core

- `pnpm --filter @owllayer/core build`
- validation de non-régression type-level
- vérification explicite : aucun changement dans `protocol/**`

**Livrable Jour 5**
- base canonique prête pour adoption par les packages aval

Le contrat produit par ce sprint est explicitement destiné à l'adoption par :

- `@owllayer/react`
- `@owllayer/vue`
- `@owllayer/svelte`
- `@owllayer/browser`
- `@owllayer/ui/devtools`

---

## Gate fin de sprint

Le sprint est fini uniquement si :

1. `@owllayer/core` exporte un contrat d'événements client-side stable
2. `OwlLayerClient` sait émettre ces événements sans casser les callbacks existants
3. le contrat modélise explicitement `turn.started`, `turn.completed`, `turn.interrupted`, `turn.waiting_for_input` et `playback.completed`
4. aucun fichier de `packages/core/src/protocol/**` n'est modifié
5. `pnpm --filter @owllayer/core build` passe

---

## Ce qu'on ne fait pas

- modifier ADTP
- renommer les `MessageType`
- changer le comportement runtime du serveur
- réécrire les SDKs dans ce sprint
