# Sprint ADTP-00 - Compatibilité, handshake et capacités

## 1. Fiche du sprint

| Champ | Valeur |
| --- | --- |
| Statut | À valider par le porteur avant implémentation |
| Domaine | `@domos/core` protocole + handshake `@domos/server` + consommation `DomOSClient` |
| Intention | Faire évoluer ADTP sans casser les clients publiés et sans introduire JSON-RPC |
| Dépendances | Aucune nouvelle dépendance npm |
| Bloque | ADTP-01, server runtime, OpenAI Realtime, Deepgram streaming, LiveKit patch |
| Livraison attendue | Contrat `1.1.0`, négociation déterministe et matrice ancien/nouveau automatisée |

## 2. Besoin produit final

Un développeur doit pouvoir mettre à jour le serveur DomOS avant ses applications
clientes, puis mettre à jour les SDKs progressivement. Une application déjà
déployée ne doit pas cesser de fonctionner uniquement parce que le serveur sait
désormais gérer la voix streaming ou WebRTC.

Au terme du sprint :

1. le client annonce les versions et capacités qu'il comprend ;
2. le serveur choisit une version compatible et l'intersection des capacités ;
3. aucun côté n'envoie un message optionnel non négocié ;
4. une incompatibilité produit une erreur ADTP structurée puis une fermeture
   explicite ;
5. les clients `1.0.0` continuent à utiliser texte, tools et audio historique ;
6. aucun secret d'authentification n'est copié dans les logs ou erreurs.

## 3. État source vérifié

### 3.1 Contrats actuels

- `packages/core/src/protocol/adtp.constants.ts` exporte
  `ADTP_VERSION = '1.0.0'`.
- `packages/core/src/protocol/adtp.types.ts` définit
  `HandshakeInitPayload.protocolVersion: string` et
  `HandshakeAckPayload.capabilities: string[]`.
- `packages/core/src/protocol/adtp.serializer.ts` expose
  `Messages.handshakeInit(...)` et `Messages.handshakeAck(...)` avec des
  paramètres positionnels.
- `packages/core/src/protocol/adtp.validator.ts` valide un seul
  `protocolVersion`; un `MessageType` inconnu échoue avant toute négociation.
- `packages/core/src/client/DomOSClient.ts::connectWebSocket()` et
  `connectWebRTC()` envoient `HANDSHAKE_INIT` dès l'ouverture.
- `packages/server/src/core/DomOSServer.ts::handleConnection()` crée et active
  la session, puis envoie `HANDSHAKE_ACK` avant d'avoir lu `HANDSHAKE_INIT`.
- `DomOSServer.handleMessage()` ferme la connexion si
  `payload.protocolVersion !== ADTP_VERSION`.

### 3.2 Risques à corriger

- L'ACK actuel ne peut pas être le résultat d'une négociation puisqu'il précède
  l'offre du client.
- Une égalité stricte interdit une évolution mineure additive.
- La chaîne libre `capabilities: string[]` n'a ni catalogue ni règle
  d'intersection.
- `tryDecode()` retourne `null` sans permettre au transport d'expliquer le rejet.
- La clé API existe à la fois dans l'URL/authentification transport et dans
  `HandshakeInitPayload.apiKey`; le protocole ne doit pas créer un troisième
  mécanisme d'authentification.

## 4. Décisions d'architecture

### 4.1 Décisions acquises

- L'enveloppe ADTP reste inchangée.
- L'authentification reste la responsabilité du transport serveur
  (`ClientAuth`); la négociation ADTP n'émet aucun credential.
- Les champs historiques restent présents et les nouveaux champs sont additifs
  pendant la ligne `1.x`.
- Une capacité absente signifie « ne pas envoyer les messages associés ».
- Une capacité inconnue est ignorée, jamais activée implicitement.
- Les types provider restent hors de `@domos/core`.

### 4.2 Décision à valider par le porteur

La version cible proposée est `1.1.0`. La règle est : même version majeure,
puis choix de la version la plus élevée présente dans l'intersection. Une rupture
de schéma obligatoire nécessitera un ADR et `2.0.0`.

