# Feature #23 : Sprint 7 — Adoption multi-SDK du contrat d'événements canonique pour une DX client plus simple

**Statut** : 🟡 Validée  
**Domaine** : react + vue + svelte + browser + ui (séquentiel)  
**Porteur** : @BorisBob  
**Validé par** : @BorisBob  
**Date** : 2026-04-01

---

## Objectif

Exploiter le contrat d'événements canonique côté `react`, `vue`, `svelte`, `browser` et `ui` pour simplifier la DX client et le debug.

Ce sprint couvre trois phases séquentielles dans une même logique de livraison :

- Phase A `react + vue + svelte + browser` : rendre le flux d'événements exploitable par les providers, plugins, stores, composables et runtimes
- Phase B `bridges DevTools` : faire passer ce flux à `@domos/ui/devtools` depuis tous les SDKs front
- Phase C `ui` : faire consommer ce flux par `@domos/ui/devtools` au lieu de dépendre principalement du polling et d'états reconstruits

---

## Positionnement

Le besoin n'est pas de réécrire les SDKs front ni les DevTools.

Le besoin est de supprimer le modèle DX actuel trop dispersé :

- lecture d'état via plusieurs getters
- callbacks traduits à la main dans `DomOSProvider`, `DomOSPlugin`, les stores Svelte et `BrowserDomOS`
- DevTools qui lit surtout `getRegisteredTools()` et `getAgentState()` au polling

La cible est un modèle plus simple côté client et dev :

- un flux d'événements unique
- des hooks/composables plus simples
- un DevTools qui sait afficher des événements récents et converger plus vite vers l'état réel
- une distinction exploitable entre fin de génération, fin de tour et fin réelle de playback

---

## Règles de design

1. Ne pas modifier ADTP.
2. `react` et `ui` ne doivent jamais importer depuis `apps/**`.
3. React, Vue, Svelte et Browser consomment le contrat d'événements via `@domos/core`.
4. `ui/devtools` ne parle pas directement à ADTP ni au serveur.
5. Le polling existant peut rester comme filet transitoire, mais ne doit plus être la seule source de vérité live.
6. Toute nouvelle API DX doit rester optionnelle et compatible avec l'existant.

---

## Diagnostic actuel

Dans [packages/react/src/provider/DomOSProvider.tsx](packages/react/src/provider/DomOSProvider.tsx), le provider reconstruit déjà un modèle d'état à partir des callbacks de `DomOSClient`.

Dans [packages/vue/src/plugin/DomOSPlugin.ts](packages/vue/src/plugin/DomOSPlugin.ts), le plugin Vue reconstruit lui aussi état, audio output et approvals à partir des callbacks.

Dans [packages/svelte/src/stores/domos.store.ts](packages/svelte/src/stores/domos.store.ts), les stores rejouent ces mêmes callbacks vers des stores et listeners locaux.

Dans [packages/browser/src/runtime/BrowserDomOS.ts](packages/browser/src/runtime/BrowserDomOS.ts), le runtime browser remappe encore les callbacks de `DomOSClient` vers son propre état agent, ses overlays et son widget.

Dans [packages/react/src/plugins/useDevTools.ts](packages/react/src/plugins/useDevTools.ts), le bridge vers `@domos/ui/devtools` injecte :

- `plugins`
- `getRegisteredTools`
- `callTool`
- `getAgentState`
- `getSessionId`

Mais pas de flux d'événements standardisé.

Vue, Svelte et Browser reproduisent le même modèle de bridge getters-only dans :

- [packages/vue/src/composables/useDevTools.ts](packages/vue/src/composables/useDevTools.ts)
- [packages/svelte/src/composables/createDevTools.ts](packages/svelte/src/composables/createDevTools.ts)
- [packages/browser/src/runtime/BrowserDomOS.ts](packages/browser/src/runtime/BrowserDomOS.ts)

Dans [packages/ui/src/devtools/index.ts](packages/ui/src/devtools/index.ts), le contrat DevTools ne reçoit pas encore d'abonnement à des événements canoniques. Le panneau reconstruit donc surtout l'état à partir de polling, surtout dans [packages/ui/src/devtools/DevToolsPanel.tsx](packages/ui/src/devtools/DevToolsPanel.tsx) et [packages/ui/src/devtools/StateMonitor.tsx](packages/ui/src/devtools/StateMonitor.tsx).

