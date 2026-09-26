# Guide de migration OwlLayer AI et AITP

Ce guide livre le lot documentaire de l'issue #15. Il établit le vocabulaire
public et le parcours de compatibilité avant toute modification de package ou
de runtime.

## Résumé de la décision

| Sujet | Terme canonique public | Situation dans le code actuel |
| --- | --- | --- |
| Marque | **OwlLayer AI** à la première définition et dans les sections dédiées ; **OwlLayer** ensuite dans la prose courante. **OWL** est réservé à un préfixe court explicitement requis. | Le dépôt et les identifiants historiques contiennent encore `OwlLayer`. |
| Catégorie développeur | **Agentic UI SDK** | Les intégrations existantes restent les SDK `@owllayer/*`. |
| Couche d'exécution | **OwlLayer AI Runtime** pour la couche partagée abstraite uniquement. | Les classes réelles restent `OwlLayerClient`, `OwlLayerServer` et `AITPTransport`; les libellés de prose deviennent `OwlLayer Client` et `OwlLayer Server`. |
| Protocole | **AITP — Agent-to-Interface Transfer Protocol** | Le wire contract courant reste AITP 1.0.0. |
| Namespace npm cible | `@owllayer` | Les manifests et imports actuels restent `@owllayer/*`. |
| Slug technique cible | `owllayer` | Le dépôt et les URLs actuels ne sont pas renommés par cette issue. |

Règle de lecture : AITP est le nom à employer dans une nouvelle explication
produit, mais **AITP reste le nom de compatibilité dès qu'il s'agit du code,
des exports, des fichiers, des messages ou du wire protocol actuellement
exécuté**.

## Ce qui est livré dans l'issue #15

Cette phase est documentaire et ne demande aucune modification de package :

- les pages nouvelles définissent **OwlLayer AI** une première fois, puis
  emploient **OwlLayer** dans leur prose courante ; **Agentic UI SDK**,
  **OwlLayer AI Runtime** et **AITP** sont utilisés selon le tableau ci-dessus ;
- `docs/AITP_PROTOCOL.md` décrit AITP comme le nom public cible et AITP 1.0.0
  comme le contrat filaire compatible ;
- les exemples exécutables conservent les imports `@owllayer/*`, les types et les
  exports réellement présents ;
- aucune API, aucun fichier source, aucune constante et aucun message wire ne
  sont renommés ;
- aucune issue, publication npm, migration de namespace ou modification de
  `docs-site/` n'est incluse dans ce lot.

La page de référence du protocole est [AITP_PROTOCOL.md](./AITP_PROTOCOL.md) et
la vue conceptuelle est [CONCEPTS.md](./CONCEPTS.md).

## Parcours de migration pour les contributeurs

### 1. Mettre à jour la prose

Dans une nouvelle page ou une section dédiée :

- définir **OwlLayer AI** à la première occurrence, puis écrire **OwlLayer**
  dans les explications ordinaires ;
- réserver **OWL** à un préfixe court explicitement requis, sans l'utiliser
  pour renommer les identifiants techniques actuels ;
- écrire **Agentic UI SDK** pour parler d'une intégration développeur ou d'un
  SDK framework ;
- écrire **OwlLayer AI Runtime** seulement lorsqu'il s'agit de la couche
  d'exécution partagée abstraite, jamais comme synonyme d'un composant client
  ou serveur établi ;
- écrire **AITP** pour le nom public du protocole, en indiquant « compatibilité
  wire AITP 1.0.0 » à la première occurrence d'une page technique.

Dans un historique, une référence de code ou une migration, les noms
`OwlLayer*`, `AITP*` et `@owllayer/*` restent exacts et doivent être conservés. Dans
la prose, les diagrammes et les libellés de déploiement, `OwlLayer Server` et
`OwlLayer Client` deviennent `OwlLayer Server` et `OwlLayer Client`. Cette
équivalence ne permet pas de remplacer un identifiant exact par « Runtime » ou
par un symbole qui n'existe pas encore.

### 2. Préserver les exemples exécutables

Pendant la période de transition, les extraits qui compilent contre l'état
actuel doivent continuer à importer depuis `@owllayer/*`. Pour le protocole,
`@owllayer/core` exporte actuellement `AITP_VERSION`, `MessageType`, `Messages`,
`encode`, `decode`, `tryDecode`, `validateMessage` et les types `AITP*`.

