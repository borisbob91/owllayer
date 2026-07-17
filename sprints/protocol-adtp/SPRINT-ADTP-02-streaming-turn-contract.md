# Sprint ADTP-02 - Streaming audio, transcription et cycle de tour

## 1. Fiche du sprint

| Champ | Valeur |
| --- | --- |
| Statut | Planifié après ADTP-01 |
| Domaine | Flux audio ADTP WebSocket et événements de tour provider-neutral |
| Intention | Remplacer l'ambiguïté de `AUDIO_STREAM` sans casser le fallback historique |
| Entrée | `mediaSessionId` prêt avec transport effectif `websocket` |
| Sortie | Streams et tours corrélés, ordonnés, interruptibles et observables |

## 2. Besoin produit final

Le serveur doit savoir à quelle session média, quel tour et quel flux appartient
chaque chunk. Le client doit distinguer transcription utilisateur, transcription
agent, audio de sortie, fin de tour et interruption. Les adapters OpenAI,
Deepgram ou futurs doivent mapper leurs événements vers ce vocabulaire commun au
lieu de propager leurs noms d'événements dans les SDKs.

Le chemin WebSocket doit rester utilisable par défaut. Le protocole doit borner
la mémoire, détecter les chunks dupliqués ou hors ordre et permettre un barge-in
sans laisser deux réponses audio concurrentes.

## 3. État source vérifié

- `AudioStreamPayload` ne contient que `data` et `mimeType`.
- `AUDIO_STREAM` est déclaré downstream mais `DomOSServer.handleMessage()` le
  traite comme input client.
- `VOICE_INPUT_END` porte uniquement une raison et aucune corrélation.
- `VOICE_INTERRUPT` ne porte aucun tour cible.
- `VOICE_STATE_EVENT` expose seulement `turn_complete`, `interrupted` et
  `waiting_for_input`.
- `DomOSServer.voiceMetrics` utilise un compteur local non exposé au client.
- `VoiceStateMachine` existe déjà et doit rester l'autorité des transitions côté
  runtime ; ADTP transporte les faits, il ne crée pas une seconde machine.

## 4. Invariants d'architecture

- Ces messages ne sont utilisés que si `media.streaming.v1` a été négociée.
- `mediaSessionId` est créé par le serveur ; `turnId` peut être créé par le client
  pour un tour d'entrée, puis confirmé/réutilisé par le serveur.
- `streamId` identifie un flux audio continu dans un tour.
- `sequence` commence à `0` et croît de `1` par stream.
- Le format effectif vient de `MEDIA_SESSION_READY`; un chunk ne peut pas changer
  de format au milieu du stream.
- Le premier chemin livré reste JSON/base64. Un framing binaire est un futur
  sprint séparé avec mesure prouvant son utilité.
- Une interruption est idempotente et cible un `turnId` explicite.
- Les événements provider sont normalisés avant d'entrer dans ADTP.

## 5. Contrats cibles complets

### 5.1 Fichier `packages/core/src/protocol/adtp.streaming.types.ts` à créer