Conséquence directe aujourd'hui :

- `agent.response.done` est souvent interprété comme fin de réponse
- les événements de turn ne sont pas exposés uniformément
- `BrowserDomOS` possède une notion locale de fin réelle de playback, mais elle n'est pas encore standardisée comme surface DX commune à React, Vue, Svelte et Browser

---

## APRÈS

### Phase A — React / Vue / Svelte / Browser

Les SDKs front exposent une DX simplifiée fondée sur les événements :

- `subscribeEvent`
- `subscribeAnyEvent`
- éventuellement un hook/composable `useDomOSEvent(type, handler)` ou équivalent
- éventuellement une surface `useDomOSEventLog()` ou équivalent en dev

Les événements suivants deviennent consommables partout avec le même vocabulaire :

- `turn.started`
- `turn.completed`
- `turn.interrupted`
- `turn.waiting_for_input`
- `playback.completed` là où le SDK peut réellement le connaître

`DomOSProvider`, `DomOSPlugin`, les stores Svelte et `BrowserDomOS` cessent d'être les seules couches à connaître le détail des callbacks historiques.

### Phase B — Bridges DevTools

Les bridges React/Vue/Svelte/Browser vers `@domos/ui/devtools` transmettent désormais :

```ts
subscribeEvent(type, listener)
subscribeAnyEvent(listener)
```

au même titre que les getters déjà existants.

### Phase C — UI DevTools

`@domos/ui/devtools` reçoit un contrat enrichi du type :

```ts
subscribeEvent(type, listener)
subscribeAnyEvent(listener)
```

Le DevTools peut alors :

- afficher les derniers événements utiles
- mieux refléter la vie réelle des tools et de la session
- détecter rapidement les changements sans dépendre exclusivement du polling
- distinguer explicitement `agent.response.done`, `turn.completed` et `playback.completed`

---

## POURQUOI

Le vrai gain DX n'arrive pas au moment où `core` définit des types.

Le gain arrive quand React, Vue, Svelte, Browser et `ui` arrêtent de reconstruire chacun leur propre lecture du runtime.

Ce sprint transforme le contrat canonique en bénéfice concret pour :

- les hooks et composables client
- les DevTools
- les intégrateurs React, Vue, Svelte et Browser

Le sprint est raté si les bridges ou le DevTools continuent à confondre :

- fin de génération
- fin de tour conversationnel
- fin réelle de playback

---

## Fichiers impactés

### Phase A — React

| Fichier | AVANT | APRÈS | POURQUOI |
|---|---|---|---|
| `packages/react/src/provider/DomOSContext.ts` | contexte centré getters + actions | ajout des surfaces d'abonnement events | DX hooks/dev plus simple |
| `packages/react/src/provider/DomOSProvider.tsx` | callbacks de `DomOSClient` traduits localement | exposition du flux canonique vers le contexte | réduire la duplication locale |
| `packages/react/src/hooks/useAgent.ts` | lecture état/action | éventuellement lecture du flux canonique | hook plus simple et plus riche |
| `packages/react/src/plugins/useDevTools.ts` | bridge getters/callTool seulement | bridge getters + events | DevTools live plus fidèle |
| `packages/react/src/hooks/useDomOSEvent.ts` | absent | hook dédié | DX client simple |

### Phase A bis — Vue / Svelte / Browser

| Fichier | AVANT | APRÈS | POURQUOI |
|---|---|---|---|
| `packages/vue/src/plugin/DomOSPlugin.ts` | callbacks de `DomOSClient` traduits localement | exposition du flux canonique vers le plugin et les composables | réduire la duplication locale |
| `packages/vue/src/composables/useDevTools.ts` | bridge getters seulement | bridge getters + events | DevTools live plus fidèle |
| `packages/svelte/src/stores/domos.store.ts` | stores alimentés par callbacks locaux | exposition du flux canonique vers les stores et listeners | DX Svelte plus uniforme |
| `packages/svelte/src/composables/createDevTools.ts` | bridge getters seulement | bridge getters + events | DevTools live plus fidèle |
| `packages/browser/src/runtime/BrowserDomOS.ts` | runtime browser fondé sur callbacks nommés | exposition du flux canonique pour le runtime et le DevTools | DX browser uniforme |

### Distinction sémantique à préserver

- `agent.response.done` : fin de génération côté runtime
- `turn.completed` : fin de tour conversationnel
- `playback.completed` : fin réelle de restitution audio, disponible surtout côté browser/runtime qui pilote le lecteur