## 5. Contrats cibles complets

### 5.1 Fichier `packages/core/src/protocol/adtp.capabilities.ts` à créer

Ce fichier devient le catalogue stable des capacités core. Les adapters peuvent
annoncer leurs capacités détaillées par l'API serveur, mais pas inventer une
capacité ADTP provider-spécifique.

```ts
export const ADTP_CAPABILITIES = {
  TEXT: 'text',
  TOOLS: 'tools',
  AUDIO_LEGACY: 'audio.legacy',
  PROTOCOL_ERRORS: 'protocol.errors.v1',
  MEDIA_NEGOTIATION: 'media.negotiation.v1',
  MEDIA_STREAMING: 'media.streaming.v1',
  TOOL_REVISIONS: 'tools.revisions.v1',
} as const;

export const ADTP_LEGACY_CAPABILITY_ALIASES = {
  text: ADTP_CAPABILITIES.TEXT,
  tools: ADTP_CAPABILITIES.TOOLS,
  audio: ADTP_CAPABILITIES.AUDIO_LEGACY,
} as const;

export type ADTPCapability =
  (typeof ADTP_CAPABILITIES)[keyof typeof ADTP_CAPABILITIES];

export interface ADTPProtocolOffer {
  versions: string[];
  capabilities: ADTPCapability[];
}

export interface ADTPProtocolSelection {
  version: string;
  capabilities: ADTPCapability[];
}
```

Dans `adtp.constants.ts`, la version courante et la valeur de compatibilité sont
distinctes afin qu'un nouveau client ne soit pas rejeté par l'égalité stricte
d'un ancien serveur :

```ts
export const ADTP_VERSION = '1.1.0';
export const ADTP_LEGACY_VERSION = '1.0.0';
export const ADTP_SUPPORTED_VERSIONS = [ADTP_VERSION, ADTP_LEGACY_VERSION] as const;
```

Règles normatives : listes uniques, non vides pour `versions`, triées par le
helper de négociation, limitées à 16 versions et 64 capacités, et chaînes de
capacité limitées à 96 caractères.

### 5.2 Fichier `packages/core/src/protocol/adtp.types.ts` à modifier

Remplacer les deux payloads de handshake par les formes complètes suivantes. Les
champs historiques restent obligatoires dans `1.1.0` afin qu'un serveur `1.0.0`
puisse encore valider un message venant d'un nouveau client.

```ts
export interface HandshakeInitPayload {
  /** Valeur de compatibilité lue par les serveurs 1.0.x à égalité stricte. */
  protocolVersion: string;
  sdkVersion: string;
  userAgent: string;
  viewport: string;
  /**
   * Déprécié : valeur sentinelle non secrète pour valider les serveurs 1.0.x.
   * Ne contient jamais la vraie API key.
   */
  apiKey: string;
  /** Présent à partir de 1.1; absent chez un client 1.0. */
  protocol?: ADTPProtocolOffer;
}

export interface HandshakeAckPayload {
  sessionId: string;
  serverVersion: string;
  /** Conservé pour les clients 1.0.x : version effectivement sélectionnée. */
  protocolVersion: string;
  /** Conservé pour les clients 1.0.x : capacités effectivement sélectionnées. */
  capabilities: string[];
  /** Présent à partir de 1.1; absent chez un serveur 1.0. */
  protocol?: ADTPProtocolSelection;
}

export interface ProtocolErrorPayload {
  code: ProtocolErrorCode;
  message: string;
  fatal: boolean;
  retryable: boolean;
  relatedMessageId?: string;
  details?: Record<string, string | number | boolean>;
}

export type ProtocolErrorCode =
  | 'PROTOCOL_VERSION_UNSUPPORTED'
  | 'CAPABILITY_NOT_NEGOTIATED'
  | 'INVALID_MESSAGE'
  | 'INVALID_MESSAGE_DIRECTION'
  | 'MESSAGE_TOO_LARGE';
```

Ajouter `PROTOCOL_ERROR` à `MessageType` et à l'union `ADTPMessage`. Il peut être
émis dans les deux directions : la direction réelle dépend du message rejeté.

