# AITP — Agent-to-Interface Transfer Protocol

Ce fichier conserve le chemin historique `docs/AITP_PROTOCOL.md` afin que les
liens existants restent valides. Le nom public cible du protocole est **AITP**.
L'implémentation actuellement publiée reste toutefois le contrat **AITP
1.0.0** : cette page ne renomme aucun export, aucun type, aucun message et
aucun transport.

## Terminologie canonique

| Terme | Usage documentaire | État technique actuel |
| --- | --- | --- |
| **OwlLayer AI** | Nom complet à la première définition et dans les sections dédiées ; employer ensuite `OwlLayer` dans la prose courante. `OWL` est réservé à un préfixe court explicitement requis. | Le dépôt et plusieurs identifiants historiques utilisent encore `OwlLayer`. |
| **Agentic UI SDK** | Catégorie des intégrations développeur et des SDK de framework. | Les packages et leurs imports restent `@owllayer/*` dans cette phase. |
| **OwlLayer AI Runtime** | Couche d'exécution partagée abstraite uniquement. | Les classes restent `OwlLayerClient`, `OwlLayerServer` et `AITPTransport`; les libellés de prose deviennent `OwlLayer Client` et `OwlLayer Server`. |
| **AITP** | Nom public cible de *Agent-to-Interface Transfer Protocol*, indépendant du DOM. | Le wire protocol courant reste AITP 1.0.0 et ses identifiants `AITP*`. |
| **AITP** | Nom de compatibilité à employer lorsqu'une référence concerne le code, le wire contract courant ou une page historique. | `AITP_VERSION`, `AITPMessage`, `MessageType` et les types de payload sont toujours exportés par `@owllayer/core`. |

Le guide de transition, les étapes de dépréciation et les redirections prévues
sont regroupés dans [OWLLAYER_AI_MIGRATION.md](./OWLLAYER_AI_MIGRATION.md).

## Rôle et frontière

AITP est le protocole de messages structuré entre le runtime d'interface et
OwlLayer Server (`OwlLayerServer`). Il transporte uniquement les informations
que l'application choisit d'exposer : contexte, tools, entrées utilisateur,
demandes d'action, résultats et événements de contrôle.

L'agent ne reçoit pas un accès libre au DOM et ne déduit pas des clics. Le
handler de chaque tool reste dans le code applicatif, avec ses schémas, ses
permissions et ses contrôles HITL. Le protocole ne remplace donc pas la
logique métier de l'application.

Le contrat courant peut être porté par :

- le transport WebSocket de `AITPTransport` ;
- le DataChannel WebRTC utilisé par le client, configuré en mode ordonné ;
- une autre implémentation qui préserve exactement l'enveloppe, les payloads,
  la validation et les garanties décrites ici.

Le nom AITP décrit cette frontière d'interface, qu'elle soit web, mobile,
native ou vocale. Il ne constitue pas encore une version de wire distincte.

## Enveloppe wire

Chaque message JSON possède les champs racine suivants :

```json
{
  "id": "msg_generated_id",
  "type": "CONTEXT_UPDATE",
  "timestamp": 1706000000000,
  "payload": {
    "url": "/products/headphones",
    "activeTools": []
  },
  "meta": {
    "sessionId": "sess_example"
  }
}
```

Invariants de l'enveloppe :

- `id` est une chaîne non vide et identifie l'instance du message ;
- `type` est l'un des 14 littéraux de `MessageType` ;
- `timestamp` est un nombre produit par le runtime courant ;
- `payload` est validé selon `type`, sans permutation de ses champs métier ;
- `meta` est optionnel et peut contenir `sessionId` ou `token` ; les secrets et
  tokens réels ne doivent jamais apparaître dans la documentation ou les logs ;
- le message est sérialisé en JSON, sans enveloppe AITP supplémentaire ni
  changement de nom des champs pendant la période de compatibilité.

`encode()` utilise `JSON.stringify()`. `decode()` rejette le JSON invalide ou
un payload qui ne passe pas la validation Zod de `@owllayer/core`. `tryDecode()`
retourne `null` pour ces mêmes erreurs au lieu de lever une exception.

## Handshake et version

À l'ouverture d'un socket, le client envoie `HANDSHAKE_INIT` avec l'API key,
les informations d'agent utilisateur, le viewport, la version du SDK et la
version du protocole. Le serveur émet `HANDSHAKE_ACK` avec un `sessionId`, sa
version, la version du protocole et ses capacités.

