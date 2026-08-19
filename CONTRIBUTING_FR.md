# Guide de contribution — OwlLayer AI Monorepo

> **Version** : 1.0 — Mars 2026  
> **Porteurs de projet** : Équipe OwlLayer AI
> Ce document fait autorité sur toute autre convention implicite observée dans le code.

---

## 1. Principes fondamentaux

### 1.1 Primauté de la stabilité sur la perfection

Le codebase OwlLayer AI est utilisé en production par des clients réels. **La stabilité prime sur l'élégance.** Toute modification doit avoir un bénéfice clairement articulé, visible et mesurable.

### 1.2 Propriété de feature

Chaque package et chaque feature a un **porteur principal** (owner). Aucune modification d'une feature appartenant à un autre contributeur n'est acceptée sans l'accord explicite de son porteur — peu importe la qualité technique de la modification.

### 1.3 Nomenclature publique et compatibilité

- Utiliser **OwlLayer AI** comme nom public du produit. Ne pas employer « OwlLayer » seul dans la prose produit.
- Utiliser **Agentic UI SDK** pour les intégrations développeur et les SDK de framework.
- Utiliser **OwlLayer AI Runtime** pour la couche d'exécution partagée et le serveur.
- Utiliser **AITP** pour *Agent-to-Interface Transfer Protocol*.
- Conserver les exemples et identifiants runtime actuels : imports `@owllayer/*`, classes `OwlLayer*`, chemins WebSocket existants et noms d'API présents dans ce checkout.

---

## 2. Ce qui est CATÉGORIQUEMENT INTERDIT

Les pull requests suivantes sont refusées automatiquement, sans discussion :

| Action interdite | Exemples concrets |
|---|---|
| **Renommage de variable, fonction, classe, type, interface** | `handleHangUp` → `closeWidget`, `cfg` → `config` |
| **Refactoring non explicitement demandé** | Extraire une fonction utilitaire, réorganiser des imports, découper un composant |
| **Modification de commentaires existants** | Clarifier, reformuler, traduire des commentaires que vous n'avez pas écrits |
| **Reformatage de code non modifié** | Indentation, virgules, quotes, ordre des propriétés |
| **Ajout de dépendances sans issue validée** | Installer un nouveau package npm non discuté |
| **Suppression de code sans issue validée** | Supprimer du code "mort" apparemment inutilisé |
| **Modification de fichiers hors de votre domaine** | Voir Section 4 — Domaines de responsabilité |

> **Pourquoi ?** Le renommage casse les recherches historiques dans git blame, les références dans la documentation, et les habitudes des autres contributeurs. Le refactoring non demandé introduit des régressions silencieuses. Le code "mort" peut être intentionnellement conservé pour des raisons de compatibilité ou de débogage.

---

## 3. Workflow obligatoire avant toute modification

### 3.1 GitHub Issues est la source de vérité

Toute tâche non triviale commence par une GitHub Issue. Les GitHub Issues sont la source publique de vérité pour le statut, le périmètre, le responsable, les échanges, les décisions, les critères d'acceptation et la clôture. La roadmap publique, les epics de domaine et les issues d'implémentation ciblées sont suivis sur GitHub. Les plans détaillés et les sprints privés restent locaux ; les documents locaux dans `issues/` et `features/` sont des analyses techniques complémentaires et ne remplacent pas l'issue GitHub.

Une issue publique contient uniquement le contexte produit, le périmètre, les dépendances, les décisions, les critères d'acceptation et les preuves de validation utiles. Ne jamais y publier d'identifiants, de sortie d'authentification, de tokens, de données de session, de chemins personnels, d'URLs privées, de recettes ou détails opérationnels privés, ni de détails de compte non nécessaires. Utiliser un rôle ou un libellé neutre quand l'identité n'est pas indispensable à l'assignation ou à la revue.

La hiérarchie publique doit rester distincte : `roadmap publique → epic de domaine → issue d'implémentation ciblée → une branche et une PR par issue`. Utiliser les sous-issues GitHub pour décomposer un epic. Chaque sous-issue doit préciser ses dépendances, son périmètre et son hors scope, ses critères d'acceptation, sa validation attendue et sa condition de fermeture. Chaque issue d'implémentation dispose d'une seule branche et d'une seule PR ; cette PR peut contenir plusieurs commits cohérents tant qu'ils restent dans le périmètre de l'issue.