### 5.3 Fichier `packages/core/src/protocol/adtp.negotiation.ts` à créer

```ts
export interface NegotiateADTPInput {
  client: ADTPProtocolOffer;
  server: ADTPProtocolOffer;
}

export type NegotiateADTPResult =
  | { ok: true; selection: ADTPProtocolSelection }
  | {
      ok: false;
      error: ProtocolErrorPayload & {
        code: 'PROTOCOL_VERSION_UNSUPPORTED';
      };
    };

export function negotiateADTP(input: NegotiateADTPInput): NegotiateADTPResult;
export function supportsCapability(
  selection: ADTPProtocolSelection,
  capability: ADTPCapability
): boolean;
export function normalizeLegacyCapabilities(
  capabilities: readonly string[]
): ADTPCapability[];
```

L'implémentation parse strictement `major.minor.patch`, refuse les versions
invalides, ne mute pas les entrées et renvoie une intersection déterministe.

### 5.4 Serializer et validation

Dans `adtp.serializer.ts`, remplacer les factories positionnelles par des
paramètres objets, tout en conservant temporairement une surcharge compatible :

```ts
handshakeInit(payload: HandshakeInitPayload): ADTPMessage;
handshakeAck(payload: HandshakeAckPayload): ADTPMessage;
protocolError(payload: ProtocolErrorPayload): ADTPMessage;
```

Dans `adtp.validator.ts`, ajouter les schémas des contrats ci-dessus avec
`.strict()` pour les nouveaux objets de protocole. Ne pas rendre tout le payload
historique strict dans ce sprint : cela pourrait casser des clients existants.

## 6. Flux attendu

### 6.1 Nouveau client vers nouveau serveur

1. Le transport authentifie la connexion et crée une session `negotiating`, non
   encore active.
2. Le client envoie `HANDSHAKE_INIT` avec les champs historiques et `protocol`.
3. Le serveur valide l'offre, calcule l'intersection et envoie
   `HANDSHAKE_ACK.protocol`.
4. Le serveur persiste la sélection sur la session, puis seulement passe la
   session à `active`.
5. Client et serveur filtrent tout message optionnel selon cette sélection.

### 6.2 Ancien client vers nouveau serveur

1. Le client envoie le payload `1.0.0` sans `protocol`.
2. Le serveur construit l'offre implicite
   `{ versions: [protocolVersion], capabilities: ['text', 'tools', 'audio.legacy'] }`.
3. Le serveur répond avec les champs historiques de l'ACK et peut aussi inclure
   `protocol`; l'ancien validateur ignore les champs additionnels actuels.
4. Aucun message `media.*` ou `tools.revisions.*` n'est envoyé.

### 6.3 Nouveau client vers ancien serveur

1. Le nouveau client envoie `protocolVersion: ADTP_LEGACY_VERSION` dans le champ
   historique et annonce ses vraies versions dans `protocol.versions` tant que
   la compatibilité `1.0` est activée.
2. Il envoie la sentinelle non secrète `apiKey: 'transport-auth'`; l'ancien
   serveur a déjà authentifié la requête transport et exige seulement une chaîne
   non vide dans son validateur.
3. L'ancien serveur ignore `protocol`, envoie son ACK historique et accepte le
   handshake.
4. L'absence de `ack.protocol` force le client en mode capacités historiques.

### 6.4 Aucune version commune

Avant sélection, les seuls messages autorisés sont `HANDSHAKE_INIT`,
`HANDSHAKE_ACK` et les messages historiques compris par `1.0`. Le nouveau serveur
envoie donc `SYSTEM_EVENT error`, puis ferme avec le code WebSocket `1002` et la
raison courte `ADTP version unsupported`. `PROTOCOL_ERROR` n'est utilisé qu'après
une sélection qui inclut `protocol.errors.v1`; il ne sert jamais à négocier sa
propre disponibilité.

### 6.5 Traduction des capacités historiques

- À la réception d'une offre/ACK `1.0`, normaliser `audio` vers `audio.legacy`.
- Pour un ancien client, conserver `['text', 'audio', 'tools']` dans le champ
  historique de l'ACK.
