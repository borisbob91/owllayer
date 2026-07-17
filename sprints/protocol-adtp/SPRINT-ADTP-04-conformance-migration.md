# Sprint ADTP-04 - Conformité, migration et publication du protocole

## 1. Fiche du sprint

| Champ | Valeur |
| --- | --- |
| Statut | Planifié après ADTP-00 à ADTP-03 |
| Domaine | Kit de conformité ADTP et garde-fous de migration |
| Intention | Rendre les nouveaux contrats vérifiables par server, client, SDKs et adapters |
| Entrée | Contrats compilés et tests unitaires des quatre sprints précédents |
| Sortie | Suites partagées, fixtures versionnées, guide de migration et gate de release |

## 2. Besoin produit final

Les équipes OpenAI, Deepgram, LiveKit, server et SDK ne doivent pas réécrire leur
propre lecture du protocole. Un développeur doit pouvoir exécuter une suite de
conformité et savoir si son composant respecte : directions, capacités,
corrélation média, cycle de tools, erreurs et compatibilité historique.

La publication open source doit inclure des exemples de messages complets et une
politique de dépréciation. Aucun adapter ne peut être annoncé stable si son flux
ne passe pas les scénarios communs.

## 3. Gaps à fermer

- `ADTPMessage` est une union unique sans type public client->serveur ou
  serveur->client.
- `tryDecode()` masque la cause d'un rejet et ne valide pas la direction.
- `protocol.test.ts` couvre les factories historiques, pas les conversations
  multi-messages et la compatibilité de versions.
- Il n'existe aucun corpus de fixtures que server/client/adapters peuvent
  partager.
- Il n'existe pas de règle de dépréciation publiée pour `AUDIO_STREAM`,
  `VOICE_INPUT_END`, `VOICE_INTERRUPT` et `SYSTEM_EVENT.tools_effective`.

## 4. Contrats cibles

### 4.1 Unions directionnelles dans `adtp.types.ts`

```ts
export type ClientToServerADTPMessage = Extract<
  ADTPMessage,
  {
    type:
      | MessageType.HANDSHAKE_INIT
      | MessageType.CONTEXT_UPDATE
      | MessageType.TOOL_RESULT
      | MessageType.APPROVAL_REQUEST
      | MessageType.APPROVAL_RESPONSE
      | MessageType.USER_INPUT
      | MessageType.AUDIO_STREAM
      | MessageType.VOICE_INPUT_END
      | MessageType.VOICE_INTERRUPT
      | MessageType.MEDIA_SESSION_CREATE
      | MessageType.MEDIA_SESSION_CLOSE
      | MessageType.MEDIA_SIGNAL_OFFER
      | MessageType.MEDIA_SIGNAL_ICE
      | MessageType.MEDIA_INPUT_START
      | MessageType.MEDIA_INPUT_CHUNK
      | MessageType.MEDIA_INPUT_END
      | MessageType.MEDIA_INTERRUPT
      | MessageType.PROTOCOL_ERROR;
  }
>;

export type ServerToClientADTPMessage = Extract<
  ADTPMessage,
  {
    type:
      | MessageType.HANDSHAKE_ACK
      | MessageType.TOOL_CALL
      | MessageType.AGENT_RESPONSE
      | MessageType.AUDIO_STREAM
      | MessageType.VOICE_STATE_EVENT
      | MessageType.SYSTEM_EVENT
      | MessageType.TOOLS_EFFECTIVE
      | MessageType.MEDIA_SESSION_READY
      | MessageType.MEDIA_SESSION_STATE
      | MessageType.MEDIA_SESSION_CLOSE
      | MessageType.MEDIA_SIGNAL_ANSWER
      | MessageType.MEDIA_SIGNAL_ICE
      | MessageType.MEDIA_ERROR
      | MessageType.MEDIA_OUTPUT_START
      | MessageType.MEDIA_OUTPUT_CHUNK
      | MessageType.MEDIA_OUTPUT_END
      | MessageType.MEDIA_TRANSCRIPT
      | MessageType.MEDIA_TURN_EVENT
      | MessageType.MEDIA_INTERRUPT
      | MessageType.MEDIA_FLOW_CONTROL
      | MessageType.PROTOCOL_ERROR;
  }
>;
```

Les messages bidirectionnels apparaissent volontairement dans les deux unions.
La compilation doit échouer si un nouveau `MessageType` n'est affecté à aucune
direction.

### 4.2 Décodage explicite

Dans `adtp.validator.ts` :

```ts
export type ADTPDirection = 'client_to_server' | 'server_to_client';

export function validateMessageForDirection(
  raw: unknown,
  direction: ADTPDirection,
  selection?: ADTPProtocolSelection
): ValidationResult<ClientToServerADTPMessage | ServerToClientADTPMessage>;
```

Dans `adtp.serializer.ts` :