1. Rechercher d'abord dans les issues ouvertes et fermées pour éviter les doublons.
2. Utiliser le template bug ou feature et limiter chaque issue à un résultat concret.
3. Décrire le contexte, le périmètre, le hors scope, les packages affectés, les critères d'acceptation et la validation attendue.
4. Faire valider le périmètre par le porteur du domaine avant une modification cassante ou transverse.
5. Ne jamais publier une vulnérabilité dans une issue publique ; suivre `SECURITY.md`.

### 3.2 Branche, commits et pull request

- Créer une seule branche par issue d'implémentation et la nommer `issue-<numéro>-<description-courte>`.
- Référencer `#<numéro>` dans les commits et relier la PR à l'issue d'implémentation.
- Utiliser `Closes #<numéro>` uniquement si la PR réalise entièrement l'issue d'implémentation et que tous ses critères d'acceptation, de validation et de fermeture sont satisfaits. Utiliser `Refs #<numéro>` pour l'epic parent ou pour un travail partiel.
- Une PR peut contenir plusieurs commits cohérents, mais reste dédiée à une seule issue d'implémentation.
- Implémenter uniquement le périmètre accepté dans l'issue.

Commandes GitHub CLI recommandées :

```bash
gh issue list --state all
gh issue view <numéro-issue>
gh issue create --template bug_report.yml
gh issue create --template feature_request.yml
gh issue develop <numéro-issue> --name issue-<numéro-issue>-<description-courte> --checkout
gh pr create --web
```

### 3.3 Canvas technique local

Pour un travail complexe, créer `issues/issue_<numéro-github>_<nom_court>.md` avec le template de la Section 6, puis ajouter des liens dans les deux sens entre ce canvas et l'issue GitHub. Une feature détaillée peut utiliser `features/feature_<numéro-github>_<nom_court>.md` selon la Section 7. Les anciens numéros locaux restent historiques et ne doivent pas être renumérotés.

### 3.4 Règle des fichiers touchés

Chaque issue ou feature doit lister **explicitement** les fichiers qui seront modifiés. Tout fichier modifié en PR qui n'est pas dans la liste du document est un motif de refus immédiat.

### 3.5 Versions et changelogs des packages publics

Une modification fonctionnelle d'un package public `@owllayer/*` doit inclure un Changeset. Les changements de documentation seule, de tests seuls et d'infrastructure de release n'en demandent pas.

```bash
pnpm changeset
```

Les versions sont indépendantes. La CI contrôle que chaque package public modifié apparaît dans un Changeset ; la PR de version générée met ensuite à jour les versions, dépendances internes et `CHANGELOG.md` des packages concernés. Voir [docs/RELEASING.md](docs/RELEASING.md).

---

## 4. Domaines de responsabilité

Un contributeur travaille sur **un seul domaine à la fois**. Il n'est pas possible de soumettre une PR qui touche simultanément plusieurs domaines sans accord préalable du porteur de projet.

### Domaines définis

| Domaine | Packages concernés | Description |
|---|---|---|
| **core** | `packages/core` | Protocole AITP, VoiceStateMachine, types partagés, CSS widget |
| **server** | `packages/server`, `packages/adapter-*` | WebSocket serveur, LLM adapters, HITL, sessions |
| **react** | `packages/react`, `apps/demo` | SDK React, hooks, composants widget React, démo React |
| **ui** | `packages/ui` | Runtime partagé cross-framework, dashboard et devtools embarqués |
| **vue** | `packages/vue`, `apps/demo-vue` | SDK Vue, composables, widget Vue, démo Vue |
| **svelte** | `packages/svelte`, `apps/demo-svelte` | SDK Svelte, widget Svelte, démo Svelte |
| **browser** | `packages/browser`, `apps/demo-browser` | SDK vanilla JS/Preact, widget browser natif |
| **angular** | `packages/angular`, `apps/demo-angular` | Domaine SDK Angular distinct, périmètre futur |
| **shopify** | `packages/shopify`, `plugin_shopify` | Plugin Shopify, widget Liquid |
| **woocommerce** | `packages/woocommerce` | Plugin WooCommerce |
| **infra** | `turbo.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, CI | Outillage build, CI/CD |

`ui` reste un runtime partagé ; `angular` est un domaine SDK distinct et ne doit pas être absorbé par `ui`.

### Règle de chevauchement

Si une feature touche `packages/core` **et** un SDK (ex: React), deux contributeurs différents doivent intervenir séquentiellement : d'abord le contributeur **core** pour les types/protocole, puis le contributeur **react** pour l'intégration. Les deux issues/features doivent être documentées séparément.

---

## 5. Règles de code

### 5.1 Éviter le code mort

- Ne pas laisser de fonctions non appelées, d'imports inutilisés, de variables déclarées et jamais lues.
- L'outil `tsc --noUnusedLocals` est activé sur tous les packages — si ça compile, c'est bon.
- Exception : code commenté conservé intentionnellement → ajouter un commentaire `// KEEP: raison`