Le serveur actuel crée la session et envoie l'acknowledgement pendant la
gestion de la connexion, tandis que le client envoie son init lors de
l'ouverture du socket. Ces traitements sont distincts : une intégration ne
doit pas ajouter une dépendance à un ordre applicatif entre les deux messages.
Après réception de l'init, le serveur compare strictement `protocolVersion` à
`AITP_VERSION` et ferme la connexion en cas d'incompatibilité.

Exemples de payloads actuels, avec une valeur fictive qui n'est pas un secret :

```json
{
  "type": "HANDSHAKE_INIT",
  "payload": {
    "apiKey": "pk_example_not_a_secret",
    "userAgent": "OwlLayerClient",
    "viewport": "0x0",
    "sdkVersion": "0.1.0",
    "protocolVersion": "1.0.0"
  }
}
```

```json
{
  "type": "HANDSHAKE_ACK",
  "payload": {
    "sessionId": "sess_example",
    "serverVersion": "1.0.0",
    "protocolVersion": "1.0.0",
    "capabilities": ["text", "audio", "tools"]
  }
}
```

Le renommage documentaire vers AITP ne change donc pas la valeur `1.0.0`, le
nom `protocolVersion`, les capacités, ni la politique d'égalité stricte. Une
future introduction d'un alias de version AITP devra conserver cette même
valeur et être livrée avec la compatibilité AITP correspondante.

## Types de messages

Les directions ci-dessous décrivent les flux du runtime actuel. Les types
`APPROVAL_REQUEST` et `AUDIO_STREAM` peuvent être émis dans les deux sens selon
le scénario ; les autres directions sont celles utilisées par les handlers
actuels.

| Message | Direction courante | Contrat |
| --- | --- | --- |
| `HANDSHAKE_INIT` | Client → serveur | Annonce l'identité technique de la session et les versions. |
| `HANDSHAKE_ACK` | Serveur → client | Confirme la session et les capacités négociées. |
| `CONTEXT_UPDATE` | Client → serveur | Synchronise l'URL, le titre, le contexte et les tools montés. |
| `USER_INPUT` | Client → serveur | Transporte du texte ou un audio complet (`modality`). |
| `TOOL_CALL` | Serveur → client | Demande l'exécution d'un tool client identifié par `callId`. |
| `TOOL_RESULT` | Client → serveur | Retourne `success`, `error` ou `pending_approval`. |
| `APPROVAL_REQUEST` | Client ↔ serveur | Décrit un risque, des arguments et le message présenté à l'humain. |
| `APPROVAL_RESPONSE` | Client → serveur | Retourne la décision et, si disponible, le résultat du tool. |
| `AGENT_RESPONSE` | Serveur → client | Transporte les chunks texte et le marqueur `done`. |
| `AUDIO_STREAM` | Client ↔ serveur | Transporte des chunks audio base64 et leur MIME type en mode live. |
| `VOICE_INPUT_END` | Client → serveur | Signale `user_stop`, `vad` ou `timeout`. |
| `VOICE_INTERRUPT` | Client → serveur | Signale un `barge_in`. |
| `VOICE_STATE_EVENT` | Serveur → client | Signale `turn_complete`, `interrupted` ou `waiting_for_input`. |
| `SYSTEM_EVENT` | Serveur → client | Porte un événement de contrôle, d'attente, d'erreur ou d'approbation. |

Les directions ne constituent pas une permission implicite. Le serveur ne
peut appeler que les tools présents dans le contexte de session et la
politique HITL est appliquée avant l'exécution d'une action à risque.

## Contrats des flux principaux

### Contexte et tools

`CONTEXT_UPDATE` contient `url`, `activeTools`, et facultativement `title` et
`context`. `activeTools` est la surface applicable à la session et à l'écran
actuels ; ce n'est pas une liste statique de toutes les actions du produit.

Après le montage, le démontage ou la navigation d'un composant, le client
réémet ce message. Le serveur recalcule alors les tools effectifs avant de
faire appel au modèle.

### Exécution et résultat

`TOOL_CALL` contient `callId`, `name` et `args`. Le client cherche le handler
local correspondant, attend sa Promise, puis renvoie `TOOL_RESULT`. Le résultat
ne doit pas être annoncé avant la fin du travail asynchrone nécessaire à
l'action.

