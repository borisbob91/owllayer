# Feature #24 : Sprint 6 bis — Alignement de `@owllayer/adapter-openai` et `@owllayer/adapter-anthropic` sur le contrat d'événements canonique

**Statut** : 🟡 Validée  
**Domaine** : server  
**Porteur** : @BorisBob  
**Validé par** : @BorisBob  
**Date** : 2026-04-01

---

## Objectif

Étendre le travail du Sprint 22 à tous les adapters LLM encore actifs du domaine server, et pas seulement à `@owllayer/adapter-google`.

Le but est d'aligner `@owllayer/adapter-openai` et `@owllayer/adapter-anthropic` sur le même vocabulaire d'événements runtime, sans toucher à ADTP ni au serveur.

---

## Positionnement

Le Sprint 22 a correctement standardisé `adapter-google`, mais laisser `adapter-openai` et `adapter-anthropic` sur un modèle sans flux d'événements canonique recrée immédiatement une DX incohérente.

Le principe attendu est simple :

- tous les adapters exposent le même style de runtime events
- les différences provider restent dans le payload ou dans l'absence assumée de certains signaux
- aucun client React/Vue/Svelte/Browser/UI ne doit dépendre d'un adapter privilégié

---

## Règles de design

1. Ne pas modifier ADTP.
2. Ne pas modifier `packages/server/**`.
3. Garder les APIs existantes compatibles.
4. Aligner OpenAI et Anthropic sur la même ergonomie que Google.
5. Aucun import depuis `react`, `ui` ou `apps/**`.
6. Ne pas inventer de faux événements provider quand le signal n'existe pas réellement.
7. `playback.completed` reste hors scope adapter.

---

## APRÈS

`@owllayer/adapter-openai` expose :

- `chat.response.text`
- `chat.tool.call`
- `chat.error`
- `live.session.opened`
- `live.turn.started`
- `live.audio.output`
- `live.text.output.delta`
- `live.text.output.done`
- `live.transcript.user.delta`
- `live.transcript.agent.delta`
- `live.turn.completed`
- `live.tool.call`
- `live.error`
- `live.closed`

`@owllayer/adapter-anthropic` expose :

- `chat.response.text`
- `chat.tool.call`
- `chat.error`

---

## Fichiers impactés

| Fichier | AVANT | APRÈS | POURQUOI |
|---|---|---|---|
| `packages/adapter-openai/src/OpenAILiveAdapter.ts` | callbacks dispersés | callbacks + flux live canonique | cohérence avec Google |
| `packages/adapter-openai/src/OpenAIAdapter.ts` | réponse texte sans runtime events | flux texte canonique | cohérence texte/live |
| `packages/adapter-openai/src/index.ts` | exports incomplets | export des types/runtime events | surface publique claire |
| `packages/adapter-anthropic/src/AnthropicAdapter.ts` | réponse texte sans runtime events | flux texte canonique | cohérence inter-adapter |
| `packages/adapter-anthropic/src/index.ts` | exports simples | export des types/runtime events | surface publique claire |

---

## Gate fin de sprint

Le sprint est fini uniquement si :

1. `adapter-openai` expose un flux d'événements canonique en texte et en live
2. `adapter-anthropic` expose un flux d'événements canonique en texte
3. les callbacks historiques restent compatibles
4. `pnpm --filter @owllayer/adapter-openai build` passe
5. `pnpm --filter @owllayer/adapter-anthropic build` passe
6. aucun fichier ADTP ni `packages/server/**` n'est touché