### Phase C — UI

| Fichier | AVANT | APRÈS | POURQUOI |
|---|---|---|---|
| `packages/ui/src/devtools/index.ts` | contrat DevTools sans event stream | contrat enrichi avec `subscribeEvent` | brancher le flux canonique |
| `packages/ui/src/devtools/DevToolsPanel.tsx` | synthèse surtout au polling | synthèse + écoute d'événements | meilleure convergence live |
| `packages/ui/src/devtools/StateMonitor.tsx` | historique reconstruit localement | historique nourri par événements canoniques | debug plus fiable |
| `packages/ui/src/devtools/ToolsInspector.tsx` | inventaire live au polling | inventaire piloté par events + fallback polling | meilleure perception du hot reload |

### Ce qui ne sera pas modifié

- `packages/server/**`
- `packages/adapter-google/**`
- `apps/**`
- `packages/core/src/protocol/**`

---

## Plan journalier

### Jour 1 — Audit multi-SDK du flux actuel

- relever les usages actuels des callbacks de `DomOSClient` dans React, Vue, Svelte et Browser
- relever les besoins réels du DevTools
- figer le contrat minimal que les SDKs front passeront à `ui`

**Livrable Jour 1**
- matrice `react/vue/svelte/browser -> ui/devtools`

### Jour 2 — Phase A React : contexte et hook

- enrichir `DomOSContext`
- brancher le flux canonique dans `DomOSProvider`
- ajouter un hook simple d'abonnement

**Livrable Jour 2**
- `react` sait consommer les événements canoniques proprement

### Jour 3 — Phase A Vue / Svelte / Browser : bridges SDK

- enrichir `DomOSPlugin`
- enrichir les stores Svelte
- enrichir `BrowserDomOS`
- exposer explicitement les événements de turn dans les trois SDKs
- faire remonter `playback.completed` dans Browser comme événement public standard là où le runtime sait réellement le détecter
- préparer des surfaces d'abonnement cohérentes par SDK

**Livrable Jour 3**
- Vue, Svelte et Browser savent consommer les événements canoniques proprement

### Jour 4 — Phase B Bridges DevTools

- enrichir `useDevTools`, `useDevTools` Vue, `createDevTools` Svelte et `mountDevTools` Browser
- passer les abonnements `subscribeEvent` / `subscribeAnyEvent`

**Livrable Jour 4**
- `ui/devtools` peut recevoir un flux live depuis React, Vue, Svelte et Browser

### Jour 5 — Phase C UI : monitor et panel

- enrichir `DevToolsConfig`
- brancher `DevToolsPanel` et `StateMonitor` sur les événements
- afficher explicitement les événements de turn et la fin de playback quand disponible
- garder le polling comme fallback transitoire si nécessaire

**Livrable Jour 5**
- DevTools plus fidèle et plus utile au debug

### Jour 6 — Gate multi-SDK/UI

- `pnpm --filter @domos/react build`
- `pnpm --filter @domos/vue build`
- `pnpm --filter @domos/svelte build`
- `pnpm --filter @domos/browser build`
- `pnpm --filter @domos/ui build`
- `pnpm --filter @domos/server build`
- vérification explicite : aucun import depuis `apps/**`

**Livrable Jour 6**
- DX client standardisée et DevTools branché sur le flux canonique

---

## Gate fin de sprint

Le sprint est fini uniquement si :

1. React, Vue, Svelte et Browser exposent le flux d'événements canoniques via leurs surfaces SDK
2. leurs bridges DevTools transmettent ce flux à `@domos/ui/devtools`
3. la DX publique permet de distinguer `agent.response.done`, `turn.completed` et `playback.completed`
4. `ui/devtools` sait consommer ce flux pour son monitor live
5. `pnpm --filter @domos/react build` passe
6. `pnpm --filter @domos/vue build` passe
7. `pnpm --filter @domos/svelte build` passe
8. `pnpm --filter @domos/browser build` passe
9. `pnpm --filter @domos/ui build` passe
10. aucun import depuis `apps/**` n'est introduit

---

## Ce qu'on ne fait pas

- changer ADTP
- réécrire entièrement les SDKs front au-delà de l'adoption du contrat d'événements
- ajouter un système de logs persistant
- modifier le serveur pour la seule DX DevTools
