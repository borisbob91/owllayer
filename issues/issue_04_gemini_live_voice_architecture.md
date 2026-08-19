# Issue #04 : Gemini Live Voice Architecture (Production-Grade, ElevenLabs-like)

**Statut** : 🔵 À valider  
**Priorité** : 🔴 Haute (fiabilité conversation vocale)  
**Complexité** : Élevée  
**Composants affectés** : `@owllayer/core`, `@owllayer/server`, `@owllayer/adapter-google`, `@owllayer/react`, `@owllayer/vue`, `@owllayer/svelte`, `apps/demo`, `apps/demo-server`

---

## 📋 Description du problème

### Contexte

Le mode texte fonctionne, mais la chaîne vocale présente une situation où l'assistant ne répond pas après la fin de parole utilisateur. Les quick-fixes déjà appliqués ont amélioré la stabilité (capture/playback/lifecycle), mais toujour aucun retour audio de l'agent.

### Symptômes observés

1. L'utilisateur finit de parler, mais la réponse audio ne démarre pas toujours.
2. Le comportement varie selon latence réseau, navigateur, et ordre des événements.
3. Les interruptions (barge-in) ne sont pas encore systématiquement gérées.
4. Le debugging est difficile sans télémétrie structurée de session/turn.

### Impact

1. Expérience utilisateur perçue comme instable.
2. Démo fragile en conditions réelles (réseau variable, navigation rapide).
3. Difficile de distinguer un bug client, serveur, ou provider Gemini Live.

---

## 🔍 Analyse technique

### Limite principale actuelle

Le protocole interne n'impose pas de signal standard et explicite de "fin de tour audio utilisateur" (end-of-utterance) de bout en bout.

Conséquences possibles :