```ts
export function decodeClientMessage(
  raw: string,
  selection?: ADTPProtocolSelection
): ClientToServerADTPMessage;

export function decodeServerMessage(
  raw: string,
  selection?: ADTPProtocolSelection
): ServerToClientADTPMessage;
```

`decode()` et `tryDecode()` restent exportés pendant `1.x`, mais le server et le
client migrent vers les variantes directionnelles.

### 4.3 Kit de conformité interne

Créer sous `packages/core/tests/conformance/` :

```ts
export interface ADTPConformanceHarness {
  sendClient(message: ClientToServerADTPMessage): Promise<void>;
  sendServer(message: ServerToClientADTPMessage): Promise<void>;
  readClientEvents(): readonly ServerToClientADTPMessage[];
  readServerEvents(): readonly ClientToServerADTPMessage[];
  close(): Promise<void>;
}

export function runADTPHandshakeConformance(
  createHarness: () => Promise<ADTPConformanceHarness>
): void;

export function runADTPMediaConformance(
  createHarness: () => Promise<ADTPConformanceHarness>
): void;

export function runADTPToolLifecycleConformance(
  createHarness: () => Promise<ADTPConformanceHarness>
): void;
```

Le kit est initialement un helper de tests du monorepo, pas un nouvel export npm.
Une publication séparée ne sera décidée qu'après deux consommateurs réels.

## 5. Corpus de scénarios normatifs

### 5.1 Handshake

- ancien client / nouveau serveur ;
- nouveau client / ancien serveur ;
- nouveau/nouveau avec toutes capacités ;
- version majeure incompatible ;
- message métier avant ACK ;
- message optionnel sans capacité ;
- timeout et reconnexion.

### 5.2 Média WebSocket

- création et sélection par défaut ;
- start/chunks/end avec séquences ;
- transcript partial/final ;
- output complet ;
- barge-in ;
- backpressure ;
- fermeture et chunks tardifs.

### 5.3 Sélection WebRTC

- demande explicite supportée ;
- demande explicite sans fallback ;
- `auto` sélectionne WebRTC ;
- `auto` choisit WebSocket avec raison ;
- échec de signalisation avant le premier tour ;
- aucune clé/token provider dans les messages enregistrés.

### 5.4 Neural-DOM Binding

- montage, ACK de surface et appel réussi ;
- démontage, ACK de surface et appel obsolète rejeté ;
- collision serveur/client ;
- update provider pending/restart/unsupported ;
- démontage pendant HITL ;
- résultat tardif.

## 6. Fixtures versionnées

Créer `packages/core/tests/fixtures/adtp/` avec :

```text
v1.0/
  handshake-init.json
  handshake-ack.json
  context-update.json
  audio-stream.json
v1.1/
  handshake-init.json
  handshake-ack.json
  protocol-error.json
  media-websocket-flow.jsonl
  media-webrtc-negotiation.jsonl
  tool-mount-unmount.jsonl
invalid/
  wrong-direction.json
  capability-missing.json
  chunk-out-of-order.jsonl
  cross-session-media.jsonl
```

Chaque fixture contient des IDs et timestamps stables, aucun credential réel et
un commentaire associé dans `README.md` du dossier. Les fichiers `.jsonl`
représentent une conversation ordonnée, une enveloppe par ligne.

## 7. Politique de compatibilité et dépréciation

### 7.1 Ligne `1.x`

- Accepter les payloads historiques documentés.
- N'envoyer les nouveaux messages qu'après négociation.
- Ne jamais réutiliser un ancien `MessageType` avec une sémantique incompatible.
- Ajouter les champs de façon optionnelle, puis les rendre contextuellement
  requis seulement quand la capacité correspondante est active.

### 7.2 Messages historiques

Les messages suivants sont dépréciés mais supportés pendant toute la ligne `1.x` :

- `AUDIO_STREAM` ;
- `VOICE_INPUT_END` ;
- `VOICE_INTERRUPT` ;
- `VOICE_STATE_EVENT` pour les nouveaux flux ;
- `SYSTEM_EVENT` avec `kind: 'tools_effective'`.

Ils ne seront retirés qu'en `2.0.0`, avec télémétrie préalable prouvant l'absence
de consommateurs et un guide de migration publié.

### 7.3 Règle pour une nouvelle extension

Toute extension future doit fournir avant merge : intention produit, direction,
payload complet, capacité, validation, factory, erreur, fixture, tests de
compatibilité, sécurité, documentation et propriétaire de lifecycle.

## 8. Tâches d'implémentation

### Tâche 1 - Ajouter les unions et décodeurs directionnels

**Fichiers :** `adtp.types.ts`, `adtp.validator.ts`, `adtp.serializer.ts`,
`packages/core/src/index.ts` et tests.

