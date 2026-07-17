# Sprint ADTP-01 - Négociation provider-neutral du transport média

## 1. Fiche du sprint

| Champ | Valeur |
| --- | --- |
| Statut | Planifié après validation complète d'ADTP-00 |
| Domaine | Contrats média ADTP dans `@domos/core` |
| Intention | Choisir WebSocket ou WebRTC sans confondre contrôle, média et provider |
| Entrée | Session ADTP active avec capacités négociées |
| Sortie | Session média identifiée, transport effectif explicite et fallback observable |
| Ne livre pas | SDP provider, capture micro, adapter OpenAI/Deepgram, UI |

## 2. Besoin produit final

Une application DomOS doit fonctionner en voix sans configuration supplémentaire
sur le chemin WebSocket serveur. Le développeur peut demander WebRTC pour réduire
la latence quand le provider et le runtime le supportent. Il peut demander `auto`
uniquement de façon explicite ; DomOS préfère alors WebRTC si toute la chaîne le
supporte et choisit WebSocket avant de démarrer le flux dans le cas contraire.

Le choix effectif et la raison d'un fallback doivent être visibles par le client,
le serveur et le dashboard. Une bascule ne doit jamais arriver silencieusement au
milieu d'un tour vocal.

## 3. Distinction normative des transports

### 3.1 Transport de contrôle ADTP existant

`packages/core/src/client/DomOSClient.ts::ClientTransport` désigne aujourd'hui :

- `websocket` : enveloppes ADTP sur WebSocket ;
- `webrtc` : enveloppes ADTP sur `RTCDataChannel`.

`packages/server/src/transport/WebRTCTransport.ts` n'attache actuellement aucune
piste audio à la `RTCPeerConnection`. Son DataChannel transporte du JSON ADTP.
Il ne prouve donc pas que le média vocal est en WebRTC.

### 3.2 Transport média cible

- `websocket` : le client envoie les chunks audio dans ADTP ; le serveur les
  transmet à l'adapter/provider via son propre WebSocket ou pipeline.
- `webrtc` : une piste média navigateur est établie selon un bootstrap géré par
  le serveur ; ADTP reste le plan de contrôle et le serveur conserve un canal
  sideband pour tools, HITL, contexte et observabilité.
- `auto` : politique de sélection, jamais nom d'un transport effectif.

Un `ClientTransport = 'webrtc'` peut donc coexister avec
`MediaTransport = 'websocket'`, et inversement. Les API et métriques doivent
toujours utiliser les deux noms complets.

## 4. État source vérifié

- Aucun `MediaSession` provider-neutral n'existe dans le protocole.
- `AUDIO_STREAM` est traité dans les deux sens malgré son classement downstream.
- `DomOSServer.handleAudioInput()` crée implicitement une `LiveSession` au premier
  chunk ; le client ne connaît ni l'adapter choisi ni l'état de création.
- `VOICE_INPUT_END` et `VOICE_INTERRUPT` ne portent aucun `mediaSessionId`.
- `LiveSessionConfig` connaît voix/langue/tools mais pas le transport demandé ou
  effectif.
- Le serveur ne possède pas encore de registry provider ni de moteur de
  capacités ; ce sera livré dans `sprints/server-runtime/`.

## 5. Décisions d'architecture

### 5.1 Décisions acquises

- Politique par défaut : `websocket`.
- `webrtc` : activation explicite et échec explicite si aucun fallback n'est
  autorisé.
- `auto` : opt-in ; préférence WebRTC seulement si client, serveur, adapter,
  provider et environnement disposent des capacités nécessaires.
- La sélection se produit avant l'ouverture du premier tour audio.
- ADTP ne transporte ni clé provider ni token longue durée.
- Un fallback ferme la session média défaillante puis en ouvre une nouvelle ; il
  ne recycle pas silencieusement un `turnId`.
- La session média est enfant de la session DomOS et doit être fermée avec elle.

### 5.2 Décision à valider par le porteur

Le contrat ci-dessous propose `fallback: 'websocket' | 'none'`, avec
`websocket` par défaut pour `auto` et `none` par défaut pour une demande explicite
`webrtc`. Cette asymétrie évite de faire croire qu'une exigence WebRTC a été
respectée quand elle ne l'a pas été.

## 6. Contrats cibles complets

### 6.1 Fichier `packages/core/src/protocol/adtp.media.types.ts` à créer