Un guide ne doit pas présenter un futur alias AITP comme un export installable
avant que l'implémentation correspondante ait été livrée, testée et publiée.
Les tableaux de migration peuvent montrer une cible textuelle, mais elle doit
être identifiée comme **future** et non comme une instruction à copier.

### 3. Ne pas modifier le wire contract

Le renommage de vocabulaire ne doit pas modifier :

- les chaînes `HANDSHAKE_INIT`, `HANDSHAKE_ACK`, `CONTEXT_UPDATE`,
  `USER_INPUT`, `TOOL_CALL`, `TOOL_RESULT`, `APPROVAL_REQUEST`,
  `APPROVAL_RESPONSE`, `AGENT_RESPONSE`, `AUDIO_STREAM`, `VOICE_INPUT_END`,
  `VOICE_INTERRUPT`, `VOICE_STATE_EVENT` et `SYSTEM_EVENT` ;
- l'enveloppe `id`, `type`, `timestamp`, `payload` et `meta` ;
- les noms et types de champs de payload ;
- la valeur courante `protocolVersion: "1.0.0"` et la vérification stricte du
  handshake ;
- l'ordre par direction du WebSocket et le DataChannel WebRTC ordonné ;
- le cycle `TOOL_CALL` → handler local → `TOOL_RESULT` ;
- l'approbation HITL avant l'exécution des risques `high` et `critical` ;
- les frontières de sécurité, les secrets côté serveur et l'absence d'accès
  libre au DOM.

Les invariants complets sont documentés dans [la spécification AITP compatible
AITP](./AITP_PROTOCOL.md).

### 4. Garder les packages actuels jusqu'à leur migration dédiée

L'issue #15 ne transforme pas les imports et ne change pas les manifests. Les
packages ci-dessous restent donc les références actuelles dans les exemples :

| Référence actuelle | Cible documentaire future | Règle pour cette issue |
| --- | --- | --- |
| `@owllayer/core` | `@owllayer/core` | Garder `@owllayer/core` dans le code. |
| `@owllayer/ui` | `@owllayer/ui` | Garder `@owllayer/ui` dans le code. |
| `@owllayer/browser` | `@owllayer/browser` | Garder `@owllayer/browser` dans le code. |
| `@owllayer/react` | `@owllayer/react` | Garder `@owllayer/react` dans le code. |
| `@owllayer/vue` | `@owllayer/vue` | Garder `@owllayer/vue` dans le code. |
| `@owllayer/svelte` | `@owllayer/svelte` | Garder `@owllayer/svelte` dans le code. |
| `@owllayer/angular` | `@owllayer/angular` | Garder `@owllayer/angular` dans le code. |
| `@owllayer/server` | `@owllayer/server` | Garder `@owllayer/server` dans le code. |
| `@owllayer/adapter-openai` | `@owllayer/adapter-openai` | Garder l'import actuel. |
| `@owllayer/adapter-google` | `@owllayer/adapter-google` | Garder l'import actuel. |
| `@owllayer/adapter-anthropic` | `@owllayer/adapter-anthropic` | Garder l'import actuel. |
| `@owllayer/adapter-livekit` | `@owllayer/adapter-livekit` | Garder l'import actuel. |

La cohorte et les conditions de publication sont définies dans
[RELEASE_PROCESS.md](./RELEASE_PROCESS.md). Une future migration de package devra être
livrée par son issue de package, avec tests, inspection de tarball et règles de
publication correspondantes.

### 5. Retirer le workspace audio autonome

`@owllayer/audio` n'a jamais été publié sur npm. L'issue #49 retire donc son
workspace local au lieu de produire un package de compatibilité ou de
dépréciation. Les intégrations maintenues utilisent
`@owllayer/core/media/audio` pour les utilitaires PCM, WAV, Opus, de
détection de format et de MIME.

## Stratégie de dépréciation

La dépréciation porte sur les noms, pas sur le sens du protocole. Elle suit
quatre phases contrôlées :

| Phase | État | Règle de compatibilité |
| --- | --- | --- |
| 0. Documentation | **Issue #15** | AITP est le terme public ; AITP, `@owllayer/*` et les exports actuels restent les références exécutables. |
| 1. Alias dans le core | Future implémentation | Ajouter les noms canoniques en conservant les anciens exports, la même valeur de version et le même wire contract. |
| 2. Migration des packages | Future implémentation | Migrer les manifests, imports, URLs et tarballs par cohorte ; conserver les anciens noms pendant la fenêtre annoncée. |
| 3. Retrait breaking | Décision ultérieure | Retirer un ancien nom seulement après documentation, tests de compatibilité, validation registry et annonce d'une release majeure. |