### 5.2 Analyser le spectre d'action avant de coder

Avant d'ajouter une fonction ou un composant, répondre à ces questions :
1. **Cette fonctionnalité existe-t-elle déjà ailleurs dans le projet ?** (chercher avant de créer)
2. **Quel est l'impact sur les autres packages ?** (ex: modifier `core` impacte React + Vue + Svelte + Browser)
3. **Est-ce que ça casse la compatibilité des APIs publiques ?** (vérifier `index.ts` du package)
4. **Y a-t-il des tests existants qui vont rompre ?** (lancer `pnpm test` avant de proposer)

### 5.3 Pas d'abstraction prématurée

- Ne pas créer un helper ou une utilité pour un usage unique.
- Ne pas concevoir des interfaces pour des "besoins futurs hypothétiques".
- La bonne quantité de complexité = le strict minimum pour la tâche actuelle.

### 5.4 Gestion des erreurs

- Valider uniquement aux frontières du système (input utilisateur, API externe, WebSocket).
- Ne pas entourer du code interne de try/catch défensifs inutiles.
- Les erreurs internes doivent remonter, pas être silencieusement avalées.

### 5.5 Commentaires

- Ne pas ajouter de commentaires sur du code évident.
- Ne pas modifier les commentaires existants (voir Section 2).
- Ajouter un commentaire uniquement si la logique n'est pas auto-explicative.

---

## 6. Canvas Issue (bug / problème)

Fichier à créer : `issues/issue_XX_nom_court.md`

```markdown
# Issue GitHub #XX : [Titre court du problème]

**Issue GitHub** : https://github.com/borisbob91/owllayer/issues/XX

**Statut** : 🔴 Ouvert | 🟡 En cours | 🟢 Résolu  
**Priorité** : 🔴 Bloquant | 🟡 Majeur | 🟢 Mineur  
**Domaine** : [core | server | react | ui | vue | svelte | browser | angular | shopify | woocommerce]  
**Porteur** : @nom-du-contributeur  
**Date** : YYYY-MM-DD  

---

## Résumé

[1-3 phrases décrivant le problème et son impact utilisateur]

---

## Dépendances et blocages

[Issues GitHub liées, prérequis, blocages ou `Aucune`]

---

## Périmètre

### Inclus

[Ce que cette correction couvre]

### Hors scope

[Ce que cette correction ne couvre pas]

---

## Reproduction

### Conditions
- Version affectée : 
- Environnement :
- Configuration :

### Scénario pas-à-pas

1. ...
2. ...
3. → Bug observé : ...

---

## Analyse technique

### Cause racine

[Localiser précisément le code fautif avec chemin de fichier et numéros de ligne]

```
Fichier : packages/xxx/src/yyy.ts
Ligne   : 42
Code    : [extrait exact du code problématique]
```

### Pourquoi c'est un bug (et pas un comportement attendu)

[Explication technique]

---

## Solution

### Approche retenue

[Description de la correction — pas de code, juste la logique]

### Fichiers qui seront modifiés

| Fichier | Type de modification | Risque |
|---|---|---|
| `packages/xxx/src/yyy.ts` | Correction logique ligne 42 | Faible |
| `packages/xxx/src/zzz.ts` | Mise à jour du type associé | Faible |

> ⚠️ Tout fichier modifié en PR qui ne figure pas dans ce tableau est un motif de refus.

### Ce qui NE sera PAS modifié

[Liste des fichiers adjacents qui pourraient sembler liés mais qui ne seront pas touchés]

---

## Tests

- [ ] Test unitaire couvrant le bug
- [ ] Test d'intégration si applicable
- [ ] `pnpm build` passe sur les packages affectés
- [ ] `pnpm test` ne régresse pas

---

## Critères d'acceptation

- [ ] ...

## Validation attendue

- [ ] ...

## Condition de fermeture

[Décrire les conditions vérifiables qui autorisent la clôture de l'issue]
```