1. Le serveur peut rester dans un état ambigu (attente d'input).
2. Le provider peut ne pas déclencher la génération au bon moment selon VAD/config.
3. Les UI hooks peuvent continuer à streamer trop longtemps ou couper trop tôt.

### Écart vs architecture "ElevenLabs-like"

Une architecture temps réel robuste implémente en général :

1. Un état de conversation explicite côté client et serveur.
2. Un protocole d'événements normalisé (start/chunk/end/cancel/interrupt).
3. Des règles strictes d'interruption et de priorité audio.
4. Une observabilité par session/turn (latences, erreurs, timeouts, retries).

---

## 🎯 Objectif cible

Obtenir un pipeline vocal déterministe :

1. **User speaks** -> audio stream stable vers serveur.
2. **User end-of-turn** -> signal explicite unique envoyé.
3. **Server finalise input** -> déclenche génération Gemini Live.
4. **Model responds** -> streaming audio progressif sans trous.
5. **Barge-in** -> arrêt propre sortie TTS + reprise capture immédiate.

---

## ✅ Solution proposée

## 1. Contrat protocolaire unifié (ADTP Voice Events)

Ajouter/normaliser les événements suivants (client <-> server) :

1. `VOICE_INPUT_START`
2. `VOICE_INPUT_CHUNK`
3. `VOICE_INPUT_END` (obligatoire)
4. `VOICE_OUTPUT_CHUNK`
5. `VOICE_OUTPUT_END`
6. `VOICE_INTERRUPT`
7. `VOICE_ERROR`
8. `VOICE_STATE` (debug/observabilité)

Payload minimal recommandé :

```ts
interface VoiceEventBase {
  sessionId: string;
  turnId: string;
  timestampMs: number;
}

interface VoiceInputEndEvent extends VoiceEventBase {
  type: 'VOICE_INPUT_END';
  reason: 'vad_silence' | 'user_stop' | 'timeout' | 'manual';
  audioDurationMs: number;
  chunkCount: number;
}
```

Règle stricte : un `turnId` ne doit avoir qu'un seul `VOICE_INPUT_END`.

## 2. State machine explicite côté client

États recommandés :

1. `idle`
2. `capturing`
3. `awaiting_model`
4. `playing`
5. `interrupting`
6. `error`

Transitions clés :

1. `capturing -> awaiting_model` sur `VOICE_INPUT_END` envoyé.
2. `awaiting_model -> playing` sur premier `VOICE_OUTPUT_CHUNK`.
3. `playing -> capturing` sur barge-in utilisateur.
4. `any -> error` sur timeout/protocol mismatch.

Cette machine doit vivre dans les hooks voice (`react/vue/svelte`) avec logique homogène.

## 3. State machine explicite côté serveur

États recommandés par turn :

1. `open_input`
2. `input_closed`
3. `generating`
4. `streaming_output`
5. `completed`
6. `failed`

Responsabilités :

1. Refuser les `VOICE_INPUT_CHUNK` après `VOICE_INPUT_END`.
2. Appliquer timeout si `VOICE_INPUT_END` absent (fail-safe).
3. Mapper `VOICE_INPUT_END` vers la sémantique Gemini Live de fin d'input.
4. Garantir la corrélation `sessionId + turnId` sur tous les logs.

## 4. Adapter Gemini Live : fin d'input explicite

Dans `@owllayer/adapter-google`, implémenter un point unique :

1. `appendInputAudio(...)` pour les chunks.
2. `finalizeInputTurn(...)` appelé sur `VOICE_INPUT_END`.

Objectif : encapsuler la logique provider-specific (`sendRealtimeInput`, signaling de fin de flux, `turnComplete` si requis) derrière une API stable OwlLayer.

## 5. Barge-in (interruption) de première classe

Quand l'utilisateur reparle pendant `playing` :

1. Émettre `VOICE_INTERRUPT` côté client.
2. Stopper immédiatement playback local.
3. Informer le serveur/adapter d'interrompre la génération en cours.
4. Ouvrir un nouveau `turnId` et repasser en `capturing`.

## 6. Observabilité et diagnostics

Ajouter métriques et logs structurés :

1. `voice_input_to_first_byte_ms`
2. `voice_turn_total_ms`
3. `voice_interrupt_count`
4. `voice_no_response_timeout_count`
5. `voice_chunk_drop_count`

Exemple log JSON :

```json
{
  "level": "info",
  "event": "voice_turn_completed",
  "sessionId": "s_123",
  "turnId": "t_456",
  "inputMs": 1880,
  "ttfbMs": 420,
  "outputMs": 2360,
  "interrupted": false
}
```

## 7. Backward compatibility et feature flag

Introduire un flag progressif :

1. `OWLLAYER_VOICE_PROTOCOL_V2=true|false`

Comportement :

1. `false` -> comportement actuel (legacy).
2. `true` -> nouveau protocole state-machine + end-of-turn explicite.

Permet déploiement progressif sans casser les intégrations existantes.

---

## 🧩 Plan d'implémentation

### Phase 1 : Contrat et plumbing (2-3 jours)

1. Définir types événements voice dans `@owllayer/core`.
2. Ajouter `VOICE_INPUT_END` côté client hooks (React/Vue/Svelte).
3. Router l'événement dans `@owllayer/server` jusqu'à l'adapter.
4. Ajouter garde-fous anti-duplication de `VOICE_INPUT_END`.

Livrable : pipeline end-of-turn fonctionnel et testé en local.

### Phase 2 : Adapter Gemini Live robuste (2 jours)

1. Créer API interne `appendInputAudio/finalizeInputTurn`.
2. Implémenter mapping provider complet (chunks + fin de flux).
3. Ajouter timeouts et erreurs explicites (`VOICE_ERROR`).

Livrable : fin de tour déterministe côté provider.

### Phase 3 : Barge-in et UX (2 jours)

1. Gestion interruption pendant playback.
2. Priorité capture sur output en cas de parole utilisateur.
3. Stabiliser scheduling audio (anti-overlap / anti-gap).

Livrable : conversation plus naturelle, sans blocage long.

### Phase 4 : Observabilité + rollout (1-2 jours)

1. Logs structurés session/turn.
2. Métriques de latence et de fiabilité.
3. Activation progressive via feature flag en demo.

Livrable : validation terrain avec KPI clairs.

---

## 🧪 Stratégie de tests

## Tests unitaires

1. `VOICE_INPUT_END` unique par `turnId`.
2. Refus des chunks après `input_closed`.
3. Timeout si `VOICE_INPUT_END` manquant.
4. Transitions state machine client valides.

## Tests d'intégration

1. Capture 2s -> end -> réponse audio reçue.
2. Réseau lent (latence simulée) -> pas de deadlock.
3. Interruption en plein output -> nouveau turn démarre.
4. Déconnexion/reconnexion WebSocket -> état cohérent.

## Tests E2E (demo)

1. 20 tours consécutifs sans "no response".
2. 10 interruptions consécutives sans crash audio.
3. Vérification TTFB p95 sous seuil cible.

---

## 📏 Critères d'acceptation

1. Taux de tours sans réponse < 1% sur scénario de test standard.
2. `VOICE_INPUT_END` présent dans 100% des turns vocaux.
3. Aucun chunk output lu après interruption confirmée.
4. Logs corrélés `sessionId/turnId` sur tout le flux.
5. Feature flag activable/désactivable sans rebuild complexe.

---

## ⚠️ Risques et mitigations

1. **Risque** : divergence implémentation React/Vue/Svelte.
   **Mitigation** : partager logique state machine dans util commun `@owllayer/core`.

2. **Risque** : comportement Gemini Live variable selon version SDK.
   **Mitigation** : centraliser adaptation dans `@owllayer/adapter-google` + tests contractuels.

3. **Risque** : régression sur intégrations legacy.
   **Mitigation** : feature flag + déploiement progressif + fallback V1.

---

## 📂 Fichiers cibles (proposition)

1. `owllayer/packages/core/src/protocol/messages.ts`
2. `owllayer/packages/core/src/client/OwlLayerClient.ts`
3. `owllayer/packages/server/src/core/OwlLayerServer.ts`
4. `owllayer/packages/adapter-google/src/GoogleLiveAdapter.ts`
5. `owllayer/packages/react/src/voice/useVoiceMode.ts`
6. `owllayer/packages/vue/src/composables/useVoiceMode.ts`
7. `owllayer/packages/svelte/src/composables/createVoiceMode.ts`
8. `owllayer/apps/demo/src/App.tsx`
9. `owllayer/apps/demo-server/src/server.ts`

---

## 📝 Notes d'implémentation

1. Conserver les quick-fixes audio déjà appliqués (resume context, scheduling, cleanup) comme base.
2. Ne pas dépendre uniquement du VAD provider : garder un `VOICE_INPUT_END` explicite côté OwlLayer.
3. Prévoir un mécanisme de "session warmup" au démarrage pour réduire la latence du premier tour.
4. Exposer un mode debug UI (overlay) montrant l'état de state machine en temps réel.

---

## 🔗 Références

1. Gemini Live API docs (temps réel audio, turn handling)
2. `@google/genai` live session patterns
3. Patterns conversationnels temps réel de type ElevenLabs (turn-taking, barge-in, observabilité)

---

**Auteur** : GitHub Copilot  
**Date** : 7 mars 2026  
**Prochaine étape recommandée** : implémenter la Phase 1 derrière `OWLLAYER_VOICE_PROTOCOL_V2`