```ts
export type MediaTransportPolicy = 'websocket' | 'webrtc' | 'auto';
export type EffectiveMediaTransport = 'websocket' | 'webrtc';
export type MediaFallbackPolicy = 'websocket' | 'none';
export type MediaSessionMode = 'pipeline' | 'realtime';

export interface AudioFormatDescriptor {
  mimeType: string;
  encoding: 'pcm_s16le' | 'pcm_f32le' | 'opus' | 'mp3' | 'aac' | 'flac' | 'wav';
  sampleRate: number;
  channels: 1 | 2;
  container: 'raw' | 'ogg' | 'webm' | 'wav' | 'mp3' | 'mp4';
}

export interface MediaSessionCreatePayload {
  mode: MediaSessionMode;
  transportPolicy: MediaTransportPolicy;
  fallback: MediaFallbackPolicy;
  input: AudioFormatDescriptor;
  output: AudioFormatDescriptor;
  language?: string;
  voice?: string;
}

export interface MediaSessionReadyPayload {
  requestMessageId: string;
  mediaSessionId: string;
  mode: MediaSessionMode;
  transport: EffectiveMediaTransport;
  input: AudioFormatDescriptor;
  output: AudioFormatDescriptor;
  fallbackFrom?: 'webrtc';
  fallbackReason?: MediaFallbackReason;
  expiresAt?: number;
}

export type MediaFallbackReason =
  | 'CLIENT_UNSUPPORTED'
  | 'SERVER_UNSUPPORTED'
  | 'ADAPTER_UNSUPPORTED'
  | 'PROVIDER_UNSUPPORTED'
  | 'ENVIRONMENT_UNAVAILABLE'
  | 'NEGOTIATION_FAILED';

export interface MediaSessionStatePayload {
  mediaSessionId: string;
  state: 'creating' | 'ready' | 'active' | 'closing' | 'closed' | 'failed';
  reason?: string;
}

export interface MediaSessionClosePayload {
  mediaSessionId: string;
  reason: 'client_request' | 'server_shutdown' | 'session_closed' | 'error' | 'fallback';
}

export interface MediaSignalOfferPayload {
  mediaSessionId: string;
  sdp: string;
}

export interface MediaSignalAnswerPayload {
  mediaSessionId: string;
  offerMessageId: string;
  sdp: string;
}

export interface MediaSignalIcePayload {
  mediaSessionId: string;
  candidate: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
}

export interface MediaErrorPayload {
  mediaSessionId?: string;
  requestMessageId?: string;
  code:
    | 'MEDIA_NOT_SUPPORTED'
    | 'MEDIA_TRANSPORT_UNAVAILABLE'
    | 'MEDIA_NEGOTIATION_FAILED'
    | 'MEDIA_SESSION_NOT_FOUND'
    | 'MEDIA_SESSION_CONFLICT'
    | 'MEDIA_FORMAT_UNSUPPORTED'
    | 'MEDIA_SESSION_EXPIRED';
  message: string;
  fatal: boolean;
  retryable: boolean;
  fallbackAvailable: boolean;
}
```

Règles de validation :

- `sampleRate` entre 8 000 et 96 000 ;
- `mimeType` non vide et limité à 128 caractères ;
- SDP limité à une taille définie dans `DEFAULTS` ;
- `fallbackFrom` exige `fallbackReason` ;
- `fallbackReason` n'est jamais un message brut du provider ;
- le serveur peut normaliser un format, mais doit renvoyer le format effectif.

### 6.2 MessageTypes à ajouter dans `adtp.types.ts`

Client vers serveur :

```ts
MEDIA_SESSION_CREATE
MEDIA_SESSION_CLOSE
MEDIA_SIGNAL_OFFER
MEDIA_SIGNAL_ICE
```

Serveur vers client :

```ts
MEDIA_SESSION_READY
MEDIA_SESSION_STATE
MEDIA_SIGNAL_ANSWER
MEDIA_SIGNAL_ICE
MEDIA_ERROR
```

`MEDIA_SESSION_CLOSE` et `MEDIA_SIGNAL_ICE` sont bidirectionnels dans l'union.
Chaque forme reste un membre explicite de `ADTPMessage`; aucun message générique
`MEDIA_COMMAND` n'est autorisé.

### 6.3 Factories `Messages.*`

```ts
mediaSessionCreate(payload: MediaSessionCreatePayload): ADTPMessage;
mediaSessionReady(payload: MediaSessionReadyPayload): ADTPMessage;
mediaSessionState(payload: MediaSessionStatePayload): ADTPMessage;
mediaSessionClose(payload: MediaSessionClosePayload): ADTPMessage;
mediaSignalOffer(payload: MediaSignalOfferPayload): ADTPMessage;
mediaSignalAnswer(payload: MediaSignalAnswerPayload): ADTPMessage;
mediaSignalIce(payload: MediaSignalIcePayload): ADTPMessage;
mediaError(payload: MediaErrorPayload): ADTPMessage;
```

### 6.4 Capacité ADTP requise

Tous les messages de ce sprint exigent `media.negotiation.v1`. Si elle n'a pas
été sélectionnée lors d'ADTP-00, le client utilise le chemin historique
`AUDIO_STREAM` ou reste en texte.

