# Guide de contribution — DomOS Monorepo

> **Version** : 1.0 — Mars 2026  
> **Porteurs de projet** : Équipe DomOS Core  
> Ce document fait autorité sur toute autre convention implicite observée dans le code.

---

## 1. Principes fondamentaux

### 1.1 Primauté de la stabilité sur la perfection

Le codebase DomOS est utilisé en production par des clients réels. **La stabilité prime sur l'élégance.** Toute modification doit avoir un bénéfice clairement articulé, visible et mesurable.

### 1.2 Propriété de feature

Chaque package et chaque feature a un **porteur principal** (owner). Aucune modification d'une feature appartenant à un autre contributeur n'est acceptée sans l'accord explicite de son porteur — peu importe la qualité technique de la modification.

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

### 3.1 Pour un bug fix

```
1. Créer issues/issue_XX_nom_du_bug.md  (template Section 6)
2. Faire valider l'analyse par le porteur du package concerné
3. Implémenter uniquement ce qui est décrit dans l'issue
4. PR avec référence à l'issue : "fix: ... (closes issue_XX)"
```

### 3.2 Pour une nouvelle feature

```
1. Créer features/feature_XX_nom_de_la_feature.md  (template Section 7)
2. Faire valider le périmètre et l'impact par le porteur du projet
3. Implémenter uniquement ce qui est décrit dans le document feature
4. PR avec référence au document : "feat: ... (ref feature_XX)"
```

### 3.3 Règle des fichiers touchés

Chaque issue ou feature doit lister **explicitement** les fichiers qui seront modifiés. Tout fichier modifié en PR qui n'est pas dans la liste du document est un motif de refus immédiat.

---

## 4. Domaines de responsabilité

Un contributeur travaille sur **un seul domaine à la fois**. Il n'est pas possible de soumettre une PR qui touche simultanément plusieurs domaines sans accord préalable du porteur de projet.

### Domaines définis

| Domaine | Packages concernés | Description |
|---|---|---|
| **core** | `packages/core` | Protocole ADTP, VoiceStateMachine, types partagés, CSS widget |
| **server** | `packages/server`, `packages/adapter-*` | WebSocket serveur, LLM adapters, HITL, sessions |
| **react** | `packages/react`, `apps/demo` | SDK React, hooks, composants widget React, démo React |
| **vue** | `packages/vue`, `apps/demo-vue` | SDK Vue, composables, widget Vue, démo Vue |
| **svelte** | `packages/svelte`, `apps/demo-svelte` | SDK Svelte, widget Svelte, démo Svelte |
| **browser** | `packages/browser`, `apps/demo-browser` | SDK vanilla JS/Preact, widget browser natif |
| **shopify** | `packages/shopify`, `plugin_shopify` | Plugin Shopify, widget Liquid |
| **woocommerce** | `packages/woocommerce` | Plugin WooCommerce |
| **infra** | `turbo.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, CI | Outillage build, CI/CD |

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
# Issue #XX : [Titre court du problème]

**Statut** : 🔴 Ouvert | 🟡 En cours | 🟢 Résolu  
**Priorité** : 🔴 Bloquant | 🟡 Majeur | 🟢 Mineur  
**Domaine** : [core | server | react | vue | svelte | browser | shopify | woocommerce]  
**Porteur** : @nom-du-contributeur  
**Date** : YYYY-MM-DD  

---

## Résumé

[1-3 phrases décrivant le problème et son impact utilisateur]

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
```

---

## 7. Canvas Feature (nouvelle fonctionnalité)

Fichier à créer : `features/feature_XX_nom_court.md`

```markdown
# Feature #XX : [Titre de la feature]

**Statut** : 🔵 Proposition | 🟡 Validée | 🟢 Livrée  
**Domaine** : [core | server | react | vue | svelte | browser | shopify | woocommerce]  
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
| `@domos/core` | Ajout type `X` dans `widget.types.ts` | ✅ Oui |
| `@domos/react` | Import + usage du nouveau type | ✅ Oui |

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
domos/
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

## 9. Checklist PR

Avant de soumettre une Pull Request :

```
[ ] Un document issue_XX ou feature_XX existe et est référencé dans le titre de la PR
[ ] Tous les fichiers modifiés sont listés dans ce document
[ ] Aucun fichier hors domaine du contributeur n'est touché
[ ] Aucun renommage de variable/fonction/classe/type
[ ] Aucun refactoring non demandé
[ ] Aucun commentaire existant modifié
[ ] pnpm build passe sur les packages affectés
[ ] pnpm test ne régresse pas
[ ] Aucune nouvelle dépendance ajoutée sans validation préalable
```

---

## 10. Rôles des contributeurs IA

Les assistants IA (GitHub Copilot, Claude, GPT, etc.) sont des **outils**, pas des décideurs. Règles spécifiques :

- Un assistant IA ne peut modifier que les fichiers explicitement listés dans la demande ou dans le document issue/feature actif.
- Un assistant IA ne doit jamais initier un refactoring, un renommage ou une "amélioration" sans demande explicite.
- Si un assistant IA détecte du code améliorable hors scope, il **le signale en commentaire uniquement** — il ne le modifie pas.
- Les fausses alertes (warnings sur du code fonctionnel, propositions de "clean up") doivent être ignorées.
- Toute modification produite par un assistant IA suit les mêmes règles que pour un contributeur humain.