- Définir les unions exhaustives.
- Ajouter un test de type qui échoue si un message n'a pas de direction.
- Migrer les tests core vers `decodeClientMessage`/`decodeServerMessage`.
- Conserver les exports historiques avec commentaires `@deprecated` précis.

### Tâche 2 - Créer les fixtures et runners

**Fichiers :** `packages/core/tests/conformance/**` et
`packages/core/tests/fixtures/adtp/**`.

- Écrire les conversations de la section 5.
- Créer un harness mémoire sans réseau pour la suite core.
- Permettre au serveur et au client de fournir leurs harness dans leurs sprints.
- Vérifier le cleanup du harness dans `afterEach`, même en cas d'assertion.

### Tâche 3 - Migrer les frontières réelles

**Fichiers :**

- `packages/server/src/transport/Transport.ts` et implémentations WebSocket/
  DataChannel ;
- `packages/server/src/transport/adtp.transport.ts`, point réel de décodage
  WebSocket utilisant actuellement `tryDecode()` ;
- `packages/server/src/transport/WebRTCTransport.ts`, point de décodage du
  DataChannel ;
- `packages/server/src/core/DomOSServer.ts` aux points de réception ;
- `packages/core/src/client/DomOSClient.ts` aux points de réception ;
- tests associés.

- Le serveur n'accepte que `ClientToServerADTPMessage` après décodage.
- Le client n'accepte que `ServerToClientADTPMessage`.
- Les transports restent génériques sur le moyen de transport, pas le média.
- Une mauvaise direction produit `INVALID_MESSAGE_DIRECTION`.

### Tâche 4 - Écrire la documentation de migration

**Fichiers cibles :** documentation protocole existante identifiée par recherche
dans `apps/docs-site/src/content/docs/`; ne pas créer une page dupliquée.

La page doit montrer :

- message `1.0` et équivalent `1.1` ;
- négociation de capacités ;
- choix `websocket/webrtc/auto` ;
- migration du flux audio ;
- migration du cycle de tools ;
- politique de dépréciation ;
- aucun exemple JSON-RPC.

### Tâche 5 - Ajouter le gate de release

- Faire exécuter les tests de conformité par core, server et client.
- Ajouter une vérification qu'aucun contrat core ne contient un nom provider.
- Ajouter une vérification des exports et de l'installation package.
- Archiver les résultats dans le fichier de progression avant publication.

## 9. Fichiers autorisés

| Zone | Action | Raison |
| --- | --- | --- |
| `packages/core/src/protocol/*` | Modifier | Directions et décodage |
| `packages/core/src/index.ts` | Modifier | Exports publics |
| `packages/core/tests/conformance/**` | Créer | Suites partagées |
| `packages/core/tests/fixtures/adtp/**` | Créer | Corpus versionné |
| Frontières transport server/client | Modifier | Adoption des décodeurs directionnels |
| Tests server/client associés | Modifier/créer | Preuve d'intégration |
| Page protocole docs existante | Modifier | Guide public sans duplication |

Les adapters providers et SDKs frameworks ne sont pas modifiés dans ce sprint.

## 10. Sécurité

- Les fixtures contiennent uniquement des secrets factices reconnaissables.
- La suite recherche les clés/tokens/SDP provider dans événements et snapshots.
- Les tests cross-session prouvent qu'un ID média ne permet pas l'accès à une
  autre session.
- Les erreurs invalides sont bornées et ne recopient pas les payloads complets.
- Les tests de charge/fuzzing ciblés couvrent tailles, profondeur JSON et nombre
  de messages, sans transformer ce sprint en audit général du serveur.

## 11. Commandes de validation

```bash
pnpm --filter @domos/core test
pnpm --filter @domos/core build
pnpm --filter @domos/server test
pnpm --filter @domos/server build
pnpm build
```

## 12. Definition of Done

- [ ] Chaque `MessageType` appartient à au moins une direction.
- [ ] Server et client utilisent les décodeurs directionnels.
- [ ] Les scénarios handshake, média et tools sont des fixtures versionnées.
- [ ] Les suites de conformité sont réutilisées par core, server et client.
- [ ] Les messages historiques restent couverts et marqués dépréciés.
- [ ] Le guide public explique la migration sans JSON-RPC ni vocabulaire provider.
- [ ] Les tests cross-session, tailles et redaction passent.
- [ ] Aucun secret réel n'est présent dans fixtures, snapshots ou logs.
- [ ] Le build monorepo passe.
- [ ] Les preuves de release sont inscrites dans la progression.
- [ ] Les pistes `server-runtime`, `client-media`, `openai` et `deepgram` peuvent
  référencer ces contrats sans les redéfinir.

## 13. Hors scope

- Suppression effective des messages historiques.
- Publication d'un package de conformance séparé.
- Implémentation provider ou UI dashboard.
- Tests E2E avec un service payant réel ; ils appartiennent aux adapters.

## 14. Commit recommandé

`test(protocol): add ADTP conformance and migration gates`