- Pour un nouveau client, `protocol.capabilities` contient les noms canoniques.
- La normalisation est interne et idempotente; elle ne réécrit pas la fixture
  historique reçue.

## 7. Tâches d'implémentation

### Tâche 1 - Ajouter le catalogue et le moteur de négociation

**Fichiers :** créer `adtp.capabilities.ts`, `adtp.negotiation.ts` et leurs tests.

- Implémenter les types de la section 5 sans dépendance provider.
- Exporter séparément version courante, version legacy et versions supportées ;
  ne jamais déduire l'offre du seul champ historique.
- Dédupliquer et borner les listes avant comparaison.
- Tester versions malformées, ordre différent, intersection vide, capacités
  inconnues et absence de mutation.
- Tester explicitement l'alias bidirectionnel `audio` / `audio.legacy`.
- Exporter les symboles publics depuis `packages/core/src/index.ts`.

**Preuve attendue :** tests unitaires avec tables couvrant au moins les quatre
combinaisons de compatibilité de la section 6.

### Tâche 2 - Étendre l'enveloppe ADTP

**Fichiers :** `adtp.types.ts`, `adtp.validator.ts`, `adtp.serializer.ts`,
`adtp.constants.ts` et tests protocole existants.

- Ajouter les champs optionnels, `PROTOCOL_ERROR` et les factories.
- Monter `ADTP_VERSION` à `1.1.0` uniquement quand la matrice de compatibilité
  est verte.
- Ajouter les limites de taille dans `DEFAULTS` : offre de protocole et message
  JSON complet.
- Vérifier qu'un message `1.0.0` enregistré en fixture reste décodable.

### Tâche 3 - Corriger le cycle de handshake serveur

**Fichiers :**

- `packages/server/src/core/DomOSServer.ts` ;
- `packages/server/src/session/Session.ts` ou le type de session réel identifié
  par l'implémentateur ;
- tests serveur de connexion/handshake.

- Ne plus envoyer l'ACK dans `handleConnection()` avant `HANDSHAKE_INIT`.
- Créer la session dans un état de négociation et démarrer un timeout borné.
- Déplacer l'activation et l'envoi de l'ACK dans un handler dédié
  `handleHandshakeInit()`.
- Stocker `protocolVersion` et `capabilities` négociés sur la session.
- Refuser tout message métier reçu avant le handshake.
- Différer le `SYSTEM_EVENT waiting` des virtual lines jusqu'après l'ACK ; aucun
  événement applicatif serveur ne doit précéder la sélection protocolaire.
- Nettoyer le timeout à l'activation, à la fermeture et au shutdown.

### Tâche 4 - Rendre `DomOSClient` compatible dans les deux sens

**Fichiers :** `packages/core/src/client/DomOSClient.ts`, ses événements/types et
tests client.

- Envoyer l'offre complète sur WebSocket et DataChannel.
- Utiliser `ADTP_LEGACY_VERSION` dans `payload.protocolVersion` et
  `ADTP_SUPPORTED_VERSIONS` dans `payload.protocol.versions`; un test doit
  empêcher de remplacer accidentellement le champ legacy par `ADTP_VERSION`.
- Envoyer la sentinelle `transport-auth` dans le champ `apiKey`; ne jamais
  recopier `options.apiKey` dans ADTP.
- Interpréter un ACK ancien comme le profil historique.
- Exposer en lecture seule la version et les capacités négociées.
- Bloquer localement l'envoi d'un message optionnel non négocié avec une erreur
  claire, sans couper la connexion pour une erreur applicative récupérable.
- Réinitialiser la sélection à chaque déconnexion/reconnexion.

### Tâche 5 - Ajouter la matrice contractuelle

**Fichiers :** fixtures et tests sous `packages/core/tests/` et
`packages/server/tests/` selon l'arborescence réelle du dépôt.

- Fixture client `1.0.0` / serveur `1.1.0`.
- Fixture client `1.1.0` / serveur simulé `1.0.0`.
- Cas `1.1.0` des deux côtés.
- Cas majeur incompatible.
- Cas message optionnel sans capacité.
- Cas timeout de handshake et reconnexion sans fuite de timer.

