# Sprint OAI-02 - Realtime GA par WebSocket serveur

Statut : **après OAI-01 et SRV-01**

## 1. Résultat attendu

`OpenAILiveAdapter` fournit une session Realtime GA complète via un WebSocket
serveur-à-serveur. C'est le chemin par défaut et il fonctionne sans WebRTC,
LiveKit, token navigateur ou API provider dans un SDK client.

## 2. État à remplacer

Le code actuel utilise un modèle `*-realtime-preview`, le header
`OpenAI-Beta: realtime=v1`, d'anciens champs plats de `session.update` et des
événements preview. La migration doit s'appuyer sur les schémas GA officiels au
moment de l'implémentation et conserver les callbacks `LiveSession` DomOS.

## 3. Contrats

### 3.1 Configuration

`OpenAILiveAdapterOptions.mediaTransport` est introduit avec `websocket` comme
valeur par défaut. OAI-02 refuse `webrtc` si OAI-03 n'est pas livré et traite
`auto` comme `websocket`, avec une capacité indiquant que WebRTC est indisponible.

La session configure explicitement : modèle GA, modalities, instructions,
voix, formats audio, transcription optionnelle, turn detection et tools. Les
valeurs effectives reçues dans `session.created/updated` doivent être vérifiées.

### 3.2 Mapping provider-neutral

| Flux OpenAI | Sortie DomOS |
|---|---|
| session créée/mise à jour | `live.session.opened` une fois prête |
| delta audio | `live.audio.output` + `onAudioOutput` |
| delta texte/transcription | événements/callbacks texte normalisés |
| function call terminé | un `LLMToolCall` vers le serveur |
| réponse terminée | `live.turn.completed` une seule fois |
| erreur provider/socket | `live.error`, puis fermeture si terminale |
| fermeture | `live.closed` + `onClose` une seule fois |

Les événements intermédiaires OpenAI restent privés dans un mapper dédié.

### 3.3 Tools et HITL

OpenAI propose un call ; il ne l'exécute pas. `DomOSServer` route le call vers
`ToolRouter`. Le tool serveur ou client suit la politique HITL existante. Après
approbation et exécution, `sendToolResponse()` publie le résultat associé au
`callId`, puis demande la continuation provider. Refus, timeout et erreur sont
également rendus au modèle sous forme de résultat contrôlé.

### 3.4 Cycle de vie

Une session possède les états `connecting`, `active`, `closing`, `closed`.
`close()` est idempotent. Timeout d'ouverture, erreur de parsing, fermeture
distante et erreur socket doivent nettoyer timers, listeners, arguments de tools
et buffers. Aucune callback n'est invoquée après l'état `closed`.

## 4. Tâches

### Tâche 1 - Créer la couche de mapping GA

Créer des types internes minimaux et `realtimeEventMapper.ts`. Ne pas recopier
toute la spécification OpenAI et ne pas exporter ces types.

### Tâche 2 - Migrer l'ouverture et `session.update`

Retirer le header beta, utiliser l'endpoint et un modèle GA configurables,
attendre la confirmation de session, appliquer un timeout nettoyé et valider la
configuration effective avant de déclarer la session active.

### Tâche 3 - Migrer les entrées/sorties

Raccorder audio PCM, texte, transcription, turn lifecycle et interruption aux
événements GA. Appliquer une limite aux arguments de tool accumulés et aux
payloads invalides. Ne pas introduire de conversion WAV/Opus dans l'adapter.

### Tâche 4 - Sécuriser les tool calls

Assembler les deltas par identité OpenAI correcte, refuser les doublons et les
arguments invalides, puis garantir qu'un résultat correspond à un call actif.
Tester approbation, refus HITL, timeout, tool client et tool serveur.

### Tâche 5 - Fiabiliser fermeture et erreurs

Centraliser `finalizeSession(reason)`, rendre la fermeture idempotente, classer
les erreurs récupérables/terminales et garantir une seule notification finale.

### Tâche 6 - Capacités et observabilité

Annoncer le transport réellement actif, le modèle et les formats normalisés.
Les logs contiennent session DomOS/correlation ID et type d'événement, jamais clé,
SDP, audio brut, instructions complètes ou résultat sensible.

## 5. Fichiers cibles

- `packages/adapter-openai/src/OpenAILiveAdapter.ts`
- `packages/adapter-openai/src/realtimeEventMapper.ts` à créer
- `packages/adapter-openai/src/events.ts`
- `packages/adapter-openai/src/toolConverter.ts`
- `packages/adapter-openai/src/index.ts`
- `packages/adapter-openai/tests/OpenAILiveAdapter.test.ts` à créer
- `packages/adapter-openai/tests/fixtures/realtime-ga/` à créer
- tests d'intégration concernés sous `packages/server/tests/`.

## 6. Tests obligatoires

Session configurée, audio entrant/sortant, texte, transcription, multi-tool,
arguments fragmentés, résultat/refus HITL, barge-in, timeout d'ouverture, JSON
invalide, 401/429, fermeture distante, double close et absence de listeners.

## 7. Definition of Done

- [ ] WebSocket GA fonctionne comme mode par défaut.
- [ ] Header beta, modèle preview par défaut et champs obsolètes ont disparu.
- [ ] Tous les événements publics sont provider-neutral.
- [ ] Tools serveur/client passent par ToolRouter et HITL.
- [ ] Cleanup et terminalité sont prouvés par tests.
- [ ] Aucun code WebRTC ou LiveKit n'est introduit.
- [ ] Builds/tests adapter, server, démo et monorepo passent.

## 8. Hors scope

WebRTC, sideband, changement ADTP, codecs et Agents SDK.

## 9. Commit recommandé

`feat(openai): migrate realtime adapter to ga websocket`