```ts
export type MediaRole = 'user' | 'agent';

export interface MediaInputStartPayload {
  mediaSessionId: string;
  turnId: string;
  streamId: string;
  format: AudioFormatDescriptor;
  startedAt: number;
}

export interface MediaInputChunkPayload {
  mediaSessionId: string;
  turnId: string;
  streamId: string;
  sequence: number;
  data: string;
  capturedAt?: number;
}

export interface MediaInputEndPayload {
  mediaSessionId: string;
  turnId: string;
  streamId: string;
  finalSequence: number;
  reason: 'user_stop' | 'vad' | 'timeout' | 'stream_error';
}

export interface MediaOutputStartPayload {
  mediaSessionId: string;
  turnId: string;
  streamId: string;
  format: AudioFormatDescriptor;
  startedAt: number;
}

export interface MediaOutputChunkPayload {
  mediaSessionId: string;
  turnId: string;
  streamId: string;
  sequence: number;
  data: string;
}

export interface MediaOutputEndPayload {
  mediaSessionId: string;
  turnId: string;
  streamId: string;
  finalSequence: number;
  reason: 'completed' | 'interrupted' | 'error';
}

export interface MediaTranscriptPayload {
  mediaSessionId: string;
  turnId: string;
  role: MediaRole;
  text: string;
  final: boolean;
  revision: number;
  language?: string;
  confidence?: number;
}

export interface MediaTurnEventPayload {
  mediaSessionId: string;
  turnId: string;
  event:
    | 'input_started'
    | 'input_committed'
    | 'model_started'
    | 'output_started'
    | 'output_completed'
    | 'waiting_for_input'
    | 'interrupted'
    | 'failed';
  occurredAt: number;
  reason?: string;
}

export interface MediaInterruptPayload {
  mediaSessionId: string;
  turnId: string;
  reason: 'barge_in' | 'user_cancel' | 'component_unmount';
  audioPlayedMs?: number;
}

export interface MediaFlowControlPayload {
  mediaSessionId: string;
  streamId: string;
  action: 'pause' | 'resume' | 'drop';
  reason: 'buffer_high' | 'buffer_recovered' | 'session_closing';
  resumeAfterSequence?: number;
}
```

### 5.2 MessageTypes directionnels

Client vers serveur :

```ts
MEDIA_INPUT_START
MEDIA_INPUT_CHUNK
MEDIA_INPUT_END
MEDIA_INTERRUPT
```

Serveur vers client :

```ts
MEDIA_OUTPUT_START
MEDIA_OUTPUT_CHUNK
MEDIA_OUTPUT_END
MEDIA_TRANSCRIPT
MEDIA_TURN_EVENT
MEDIA_FLOW_CONTROL
```

`MEDIA_INTERRUPT` peut également être émis par le serveur lors d'une fermeture
ou d'une politique de sécurité. Les deux branches de l'union doivent rester
explicites.

### 5.3 Factories publiques

```ts
mediaInputStart(payload: MediaInputStartPayload): ADTPMessage;
mediaInputChunk(payload: MediaInputChunkPayload): ADTPMessage;
mediaInputEnd(payload: MediaInputEndPayload): ADTPMessage;
mediaOutputStart(payload: MediaOutputStartPayload): ADTPMessage;
mediaOutputChunk(payload: MediaOutputChunkPayload): ADTPMessage;
mediaOutputEnd(payload: MediaOutputEndPayload): ADTPMessage;
mediaTranscript(payload: MediaTranscriptPayload): ADTPMessage;
mediaTurnEvent(payload: MediaTurnEventPayload): ADTPMessage;
mediaInterrupt(payload: MediaInterruptPayload): ADTPMessage;
mediaFlowControl(payload: MediaFlowControlPayload): ADTPMessage;
```

### 5.4 Erreurs média à étendre

Ajouter à `MediaErrorPayload.code` :

```ts
'MEDIA_STREAM_NOT_STARTED'
'MEDIA_STREAM_ALREADY_STARTED'
'MEDIA_CHUNK_OUT_OF_ORDER'
'MEDIA_CHUNK_TOO_LARGE'
'MEDIA_BUFFER_OVERFLOW'
'MEDIA_TURN_CONFLICT'
'MEDIA_TURN_ALREADY_CLOSED'
```

## 6. Règles de cycle de vie

### 6.1 Tour nominal

1. Le client crée `turnId` et `streamId`, puis envoie `MEDIA_INPUT_START`.
2. Il envoie des chunks séquencés et bornés.
3. Il termine par `MEDIA_INPUT_END`; le serveur refuse tout nouveau chunk de ce
   stream après la fin.
4. Le serveur confirme `input_committed`, puis `model_started`.
5. Transcriptions partielles successives utilisent la même `revision` croissante ;
   une transcription finale clôt cette série, pas nécessairement le tour.
