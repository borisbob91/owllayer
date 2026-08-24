# Issue GitHub #14 : Migration de OwlLayer vers OwlLayer AI

**Issue GitHub** : https://github.com/borisbob91/owllayer/issues/14
**Statut** : Planifié
**Priorité** : Majeure
**Domaine** : Marque, documentation, protocole, packages et publication
**Porteur** : Équipe OwlLayer AI
**Date** : 2026-08-11

**Procédure de publication** : [`docs/RELEASING.md`](../docs/RELEASING.md)

## Résumé

Le nouveau nom public du produit est **OwlLayer AI**. Il se présente comme un **Agentic UI SDK** pour les intégrations développeur et comme **OwlLayer AI Runtime** lorsqu'il est question de la couche d'exécution.

La migration ne sera pas un remplacement global. Elle est découpée en une
issue documentation prioritaire, une epic de consolidation audio, puis une
issue indépendante pour chacun des 12 packages publics conservés.

## Nomenclature canonique

| Élément | Nouveau nom | Règle |
|---|---|---|
| Marque publique | `OwlLayer AI` | Ne pas employer `OwlLayer` seul dans le texte produit |
| Catégorie développeur | `Agentic UI SDK` | SDK et intégrations de frameworks |
| Couche d'exécution | `OwlLayer AI Runtime` | Runtime partagé et serveur |
| Scope npm | `@owllayer` | Identifiant technique sans suffixe |
| Slug technique | `owllayer` | Dépôt, domaine et URLs techniques |
| Protocole | `AITP` | Agent-to-Interface Transfer Protocol |

## Renommage du protocole

ADTP signifie actuellement **Agent-to-DOM Transfer Protocol**. Le mot DOM ne couvre pas correctement les applications mobiles, natives, vocales ou sans page web.

Le nouveau nom de travail est **AITP — Agent-to-Interface Transfer Protocol**. Ce changement porte sur la terminologie, les fichiers et les exports publics. Il ne change pas :

- les types et le sens des messages ;
- l'ordre des échanges ;
- les transports WebSocket ou WebRTC ;
- les règles HITL et de sécurité ;
- les garanties d'exécution des tools ;
- le comportement du handshake ;
- la compatibilité du wire protocol.

Les exports et identifiants ADTP existants restent disponibles comme alias pendant la période de compatibilité. `AITP_VERSION` devient le nom principal ; `ADTP_VERSION` reste temporairement un alias vers la même version de protocole.

## Lots de livraison

### Priorité 0 — Documentation

- [ ] [#15 — Nomenclature OwlLayer AI et guide AITP](https://github.com/borisbob91/owllayer/issues/15)

### Fondations

- [ ] [#16 — Core et compatibilité AITP](https://github.com/borisbob91/owllayer/issues/16)
- [ ] [#30 — Consolidation audio dans Core Media](https://github.com/borisbob91/owllayer/issues/30)

### Runtime partagé et navigateur

- [ ] [#18 — UI Runtime](https://github.com/borisbob91/owllayer/issues/18)
- [ ] [#19 — Browser SDK](https://github.com/borisbob91/owllayer/issues/19)

### Adapters modèles, voix et realtime

- [ ] [#20 — OpenAI](https://github.com/borisbob91/owllayer/issues/20)
- [ ] [#21 — Google](https://github.com/borisbob91/owllayer/issues/21)
- [ ] [#22 — Anthropic](https://github.com/borisbob91/owllayer/issues/22)
- [ ] [#23 — LiveKit](https://github.com/borisbob91/owllayer/issues/23)

### SDK frameworks et serveur

- [ ] [#24 — React](https://github.com/borisbob91/owllayer/issues/24)
- [ ] [#25 — Vue](https://github.com/borisbob91/owllayer/issues/25)
- [ ] [#26 — Svelte](https://github.com/borisbob91/owllayer/issues/26)
- [ ] [#27 — Angular](https://github.com/borisbob91/owllayer/issues/27)
- [ ] [#28 — Server Runtime](https://github.com/borisbob91/owllayer/issues/28)

## Matrice des packages publics

| Package actuel | Package OwlLayer AI | Issue |
|---|---|---:|
| `@owllayer/core` | `@owllayer/core` | #16 |
| `@owllayer/ui` | `@owllayer/ui` | #18 |
| `@owllayer/browser` | `@owllayer/browser` | #19 |
| `@owllayer/adapter-openai` | `@owllayer/adapter-openai` | #20 |
| `@owllayer/adapter-google` | `@owllayer/adapter-google` | #21 |
| `@owllayer/adapter-anthropic` | `@owllayer/adapter-anthropic` | #22 |
| `@owllayer/adapter-livekit` | `@owllayer/adapter-livekit` | #23 |
| `@owllayer/react` | `@owllayer/react` | #24 |
| `@owllayer/vue` | `@owllayer/vue` | #25 |
| `@owllayer/svelte` | `@owllayer/svelte` | #26 |
| `@owllayer/angular` | `@owllayer/angular` | #27 |
| `@owllayer/server` | `@owllayer/server` | #28 |

`@owllayer/audio` n'est pas renommé ni publié sous le scope OwlLayer AI. Ses
utilitaires maintenus sont consolidés sous `@owllayer/core/media/audio` par
l'epic #30, puis le package autonome est retiré. `shopify` et `woocommerce`
restent privés et hors publication npm. Leur éventuel renommage interne fera
l'objet d'issues séparées après la cohorte publique.

## Règles de compatibilité

- Une issue package ne modifie qu'un package et les métadonnées partagées strictement nécessaires.
- La documentation définit les noms avant leur introduction dans le code.
- Un ancien export public n'est pas supprimé dans la release qui introduit son remplaçant.
- Les données persistantes suivent une stratégie lecture ancien + écriture nouveau + migration testée.
- AITP conserve le comportement du protocole actuel.
- Chaque PR fonctionnelle contient tests, inspection du tarball et Changeset.
- Seuls les 12 packages publics conservés sous `packages/` peuvent être publiés.

## Hygiène des informations publiques

Les issues publiques contiennent uniquement le contexte produit, le périmètre, les dépendances, les décisions, les critères d'acceptation et les preuves de validation utiles.

Ne jamais y copier :

- une identité ou une sortie d'authentification locale ;
- un token, cookie, secret, identifiant de session ou code 2FA ;
- un chemin personnel de poste de travail ;
- une URL privée ou un détail d'infrastructure non nécessaire ;
- le résultat brut d'une commande contenant des informations de compte.

## Validation finale

- [ ] La documentation OwlLayer AI et AITP est fusionnée avant le code.
- [ ] Chaque issue package est livrée dans l'ordre de ses dépendances.
- [ ] Les alias historiques ont des tests de non-régression.
- [ ] Les 12 tarballs ne contiennent aucune référence `workspace:*`.
- [ ] Les installations ESM et types fonctionnent hors monorepo.
- [ ] Trusted Publishing et la provenance sont vérifiés pour chaque package.
- [ ] Aucun historique Git ou changelog publié n'est réécrit.

## Hors scope

- Modifier le fonctionnement du protocole pendant son renommage.
- Publier les applications, plugins, docs ou packages privés.
- Retirer immédiatement tous les alias OwlLayer ou ADTP.
- Regrouper les 12 packages dans une seule PR de renommage.