### Tâche 6 - Fermer les frontières pré-handshake existantes

**Fichiers :** `packages/server/src/transport/adtp.transport.ts`, tests transport
et logs associés.

- Ne plus journaliser `raw.slice(...)` pour un message invalide; journaliser
  uniquement type d'erreur, taille et identifiant de connexion redigé.
- Définir une taille maximale WebSocket au niveau du serveur `ws` et la même
  limite au validateur ADTP.
- Vérifier qu'une API key, un token de ligne ou un fragment base64 n'apparaît pas
  dans les logs de rejet.

## 8. Fichiers autorisés et raison

| Fichier | Action | Raison |
| --- | --- | --- |
| `packages/core/src/protocol/adtp.capabilities.ts` | Créer | Catalogue public provider-neutral |
| `packages/core/src/protocol/adtp.negotiation.ts` | Créer | Algorithme pur et testable |
| `packages/core/src/protocol/adtp.types.ts` | Modifier | Payloads et message d'erreur |
| `packages/core/src/protocol/adtp.validator.ts` | Modifier | Validation runtime |
| `packages/core/src/protocol/adtp.serializer.ts` | Modifier | Factories typées |
| `packages/core/src/protocol/adtp.constants.ts` | Modifier | Version et limites |
| `packages/core/src/index.ts` | Modifier | Exports publics |
| `packages/core/src/client/DomOSClient.ts` | Modifier | Offre et sélection client |
| `packages/server/src/core/DomOSServer.ts` | Modifier | Ordonnancement du handshake |
| `packages/server/src/transport/adtp.transport.ts` | Modifier | Limite payload et logs redigés |
| Types/session et tests directement concernés | Modifier/créer | Persistance et preuves |

Tout autre fichier doit être ajouté au journal de progression avec justification
avant modification. Aucun adapter provider n'appartient à ce sprint.

## 9. Sécurité et erreurs

- Ne jamais journaliser `HandshakeInitPayload.apiKey`, token de ligne ou headers.
- Le champ legacy `apiKey` contient une sentinelle fixe, jamais le credential du
  transport.
- Limiter taille et nombre de versions/capacités avant allocation importante.
- Une erreur de protocole fatale ferme la connexion ; une capacité non négociée
  sur un message optionnel est fatale car elle révèle une désynchronisation.
- Les détails d'erreur exposent les versions supportées, jamais la configuration
  provider ou les secrets serveur.
- Le handshake a un timeout configurable avec valeur par défaut bornée.

## 10. Commandes de validation

```bash
pnpm --filter @domos/core test
pnpm --filter @domos/core build
pnpm --filter @domos/server test
pnpm --filter @domos/server build
```

Ajouter la commande exacte du test de matrice dans le fichier de progression une
fois son chemin réel créé.

## 11. Definition of Done

- [ ] Le porteur a validé `1.1.0` et la règle de sélection.
- [ ] Le serveur attend `HANDSHAKE_INIT` avant d'activer la session.
- [ ] Le client et le serveur exposent la même sélection négociée.
- [ ] Les quatre scénarios de compatibilité sont automatisés.
- [ ] Un message optionnel non négocié est refusé de façon déterministe.
- [ ] Les erreurs de protocole sont structurées et ne divulguent aucun secret.
- [ ] Les timers et sessions provisoires sont nettoyés dans tous les chemins.
- [ ] Les exports publics et la documentation de migration sont à jour.
- [ ] Les builds et tests core/server passent.
- [ ] Aucun champ JSON-RPC ou provider n'a été introduit.
- [ ] `progress/SPRINT-ADTP-00-progress.md` contient les preuves, écarts et la
  prochaine étape `ADTP-01`.

## 12. Hors scope

- Sélection du transport média et SDP.
- Chunks audio et transcriptions.
- Révision des tools et comportement provider lors d'un démontage.
- Registry d'adapters serveur.
- Modification des SDKs React, Angular, Vue, Svelte ou Browser.

## 13. Commit recommandé

`feat(protocol): negotiate ADTP versions and capabilities`
