# Sprint SRV-03 - Coordinator du runtime de session

## 1. Fiche du sprint

| Champ | Valeur |
| --- | --- |
| Statut | Après SRV-02 et ADTP-00/03 |
| Domaine | Cycle de vie des adapters par session |
| Objectif | Remplacer l'autorité globale `this.llm/live/stt/tts` |
| Invariant | Un seul orchestrateur tools/voix : DomOSServer + services extraits |

## 2. Résultat observable

Deux sessions peuvent utiliser deux agents et providers différents sans partager
un état conversationnel ou des `callId`. La fermeture d'une session libère ses
adapters, live sessions, buffers, approvals et métriques, sans affecter les autres.

## 3. Contrat cible

```ts
export interface SessionRuntime {
  readonly sessionId: string;
  readonly agent: Readonly<AgentDefinition>;
  readonly text: LLMAdapter;
  readonly voice?:
    | { mode: 'pipeline'; stt: STTService; tts: TTSService }
    | { mode: 'realtime'; live: LiveAdapter };
  close(reason: string): Promise<void>;
}

export interface SessionRuntimeCoordinator {
  create(
    session: Session,
    agent: Readonly<AgentDefinition>
  ): Promise<SessionRuntime>;
  get(sessionId: string): SessionRuntime | undefined;
  close(sessionId: string, reason: string): Promise<void>;
  closeAll(reason: string): Promise<void>;
}
```

Le runtime conserve les handles et fonctions de disposal, jamais les credentials.

## 4. États et erreurs

```ts
type SessionRuntimeState =
  | 'creating'
  | 'ready'
  | 'closing'
  | 'closed'
  | 'failed';
```

- Un input avant `ready` est refusé ou mis en attente selon une file strictement
  bornée ; le comportement choisi est testé et documenté.
- Une création partielle exécute un rollback en ordre inverse.
- Une erreur voice optionnelle peut dégrader vers texte seulement si la définition
  l'autorise explicitement ; aucun fallback silencieux.

## 5. Flux end-to-end

1. Auth et handshake validés.
2. `AgentDefinitionResolver` fournit le snapshot.
3. Le coordinator crée text puis pipeline/realtime selon définition.
4. La session passe `ready` et accepte les inputs.
5. Texte : `runtime.text`, historique et tools effectifs de cette session.
6. Pipeline : STT -> même adapter texte -> TTS, piloté par `VoiceStateMachine`.
7. Realtime : une `LiveSession` enfant, synchronisée via ADTP-03.
8. Disconnect/shutdown : cancellation, close live, disposal adapters session,
   cleanup tools/HITL/média, puis flush mémoire.

## 6. Tâches

### Tâche 1 - Implémenter le coordinator

**Fichiers :** créer `SessionRuntimeCoordinator.ts`,
`SessionRuntime.ts`, tests.

- Verrou de création par session.
- Création déterministe et rollback inverse.
- `close` idempotent avec timeout par ressource.
- Map nettoyée dans tous les chemins.
- Rejet du partage d'une factory session-scoped.

### Tâche 2 - Rendre les hooks composables

**Fichier :** `packages/server/src/core/SessionManager.ts`.

- Remplacer l'unique setter destructif par abonnement/composition compatible.
- Préserver `onSessionCreated` et `onBeforeSessionDestroy` de la mémoire.
- Retourner un unsubscribe pour chaque propriétaire.
- Définir l'ordre : stop inputs, cleanup runtime, flush mémoire, suppression store.

### Tâche 3 - Migrer `DomOSServer`

**Fichier :** `packages/server/src/core/DomOSServer.ts` et services ciblés à créer.

- Ajouter resolver, registry, credentials et coordinator dans options internes.
- Remplacer `this.llm/live/stt/tts` par `runtime` dans handlers.
- Conserver les propriétés legacy uniquement pour la factory legacy.
- Extraire `TextRuntimeHandler`, `PipelineVoiceRuntime` et
  `RealtimeVoiceRuntime` si cela réduit réellement les responsabilités.
- Conserver API publique, transport, tools et AdminAPI wiring.

### Tâche 4 - Intégrer tools, HITL et média

- Appliquer ADTP-03 : révisions et `syncTools` par session.
- `ToolRouter` reste l'autorité ; aucun adapter n'exécute un handler UI.
- Lier calls/approvals à session + connexion.
- Pipeline et realtime utilisent `VoiceStateMachine` et les IDs de tour ADTP.
- Barge-in annule une génération ; les chunks tardifs ne relancent pas la lecture.
- Une session close purge calls, approvals et live creation pending.

### Tâche 5 - Observabilité

- Snapshot interne : agentId/révision, adapter IDs, mode, transport et état.
- Métriques par session sans credentials, transcript ou payload audio.
- Correlation IDs pour création, erreurs et cleanup.
- Aucun message provider brut dans les réponses admin.

### Tâche 6 - Tests

- Deux agents/providers concurrents.
- Adapter stateful non partagé.
- Double création, close pendant création, création partielle.
- Disconnect, timeout, shutdown, double close.
- Hooks mémoire et runtime exécutés sans écrasement.
- Tools mount/unmount pendant realtime.
- Résultat/approbation cross-session rejeté.
- Pipeline et realtime jamais actifs simultanément pour une même session.
- Constructor legacy et démos historiques.

## 7. Fichiers autorisés

| Zone | Action |
| --- | --- |
| `packages/server/src/runtime/SessionRuntime*.ts` | Créer |
| Services runtime ciblés | Créer |
| `core/SessionManager.ts` | Modifier |
| `core/DomOSServer.ts` | Modifier ciblé |
| `core/ToolRouter.ts` | Modifier selon ADTP-03 |
| Tests server runtime/session | Créer/modifier |

AdminAPI, UI et adapters providers restent hors scope.

## 8. Definition of Done

- [ ] Snapshot agent immuable par session.
- [ ] Plus d'autorité adapter globale hors compatibilité legacy.
- [ ] Hooks composables et cleanup idempotent.
- [ ] Rollback prouvé sur chaque étape de création.
- [ ] Tools/HITL isolés par session et connexion.
- [ ] `VoiceStateMachine` pilote pipeline et realtime.
- [ ] Deux agents/providers concurrents passent.
- [ ] Aucun secret dans snapshot, logs ou métriques.
- [ ] Build/tests serveur passent.
- [ ] SRV-04 persisté comme prochaine étape.

## 9. Commit

`feat(server): coordinate provider-neutral runtimes per session`