## 7. Flux end-to-end attendu

### 7.1 Chemin par défaut WebSocket

1. Le SDK demande `MEDIA_SESSION_CREATE` avec
   `transportPolicy: 'websocket'`.
2. Le serveur résout un runtime voix compatible avec le mode et les formats.
3. Le serveur crée son runtime provider, puis répond `MEDIA_SESSION_READY` avec
   `transport: 'websocket'`.
4. Le client commence les messages streaming d'ADTP-02.
5. Tools, HITL et contexte continuent sur la session ADTP courante.

### 7.2 WebRTC explicite

1. Le SDK demande `webrtc` et indique `fallback: 'none'` par défaut.
2. Le serveur vérifie les capacités avant de créer une ressource provider.
3. Si elles manquent, il envoie `MEDIA_ERROR`, sans créer de session WebSocket.
4. Sinon, le serveur renvoie une session `creating`; le client crée une offre et
   envoie `MEDIA_SIGNAL_OFFER`.
5. Le serveur échange le SDP par son adapter, ouvre le sideband serveur et renvoie
   `MEDIA_SIGNAL_ANSWER`.
6. Une fois la piste active, `MEDIA_SESSION_STATE.active` est émis.

### 7.3 Politique `auto`

1. Le serveur évalue une matrice : capacité ADTP, APIs navigateur, runtime
   serveur, adapter, provider et configuration d'exploitation.
2. Si tout est disponible, il sélectionne WebRTC.
3. Sinon, il crée directement le chemin WebSocket et renvoie
   `fallbackFrom: 'webrtc'` avec une raison normalisée.
4. Aucune tentative WebRTC coûteuse n'est faite quand une capacité statique
   manque déjà.

### 7.4 Échec WebRTC après création

- Avant le premier tour : si le fallback est permis, fermer la session WebRTC
  avec `reason: 'fallback'`, créer un nouvel identifiant puis annoncer WebSocket.
- Pendant un tour : interrompre/terminer le tour, fermer la session et informer
  l'application. La reprise exige une nouvelle session et un nouveau tour.
- Sans fallback : état `failed`, `MEDIA_ERROR`, cleanup complet.

## 8. Tâches d'implémentation

### Tâche 1 - Introduire les contrats média core

**Fichiers :** créer `adtp.media.types.ts`; modifier `adtp.types.ts` et
`packages/core/src/index.ts`.

- Implémenter intégralement les types de la section 6.
- Ajouter chaque message à l'union directionnelle.
- Ne pas importer WebRTC DOM, SDK provider ou types Node dans les contrats.
- Documenter la distinction contrôle/média dans les commentaires publics.

### Tâche 2 - Ajouter validation et factories

**Fichiers :** `adtp.validator.ts`, `adtp.serializer.ts`, tests protocole.

- Ajouter les schémas Zod stricts et limites.
- Vérifier les invariants conditionnels avec `superRefine`.
- Ajouter une fixture valide et au moins une fixture invalide par payload.
- Vérifier qu'un SDP ou message surdimensionné est rejeté avant traitement.

### Tâche 3 - Ajouter le sélecteur pur de politique média

**Fichier à créer :** `packages/core/src/media/media-transport-policy.ts`.

```ts
export interface MediaTransportSupport {
  clientWebRTC: boolean;
  serverWebRTC: boolean;
  adapterWebRTC: boolean;
  providerWebRTC: boolean;
  environmentWebRTC: boolean;
}

export type MediaTransportSelection =
  | { ok: true; transport: 'websocket'; fallbackReason?: MediaFallbackReason }
  | { ok: true; transport: 'webrtc' }
  | { ok: false; code: 'MEDIA_TRANSPORT_UNAVAILABLE' };

export function selectMediaTransport(
  policy: MediaTransportPolicy,
  fallback: MediaFallbackPolicy,
  support: MediaTransportSupport
): MediaTransportSelection;
```

Ce helper ne crée aucune connexion. Il rend la politique testable et sera
consommé par le server runtime après ADTP-01.

### Tâche 4 - Écrire les tests de contrat et de sélection

- WebSocket par défaut, même quand WebRTC est disponible.
- WebRTC explicite disponible.
- WebRTC explicite indisponible avec `none`.
- WebRTC explicite indisponible avec fallback autorisé.
- `auto` disponible et `auto` dégradé pour chaque cause.
- Formats invalides, session inconnue, double fermeture, SDP trop grand.
- Message média sans capacité négociée.

### Tâche 5 - Préparer le handoff serveur/client

Ce sprint ne câble pas `DomOSServer`, mais doit fournir dans sa progression :

- le tableau des handlers que `server-runtime` devra implémenter ;
- le tableau des méthodes publiques que `DomOSClient` devra exposer ;
- les invariants de cleanup ;
- une fixture de flux WebSocket et une fixture de signalisation WebRTC.

