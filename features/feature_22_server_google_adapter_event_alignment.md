# Feature #22 : Sprint 6 — Alignement de `@owllayer/adapter-google` sur le contrat d'événements canonique

**Statut** : 🟡 Validée  
**Domaine** : server  
**Porteur** : @BorisBob  
**Validé par** : @BorisBob  
**Date** : 2026-04-01

---

## Objectif

Faire de `@owllayer/adapter-google` le premier adapter à parler le vocabulaire d'événements canonique défini en Sprint 21.

Le but n'est pas de toucher au protocole serveur ni à ADTP, mais de standardiser ce que l'adapter expose comme événements runtime au-dessus de Gemini.

---

## Positionnement

Le problème réel actuel est concentré dans [packages/adapter-google/src/GoogleLiveAdapter.ts](packages/adapter-google/src/GoogleLiveAdapter.ts) :

- callbacks hétérogènes
- mélange entre événements métiers et callbacks de commodité
- vrais signaux provider de turn (`turnComplete`, `interrupted`, `waitingForInput`) encore exposés sans vocabulaire DX canonique
- pas de map d'événements stable pour le debug ou les bridges clients

Ce sprint garde la compatibilité des callbacks existants, mais ajoute un contrat d'événements canonique côté adapter.

---

## Règles de design

1. Ne pas modifier ADTP.
2. Ne pas modifier `packages/server/**`.
3. Les callbacks historiques de `GoogleLiveAdapter` restent supportés pendant la transition.
4. Le contrat canonique doit être importé depuis `@owllayer/core`.
5. Aucun import depuis `react`, `ui` ou `apps/**`.
6. `GoogleAdapter` texte et `GoogleLiveAdapter` live doivent converger sur le même vocabulaire là où cela a du sens.

---

## Diagnostic actuel

Dans [packages/adapter-google/src/GoogleLiveAdapter.ts](packages/adapter-google/src/GoogleLiveAdapter.ts), l'adapter expose aujourd'hui des callbacks comme :

- `onAudioOutput`
- `onTextOutput`
- `onTranscript`
- `onInterrupted`
- `onWaitingForInput`
- `onToolCall`
- `onClose`
- `onError`

Ce modèle :

- fonctionne pour un usage serveur immédiat
- mais ne fournit pas de flux d'événements typé et centralisé
- ne permet pas une DX homogène avec les SDKs clients

---

## APRÈS

`GoogleLiveAdapter` expose, en plus de ses callbacks historiques, un flux d'événements standardisé fondé sur des types `@owllayer/core`, par exemple :

- `live.session.opened`
- `live.turn.started`
- `live.audio.output`
- `live.text.output.delta`
- `live.transcript.user.delta`
- `live.transcript.agent.delta`
- `live.turn.completed`
- `live.turn.interrupted`
- `live.turn.waiting_for_input`
- `live.tool.call`
- `live.error`
- `live.closed`

Le mapping attendu est explicite :

- `turnComplete` provider -> `live.turn.completed`
- `interrupted` provider -> `live.turn.interrupted`
- `waitingForInput` provider -> `live.turn.waiting_for_input`

`live.playback.completed` reste hors scope ici : l'adapter live ne sait pas quand l'audio a réellement fini d'être joué côté browser.

`GoogleAdapter` texte standardise aussi ce qui est utile sur le mode request/response :

- `chat.response.text`
- `chat.tool.call`
- `chat.error`

---

## POURQUOI

Sans adapter standardisé, chaque bridge client devra écrire son propre adaptateur sémantique.

Le bon sens d'architecture est inverse :

- l'adapter produit déjà un flux sémantique propre
- les clients React/Vue/Svelte/Browser/UI ne font que le consommer

---

## Fichiers impactés

| Fichier | AVANT | APRÈS | POURQUOI |
|---|---|---|---|
| `packages/adapter-google/src/GoogleLiveAdapter.ts` | callbacks dispersés | callbacks + flux d'événements canonique | standardiser le runtime live |
| `packages/adapter-google/src/GoogleAdapter.ts` | réponse texte et tool calls sans vocabulaire canonique | alignement partiel sur le contrat d'événements | cohérence texte/live |
| `packages/adapter-google/src/index.ts` | exports actuels | export des types/contrats runtime utiles | surface publique claire |

### Ce qui ne sera pas modifié

- `packages/server/**`
- `packages/react/**`
- `packages/ui/**`
- `packages/core/src/protocol/**`

---

## Interface cible

### Option d'adoption minimale

```ts
const session = await live.createSession({
  ...,
  onEvent: (event) => {
    if (event.type === 'live.tool.call') {
      ...
    }
  },
});
```

### Compatibilité maintenue

Les callbacks existants restent valides :

```ts
onAudioOutput
onTextOutput
onTranscript
onToolCall
onInterrupted
onWaitingForInput
onClose
onError
```

Mais ils deviennent des projections de l'émetteur canonique interne.

---

## Plan journalier

### Jour 1 — Audit du vocabulaire live

- relever tous les callbacks de `GoogleLiveAdapter`
- mapper chaque callback à un événement canonique
- distinguer les signaux de turn des fins de texte ou de transcript
- identifier les trous réels côté texte/live

**Livrable Jour 1**
- table de mapping callbacks -> events

### Jour 2 — Contrat runtime adapter

- définir les types d'événements adapter importés depuis `@owllayer/core`
- prévoir le point d'entrée `onEvent` / `onAnyEvent`

**Livrable Jour 2**
- contrat d'adoption `adapter-google` figé

### Jour 3 — Intégration `GoogleLiveAdapter`

- brancher l'émission d'événements canoniques sur tous les points runtime utiles
- garder la compatibilité des callbacks historiques

**Livrable Jour 3**
- live adapter standardisé

### Jour 4 — Intégration `GoogleAdapter`

- aligner les points utiles du mode texte
- documenter ce qui est volontairement hors scope si la granularité live n'a pas d'équivalent texte

**Livrable Jour 4**
- couverture texte/live cohérente

### Jour 5 — Gate adapter

- `pnpm --filter @owllayer/adapter-google build`
- validation que le package n'importe rien depuis `react`, `ui` ou `apps/**`
- vérification explicite qu'aucun changement ADTP n'a été introduit

**Livrable Jour 5**
- adapter prêt pour consommation par `react`, `vue`, `svelte`, `browser` et `ui`

---

## Gate fin de sprint

Le sprint est fini uniquement si :

1. `GoogleLiveAdapter` expose un flux d'événements canonique
2. les signaux provider `turnComplete`, `interrupted` et `waitingForInput` sont normalisés en événements de turn explicites
3. les callbacks historiques restent compatibles
4. `GoogleAdapter` texte est partiellement aligné sur le même vocabulaire
5. `pnpm --filter @owllayer/adapter-google build` passe
6. aucun fichier ADTP n'est touché

---

## Ce qu'on ne fait pas

- toucher `server`
- réécrire `adapter-openai` dans ce sprint
- prétendre exposer `playback.completed` depuis l'adapter live
- modifier le protocole websocket
- imposer tout de suite un bus global à tout le monorepo