---

## 7. Canvas Feature (nouvelle fonctionnalité)

Fichier à créer : `features/feature_XX_nom_court.md`

```markdown
# Feature liée à l'issue GitHub #XX : [Titre de la feature]

**Issue GitHub** : https://github.com/borisbob91/owllayer/issues/XX

**Statut** : 🔵 Proposition | 🟡 Validée | 🟢 Livrée  
**Domaine** : [core | server | react | ui | vue | svelte | browser | angular | shopify | woocommerce]  
**Porteur** : @nom-du-contributeur  
**Validé par** : @porteur-du-projet  
**Date** : YYYY-MM-DD  

---

## Besoin

[Décrire en termes utilisateur / développeur quel problème cette feature résout]

### User story

> En tant que [rôle], je veux [action], afin de [bénéfice].

---

## Périmètre strict

### Ce que cette feature fait

- ...
- ...

### Ce que cette feature ne fait PAS (hors scope)

- ...
- ...

> ⚠️ Toute fonctionnalité hors de ce périmètre requiert une nouvelle feature.

---

## Analyse d'impact

### Fonctionnalités existantes pouvant être affectées

| Fonctionnalité | Impact | Mitigation |
|---|---|---|
| `useAgentTool` | Aucun | — |
| `generateWidgetStyles` | API étendue (paramètre optionnel) | Valeur par défaut maintenue |

### Packages touchés

| Package | Modification | Rétro-compatibilité |
|---|---|---|
| `@owllayer/core` | Ajout type `X` dans `widget.types.ts` | ✅ Oui |
| `@owllayer/react` | Import + usage du nouveau type | ✅ Oui |

### Fichiers qui seront modifiés

| Fichier | Nature de la modification |
|---|---|
| `packages/core/src/widget/widget.types.ts` | Ajout interface `WidgetXConfig` |
| `packages/react/src/components/widget/WidgetInner.tsx` | Consommation du nouveau type |

> ⚠️ Tout fichier modifié en PR qui ne figure pas dans ce tableau est un motif de refus.

### Fichiers qui ne seront PAS modifiés

[Lister les fichiers adjacents que l'on pourrait avoir envie de "nettoyer" — mais qui sont hors scope]

---

## Implémentation

### Étapes séquentielles

1. **Étape 1** — [Description] — Fichier(s) : `xxx`
2. **Étape 2** — [Description] — Fichier(s) : `yyy`
3. **Étape 3** — Build + tests

### API publique (si applicable)

```typescript
// Avant
function foo(a: string): void

// Après
function foo(a: string, b?: number): void  // b optionnel — rétro-compatible
```

---

## Tests

- [ ] Tests unitaires pour la nouvelle logique
- [ ] `pnpm build` passe sur tous les packages affectés
- [ ] `pnpm test` ne régresse pas
- [ ] Testé manuellement dans la démo correspondante (`apps/demo-xxx`)

---

## Critères d'acceptation

- [ ] ...
- [ ] ...
- [ ] La PR référence ce document : `feat: ... (ref feature_XX)`
```

---

## 8. Structure des dossiers issues/features

```
owllayer/
├── issues/
│   ├── README.md               ← Index des issues
│   ├── issue_01_xxx.md
│   ├── issue_02_xxx.md
│   └── ...
├── features/
│   ├── README.md               ← Index des features
│   ├── feature_01_xxx.md
│   ├── feature_02_xxx.md
│   └── ...
└── CONTRIBUTING.md             ← Ce fichier
```

---

## 9. Definition of Done — Critères de Terminaison

Une fonctionnalité (feature, bug fix, refactoring validé) n'est **pas terminée** tant que la documentation n'est pas mise à jour.

**La documentation n'est pas optionnelle.** C'est un critère d'acceptation au même titre que le code lui-même.

### Catégories de documentation