### Tâche 6 - Sécuriser la signalisation WebRTC existante avant extension média

**Fichiers :** `packages/server/src/transport/WebRTCTransport.ts`,
`packages/server/src/core/DomOSServer.ts`, auth/line helpers existants et tests
transport.

- Ajouter à `WebRTCTransportOptions` un callback d'autorisation pré-allocation
  fourni par `DomOSServer`; il valide origine, authentification transport et
  `lineToken` avant import de `wrtc` ou création de `RTCPeerConnection`.
- Cette prévalidation ne consomme pas deux fois le quota de connexions :
  l'enregistrement définitif reste lié à l'ouverture du DataChannel.
- Refuser tout `connId` fourni par le client; le serveur génère l'identifiant.
- Borner le body avant concaténation, la taille SDP et le nombre de candidates.
- Ajouter un rate limiter dédié aux requêtes HTTP de signalisation. Il ne limite
  pas le WebSocket permanent ni ses messages normaux.
- Rejeter sans appeler `wrtc` : auth absente/invalide, origine interdite,
  `lineToken` invalide, body/SDP trop grand et fréquence excessive.

## 9. Fichiers autorisés et raison

| Fichier | Action | Raison |
| --- | --- | --- |
| `packages/core/src/protocol/adtp.media.types.ts` | Créer | Contrats média ADTP |
| `packages/core/src/protocol/adtp.types.ts` | Modifier | Union des messages |
| `packages/core/src/protocol/adtp.validator.ts` | Modifier | Validation runtime |
| `packages/core/src/protocol/adtp.serializer.ts` | Modifier | Factories |
| `packages/core/src/protocol/adtp.constants.ts` | Modifier si nécessaire | Limites SDP/messages |
| `packages/core/src/media/media-transport-policy.ts` | Créer | Sélection pure et partagée |
| `packages/core/src/index.ts` | Modifier | Exports publics |
| Tests/fixtures core associés | Créer/modifier | Preuves contractuelles |
| `packages/server/src/transport/WebRTCTransport.ts` | Modifier | Auth avant allocation SDP/ICE |
| `packages/server/src/core/DomOSServer.ts` | Modifier ciblé | Fournir le callback d'autorisation |
| Tests transport/auth ciblés | Créer/modifier | Preuve de rejet pré-allocation |

`DomOSServer`, `DomOSClient`, les SDKs et les adapters sont explicitement hors de
la zone d'écriture de ce sprint. Ils consommeront le contrat dans leurs pistes.

## 10. Sécurité, confidentialité et robustesse

- Aucun token provider, clé API, URL privée ou header d'auth dans ADTP.
- Les SDP sont des données sensibles de session : logs tronqués ou hashés, jamais
  le contenu complet en production.
- Aucun `RTCPeerConnection`, parse SDP ou collecte ICE avant auth/origin/lineToken.
- Une session média appartient à une seule session DomOS authentifiée.
- Le serveur ignore/refuse un `mediaSessionId` appartenant à une autre session.
- Limiter sessions média simultanées, taille SDP, fréquence ICE et timeout de
  création ; les valeurs concrètes appartiennent au server runtime.
- Les raisons de fallback sont normalisées pour éviter les fuites provider.

## 11. Commandes de validation

```bash
pnpm --filter @domos/core test
pnpm --filter @domos/core build
```

## 12. Definition of Done

- [ ] La distinction contrôle/média est visible dans les types publics.
- [ ] `websocket`, `webrtc` et `auto` respectent la politique produit.
- [ ] Le porteur a validé la règle de fallback de la section 5.2.
- [ ] Les payloads, unions, validateurs et factories sont complets.
- [ ] Aucun type provider ou API navigateur n'entre dans le protocole.
- [ ] Chaque sélection et chaque fallback sont déterministes et testés.
- [ ] Une session média est corrélée à la session DomOS sans exposer de secret.
- [ ] La signalisation refuse auth/origin/lineToken/limites avant toute allocation
  `wrtc`, SDP ou ICE.
- [ ] Le rate limiting ajouté cible uniquement les requêtes HTTP de signalisation.
- [ ] Les messages historiques restent décodables sans capacité média.
- [ ] Le handoff server/client est écrit avec fixtures de flux.
- [ ] Build et tests core passent.
- [ ] La prochaine étape `ADTP-02` est persistée dans `progress/`.

## 13. Hors scope

- Implémentation d'un endpoint SDP OpenAI.
- Deepgram Voice Agent, LiveKit Rooms ou SIP.
- Chunks audio, VAD, transcripts et barge-in détaillés, traités en ADTP-02.
- Registry/configuration d'adapters serveur.
- Capture/lecture audio dans les SDKs.

## 14. Commit recommandé

`feat(protocol): add provider-neutral media negotiation contracts`