Les règles suivantes s'appliquent à chaque phase :

1. Un ancien export public ne disparaît pas dans la release qui introduit son
   remplaçant.
2. Une simple différence de nom ne déclenche ni une nouvelle version wire ni
   une nouvelle forme de payload.
3. Une documentation ne doit jamais inviter à changer un import avant que le
   package cible ne soit réellement publié.
4. Une erreur de compatibilité se corrige par une release corrective ou une
   dépréciation de version ; une version npm déjà publiée n'est jamais écrasée.
5. La fin de la période de compatibilité est une décision explicite, vérifiée
   par les tests et les preuves de publication, sans date implicite dans ce
   guide.

## Mapping des redirections documentaires

Cette matrice fixe les destinations à appliquer lors d'un futur travail de
publication du site. Elle ne modifie pas `docs-site/` dans l'issue #15.

| Source ou URL historique | Destination canonique prévue | Action dans l'issue #15 |
| --- | --- | --- |
| `docs/AITP_PROTOCOL.md` | Conserver le fichier pendant la compatibilité ; page publique cible `/aitp-protocol/` | Contenu aligné sur AITP, sans renommage de fichier. |
| `/aitp-protocol/` | `/aitp-protocol/` | Prévoir une redirection permanente ou un alias compatible dans une issue `docs-site/` distincte ; conserver l'ancien lien pendant la période de dépréciation. |
| `docs/CONCEPTS.md` | Même chemin source ; route publiée actuelle `/core-concepts/` | Contenu aligné sur le glossaire, sans redirection. |
| `/core-concepts/` | Même route canonique | Aucun changement de route dans cette issue. |
| `docs/RELEASE_PROCESS.md` | Même chemin source | Règles de publication alignées, sans redirection. |
| `docs/MIGRATION_V0.2.md` | Même chemin source et route de migration existante | Guide fonctionnel indépendant ; ne pas le renommer dans #15. |
| `docs/MIGRATION_RESOLVER.md` | Même chemin source et route de migration existante | Guide fonctionnel indépendant ; ne pas le renommer dans #15. |
| `docs/OWLLAYER_AI_MIGRATION.md` | Route publique future `/owllayer-ai-migration/` | Nouveau guide source de cette issue ; son entrée de navigation relève d'une issue `docs-site/` séparée. |

Lorsqu'une redirection sera implémentée, elle devra conserver les signets vers
les ancres de la page de protocole, publier une URL canonique AITP et laisser
un lien de retour vers ce guide de migration. La suppression du fichier
historique ou de l'ancienne route n'est pas autorisée avant la fin de la
fenêtre de compatibilité.

## Publication et preuves attendues

Le lot #15 est documentaire :

- aucun package n'est publié et aucun Changeset n'est requis ;
- seules les futures publications de packages maintenus sous `packages/`
  pourront entrer dans la cohorte publique ;
- les applications, plugins, documentation, workspaces privés et fichiers
  locaux de planification restent exclus du publish ;
- une migration de code future devra prouver le build, les tests, le contrat
  wire, la sécurité HITL, les tarballs et l'installation depuis le registry ;
- les preuves publiques doivent rester assainies : aucun token, secret,
  session, identité d'authentification, chemin de poste ou URL privée.

## Validation éditoriale

Avant de fusionner une page qui reprend ce vocabulaire :

- vérifier que toute première mention du protocole distingue AITP du wire AITP
  courant ;
- rechercher les occurrences de `OwlLayer` seul dans la prose et les remplacer
  par **OwlLayer AI** ;
- vérifier que les imports et identifiants dans les blocs de code existent
  encore dans les packages `@owllayer/*` ;
- vérifier les liens relatifs vers `AITP_PROTOCOL.md`, `CONCEPTS.md`,
  `RELEASE_PROCESS.md` et ce guide ;
- ne pas présenter `@owllayer/*`, un export AITP ou la route `/aitp-protocol/`
  comme déjà disponible tant que l'implémentation ou le site correspondant
  n'est pas livré.

Pour le suivi de cette livraison, consulter [l'issue #15](https://github.com/borisbob91/owllayer/issues/15).