6. L'audio agent suit `OUTPUT_START`, chunks, `OUTPUT_END`.
7. `output_completed` puis `waiting_for_input` terminent le tour nominal.

### 6.2 Barge-in

1. La capture d'un nouvel input pendant la lecture déclenche localement l'arrêt
   de lecture via `VoiceStateMachine`.
2. Le client envoie `MEDIA_INTERRUPT` pour le tour agent courant, avec la durée
   réellement jouée si disponible.
3. Le serveur annule la génération provider et les buffers, puis émet
   `OUTPUT_END.reason = 'interrupted'` et `TURN_EVENT.interrupted` une seule fois.
4. Les chunks tardifs de l'ancien tour sont ignorés et comptabilisés ; ils ne
   redémarrent jamais la lecture.

### 6.3 Backpressure

- Le producteur respecte `MEDIA_FLOW_CONTROL.pause` et ne recommence qu'après
  `resume`.
- Le serveur limite par session : taille d'un chunk, octets bufferisés, durée
  audio et nombre de chunks en attente.
- `drop` ferme le stream avec une erreur explicite ; il ne supprime pas des
  chunks silencieusement.
- Les valeurs par défaut appartiennent à `DEFAULTS` et sont documentées dans les
  sprints server/client après mesure.

### 6.4 Fermeture

Fermer la session média interrompt tous les tours, vide les buffers et rend tout
chunk suivant invalide. Fermer la session DomOS entraîne la fermeture média. Une
fermeture média n'impose pas de déconnecter le chat texte.

## 7. Compatibilité avec les messages historiques

Pour une session sans `media.streaming.v1` :

- input : `AUDIO_STREAM` puis `VOICE_INPUT_END` ;
- interruption : `VOICE_INTERRUPT` ;
- output : `AUDIO_STREAM`, `AGENT_RESPONSE` et `VOICE_STATE_EVENT`.

Pour une session avec la capacité :

- ne pas dupliquer un chunk dans l'ancien et le nouveau message ;
- les adapters émettent uniquement le nouveau flux ;
- une couche de compatibilité serveur peut traduire vers l'ancien client ;
- la dépréciation ne sera supprimée qu'après une version majeure documentée.

## 8. Tâches d'implémentation

### Tâche 1 - Ajouter types, unions et exports

**Fichiers :** créer `adtp.streaming.types.ts`; modifier `adtp.types.ts` et
`packages/core/src/index.ts`.

- Implémenter tous les contrats de la section 5.
- Éviter les unions `any` et les métadonnées provider.
- Documenter `turnId`, `streamId`, `sequence` et `revision` dans les types publics.

### Tâche 2 - Ajouter validateurs, factories et limites

**Fichiers :** `adtp.validator.ts`, `adtp.serializer.ts`,
`adtp.constants.ts`, tests.

- `sequence`, `finalSequence`, `revision` : entiers positifs ou nuls.
- `confidence` : entre 0 et 1.
- IDs non vides et bornés.
- chunk base64 valide et taille décodée bornée.
- timestamps finis et plausibles sans synchronisation d'horloge stricte.

### Tâche 3 - Créer un validateur de flux pur

**Fichier à créer :** `packages/core/src/media/MediaStreamTracker.ts`.

Le tracker connaît uniquement les IDs, séquences et états. Il ne décode pas et
ne joue pas l'audio. API cible :

```ts
export interface MediaStreamTracker {
  start(input: MediaInputStartPayload | MediaOutputStartPayload): void;
  acceptChunk(input: MediaInputChunkPayload | MediaOutputChunkPayload): void;
  end(input: MediaInputEndPayload | MediaOutputEndPayload): void;
  interrupt(input: MediaInterruptPayload): void;
  closeSession(mediaSessionId: string): void;
  snapshot(mediaSessionId: string): Readonly<MediaStreamSnapshot>;
}
```