Le champ `status` de `TOOL_RESULT` vaut `success`, `error` ou
`pending_approval`. Le `callId` reste la corrélation de l'appel à travers les
étapes d'approbation et de résultat.

### Approbation humaine

Pour un tool soumis à HITL, le flux conserve `risk`, `args`, `message`,
`approved`, `result` et `error` dans les payloads existants. Une approbation
refusée ne doit pas être transformée en succès et un tool protégé ne doit pas
être exécuté directement par un adapter LLM, LiveKit ou un autre transport.

### Texte, audio et voix

- `USER_INPUT` avec `modality: "text"` transporte un message texte ; avec
  `modality: "audio"`, `content` contient l'audio encodé et `mimeType` est
  optionnel.
- `AUDIO_STREAM` transporte `data` et `mimeType` pour un flux live.
- `AGENT_RESPONSE` peut être émis en plusieurs chunks ; `done: true` clôt le
  flux textuel.
- `VOICE_INPUT_END` clôt le tour vocal côté utilisateur.
- `VOICE_INTERRUPT` demande l'interruption d'une réponse en cours.
- `VOICE_STATE_EVENT` indique l'état vocal reconnu par le serveur.

Les noms et les valeurs de ces messages restent inchangés pendant la
transition AITP.

### Événements système

Les valeurs actuellement validées pour `SYSTEM_EVENT.kind` sont :

- `reload` ;
- `redirect` ;
- `error` ;
- `disconnect` ;
- `waiting` ;
- `approval_required` ;
- `tools_effective`.

Une valeur non déclarée, comme un ancien `rate_limit`, n'est pas un contrat
valide du validator actuel.

## Garanties à préserver pendant le renommage

Le passage du vocabulaire AITP au vocabulaire AITP est compatible uniquement
si les invariants suivants restent vrais :

1. **Wire identique** : mêmes chaînes `type`, mêmes champs de payload, mêmes
   directions et même valeur de `protocolVersion`.
2. **Sérialisation identique** : JSON encodé par `encode()` et validation par
   `decode()` ou `tryDecode()`.
3. **Ordre par transport** : WebSocket conserve l'ordre de chaque direction et
   le DataChannel WebRTC courant est créé avec `ordered: true`. `timestamp` est
   une information de message, pas une instruction pour réordonner le flux.
4. **Handshake identique** : l'égalité stricte de version et la fermeture sur
   incompatibilité sont maintenues.
5. **Sécurité identique** : API keys, tokens, contexte sensible, arguments et
   résultats restent soumis aux règles de confidentialité et d'autorisation.
6. **HITL identique** : un risque `high` ou `critical` conserve son étape de
   confirmation avant l'exécution.
7. **Exécution identique** : un `TOOL_RESULT` n'est émis qu'après le résultat
   du handler ou après la décision d'approbation correspondante.
8. **Compatibilité des noms** : `AITP_VERSION`, `AITPMessage`,
   `AITPTransport` et les imports `@owllayer/*` restent utilisables jusqu'à une
   dépréciation explicitement livrée et validée.

## Référence côté code actuel

Cet extrait utilise uniquement les exports présents dans `@owllayer/core` au
moment de la rédaction :

```ts
import {
  AITP_VERSION,
  MessageType,
  Messages,
  encode,
  tryDecode,
} from '@owllayer/core';

const handshake = Messages.handshakeInit(
  'pk_example_not_a_secret',
  'OwlLayerClient',
  '0x0',
  '0.1.0',
  AITP_VERSION,
);

const wireText = encode(handshake);
const decoded = tryDecode(wireText);

if (decoded?.type === MessageType.HANDSHAKE_INIT) {
  console.log(decoded.payload.protocolVersion === AITP_VERSION);
}
```

La migration des noms de fichiers, types ou exports appartient à une étape
ultérieure et ne doit pas être déduite de cet exemple. Pour le parcours
complet, voir [le guide de migration OwlLayer AI](./OWLLAYER_AI_MIGRATION.md).

## Références

- [Concepts OwlLayer AI](./CONCEPTS.md)
- [Sécurité HITL](./HITL_SECURITY.md)
- [Règles de publication](./RELEASE_PROCESS.md)
- [Issue #15 — nomenclature OwlLayer AI et guide AITP](https://github.com/borisbob91/owllayer/issues/15)