| Catégorie | Qui met à jour | Exemples |
|---|---|---|
| **Docstring API** | Développeur | JSDoc sur les exports publics, descriptions Zod |
| **README.md** | Développeur | Section package, tableau features, exemples |
| **CHANGELOG.md** | Développeur | Entry de la version, type (feat/fix/breaking) |
| **Guides d'intégration** | Développeur | `docs/xxx/getting-started.md`, tutoriels |
| **Architecture docs** | Porteur de projet | `docs/ARCHITECTURE.md`, diagrammes |
| **Admin guide** | Porteur de projet | Monitoring, scalabilité, opérations |

### Checklist PR

**À valider avant de soumettre :**

```
[ ] Une issue GitHub existe et est référencée dans la PR ; utiliser `Closes #XX` uniquement pour une issue d'implémentation entièrement réalisée, et `Refs #XX` pour un epic parent ou un travail partiel
[ ] Un canvas `issue_XX` ou `feature_XX` existe pour les travaux complexes
[ ] Lorsqu'un canvas est requis, il contient les dépendances et blocages, le périmètre avec son hors scope, les critères d'acceptation, la validation attendue et la condition de fermeture
[ ] Tous les fichiers modifiés sont listés dans ce document
[ ] Aucun fichier hors domaine du contributeur n'est touché
[ ] Aucun renommage de variable/fonction/classe/type
[ ] Aucun refactoring non demandé
[ ] Aucun commentaire existant modifié
[ ] pnpm build passe sur les packages affectés
[ ] pnpm test ne régresse pas
[ ] Aucune nouvelle dépendance ajoutée sans validation préalable

📚 DOCUMENTATION REQUISE :

[ ] Docstrings/JSDoc mises à jour pour toute API publique
[ ] README.md du package complété (section features, exemples)
[ ] CHANGELOG.md de la version maintenu à jour (feat/fix/breaking)
[ ] Guide d'intégration mis à jour si nouvelles primitives exposées
[ ] Exemples de code intégrés dans la démo correspondante
[ ] Liens internes cohérents (pas de doc orpheline)

✅ VALIDATION FINALE :

[ ] Tests passent (`pnpm test`)
[ ] Code review approuvée
[ ] Documentation revue (lisibilité, clarté, exemples valides)
[ ] CHANGELOG formaté correctement
```

### Raisons pour lesquelles une PR peut être refusée

1. **Tests échouent** → À fixer par le contributeur
2. **Code review échoue** → Revoir les commentaires, refactoriser
3. **Documentation absente ou incohérente** → Ajouter/compléter avant merge
4. **CHANGELOG non mis à jour** → Ajouter une entry
5. **Exemples dans la démo ne fonctionnent pas** → Valider manuellement
6. **Docstrings manquantes sur API publique** → Ajouter les JSDoc

**La PR n'est fusionnée que si ces 6 critères sont tous verts.** Pas d'exception.

### Exemple : Feature validée et fusionnée

```
📝 issue_42_barge_in_detection.md écrit et approuvé
🔨 Code implémenté dans OwlLayerVoiceService
✅ Tests écrits et passants
📖 README.md mise à jour (section "Barge-in Detection")
📝 CHANGELOG.md entry ajoutée : "feat: Add barge-in detection to voice service"
🎓 Docstring JSDoc complète sur `detectBargein()`
💡 Exemple de code dans `apps/demo/src/components/VoiceExample.tsx`
🔗 Liens internes cohérents (aucun lien mort)
✔️ Code review approuvée
✔️ Doc review approuvée
✔️ Build passe
✔️ Tests passent
✔️ Fusionné dans main
```

---

## 10. Rôles des contributeurs IA

Les assistants IA (GitHub Copilot, Claude, GPT, etc.) sont des **outils**, pas des décideurs. Règles spécifiques :

- Un assistant IA ne peut modifier que les fichiers explicitement listés dans la demande ou dans le document issue/feature actif.
- Un assistant IA ne doit jamais initier un refactoring, un renommage ou une "amélioration" sans demande explicite.
- Si un assistant IA détecte du code améliorable hors scope, il **le signale en commentaire uniquement** — il ne le modifie pas.
- Les fausses alertes (warnings sur du code fonctionnel, propositions de "clean up") doivent être ignorées.
- Toute modification produite par un assistant IA suit les mêmes règles que pour un contributeur humain.
- **Les assistants IA sont responsables de la documentation autant que du code** — aucune PR ne sera fusionnée sans doc à jour.