Les erreurs du tracker sont des erreurs DomOS typées, traduisibles en
`MediaErrorPayload`, jamais des erreurs provider.

### Tâche 4 - Écrire les fixtures de flux

- Tour nominal mono-chunk et multi-chunks.
- Deux transcriptions partielles puis finale.
- Duplicate, gap et ordre inversé.
- Chunk avant start et après end.
- Barge-in pendant output et double interruption.
- Backpressure pause/resume/drop.
- Fermeture média avec chunks tardifs.
- Compatibilité flux historique sans capacité.

### Tâche 5 - Documenter les mappings attendus

Créer une table dans la progression, consommée ensuite par les adapters :

| Événement DomOS | Sens | Responsabilité adapter |
| --- | --- | --- |
| `MEDIA_INPUT_CHUNK` | client -> serveur | convertir vers le format d'entrée provider |
| `MEDIA_INPUT_END` | client -> serveur | commit/flush du tour provider |
| `MEDIA_TRANSCRIPT` | serveur -> client | normaliser partial/final |
| `MEDIA_INTERRUPT` | bidirectionnel | annuler génération et buffers |
| `MEDIA_OUTPUT_CHUNK` | serveur -> client | normaliser l'audio provider |

Aucun nom d'événement provider ne doit apparaître dans les types core.

## 9. Fichiers autorisés

| Fichier | Action |
| --- | --- |
| `packages/core/src/protocol/adtp.streaming.types.ts` | Créer |
| `packages/core/src/protocol/adtp.media.types.ts` | Étendre uniquement pour les codes d'erreur |
| `packages/core/src/protocol/adtp.types.ts` | Modifier |
| `packages/core/src/protocol/adtp.validator.ts` | Modifier |
| `packages/core/src/protocol/adtp.serializer.ts` | Modifier |
| `packages/core/src/protocol/adtp.constants.ts` | Modifier |
| `packages/core/src/media/MediaStreamTracker.ts` | Créer |
| `packages/core/src/index.ts` | Modifier |
| Tests et fixtures core associés | Créer/modifier |

Le serveur, le client et les adapters restent hors zone d'écriture ; leurs
intégrations sont des sprints distincts.

## 10. Sécurité et robustesse

- Valider la taille décodée, pas seulement la longueur base64.
- Refuser un chunk d'une autre session avant toute allocation audio.
- Ne jamais inclure le contenu audio ou la transcription complète dans les logs
  de production par défaut.
- Nettoyer les buffers après fin, erreur, interruption, timeout et fermeture.
- Les IDs externes ne deviennent jamais des chemins ou clés de stockage brutes.
- Un flux malformé ne doit pas interrompre les autres sessions.

## 11. Definition of Done

- [ ] Tous les messages possèdent type, payload, union, schéma et factory.
- [ ] Chaque chunk est corrélé et séquencé.
- [ ] Le tracker et les fixtures rendent le cycle nominal et le barge-in non
  ambigus au niveau contrat; l'E2E server/client est exigé par ADTP-04.
- [ ] Le backpressure est explicite et testable.
- [ ] Le tracker pur couvre les erreurs de séquence et cleanup.
- [ ] Les fixtures définissent une seule représentation par capacité négociée;
  la preuve d'absence de double émission dans le runtime appartient à ADTP-04.
- [ ] Aucun événement provider n'a fuité dans `@domos/core`.
- [ ] Les limites de taille et mémoire sont testées.
- [ ] Build/tests core passent.
- [ ] Le mapping d'intégration est persisté pour server/client/adapters.
- [ ] La prochaine étape `ADTP-03` est inscrite dans la progression.

## 12. Hors scope

- Framing binaire et compression.
- Conversion PCM/Opus/WAV, traitée dans `core-media`.
- Implémentation du runtime serveur ou des SDKs.
- Choix du provider et gestion de credentials.

## 13. Commit recommandé

`feat(protocol): add correlated ADTP audio streaming and turn events`
