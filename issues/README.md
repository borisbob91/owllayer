# OwlLayer AI Issues & Solutions

Les [GitHub Issues](https://github.com/borisbob91/domos/issues) sont la source publique de vérité pour le statut, le périmètre, le responsable, les discussions, les décisions, l'acceptation et la clôture du travail. La roadmap publique, les epics de domaine et les issues d'implémentation ciblées sont suivis sur GitHub ; les plans détaillés et les sprints privés restent locaux.

Ce dossier contient uniquement les **canvas techniques locaux** nécessaires aux problèmes complexes : analyse, risques, fichiers prévus et stratégie de validation. Un canvas complète l'issue GitHub correspondante ; il ne la remplace pas.

## 🔐 Hygiène des issues publiques

Une issue publique décrit le produit et le travail à réaliser. Elle ne doit jamais contenir d'identifiants, de sortie d'authentification, de tokens, de cookies ou données de session, de chemins personnels de poste de travail, d'URLs privées, de recettes ou détails opérationnels privés, ni de détail de compte sans nécessité de gouvernance. Les preuves de validation doivent être reformulées et expurgées avant publication.

## 🧭 Hiérarchie publique et sous-issues

La hiérarchie publique est distincte : `roadmap publique → epic de domaine → issue d'implémentation ciblée → une branche et une PR par issue`. Utiliser les sous-issues GitHub pour décomposer un epic. Chaque sous-issue doit préciser ses dépendances, son périmètre et son hors scope, ses critères d'acceptation, sa validation attendue et sa condition de fermeture.

Chaque issue d'implémentation dispose d'une seule branche et d'une seule PR. Une PR peut contenir plusieurs commits cohérents tant qu'ils restent dans le périmètre de cette issue. Les commits et la PR doivent être reliés à l'issue avec `#<numéro>`.

## 📋 Convention de nommage

```
issue_XX_nom_descriptif.md
```

- **XX** : Numéro de l'issue GitHub correspondante
- **nom_descriptif** : Nom court en snake_case décrivant le problème

Les anciens canvas numérotés avant l'adoption de GitHub Issues restent historiques et ne sont pas renumérotés.

## 🏗️ Structure d'une issue

Chaque document suit ce template :

1. **En-tête** : Lien GitHub, statut, priorité, complexité, composants affectés
2. **Dépendances et blocages** : Issues, prérequis et contraintes de séquencement
3. **Périmètre** : Ce qui est inclus et explicitement hors scope
4. **Description du problème** : Contexte, scénario, impact, fréquence
5. **Analyse technique** : Architecture actuelle, problèmes identifiés
6. **Solution proposée** : Code, types, tests
7. **Plan d'implémentation** : Phases avec estimations
8. **Critères d'acceptation** : Résultats observables attendus
9. **Validation attendue** : Tests, contrôles ou preuves à produire
10. **Condition de fermeture** : Conditions vérifiables avant de clore l'issue
11. **Notes d'implémentation** : Considérations, patterns, références

### Template de canvas local

```markdown
# Issue GitHub #XX : [Titre]

**Issue GitHub** : [Lien public]
**Dépendances et blocages** : [Issues/prérequis ou `Aucune`]

## Périmètre

### Inclus

- ...

### Hors scope

- ...

## Critères d'acceptation

- [ ] ...

## Validation attendue

- [ ] ...

## Condition de fermeture

- ...
```

## 📊 Légende des statuts

| Statut | Description |
|--------|-------------|
| 🔴 **Bloquant** | Empêche l'utilisation en production |
| 🟡 **En cours** | Solution en cours d'implémentation |
| 🟢 **Résolu** | Implémenté et testé |
| 🔵 **À valider** | Solution proposée, en attente de validation |
| ⚪ **Reporté** | Non prioritaire, reporté à une version future |

## 📑 Liste des issues

### Robustesse & DX

- [**#01 - Component Lifecycle Tracking**](./issue_01_component_lifecycle_tracking.md) 🟡
  - Race conditions lors du démontage des composants
  - Tool calls executed après unmount
  - Solution : versioning + grace period + validation

- [**#04 - Gemini Live Voice Architecture**](./issue_04_gemini_live_voice_architecture.md) 🔵
   - Fiabilisation du turn-taking vocal (end-of-turn explicite)
   - Gestion d'interruptions (barge-in) et state machines client/serveur
   - Plan de rollout progressif via feature flag

### Architecture & Tech Debt

- [**Historical #05 - Audio Centralization & Multi-Format Support**](./issue_05_audio_centralization.md) ⚪
  - Code audio dupliqué dans 5+ endroits (Float32→Int16→base64)
  - Ancienne proposition de package autonome, remplacée par
    [GitHub #30](https://github.com/borisbob91/domos/issues/30)
  - Le plan actuel consolide les utilitaires sous `@owllayer/core/media/audio`

### Sécurité

_(À venir)_

### Performance

_(À venir)_

### Documentation

_(À venir)_

## 🎯 Critères de qualité

Chaque issue doit contenir :

- ✅ **Lien GitHub** : Référence vers l'issue canonique
- ✅ **Dépendances et blocages** : Issues liées, prérequis et contraintes de séquencement
- ✅ **Reproduction** : Scénario clair et reproductible
- ✅ **Impact** : Fréquence, gravité, composants affectés
- ✅ **Périmètre** : Résultat attendu, hors scope et fichiers prévus
- ✅ **Solution** : Approche technique suffisamment précise pour être validée
- ✅ **Tests** : Scénarios de test avec assertions
- ✅ **Acceptation** : Critères observables permettant de fermer l'issue
- ✅ **Validation attendue** : Contrôles ou preuves nécessaires avant la fermeture
- ✅ **Condition de fermeture** : État vérifiable autorisant la clôture de l'issue
- ✅ **Références** : Liens vers docs pertinentes

## 🔄 Workflow

```
1. Identifier un problème
   ↓
2. Rechercher les issues GitHub ouvertes et fermées
   ↓
3. Créer une GitHub Issue avec le template adapté
   ↓
4. Pour un sujet complexe, créer issues/issue_<numéro-github>_<nom>.md
   ↓
5. Faire valider le périmètre et créer une branche liée nommée `issue-<numéro>-<description-courte>`
   ↓
6. Implémenter et valider uniquement le périmètre accepté
   ↓
7. Ouvrir une PR dédiée à l'issue avec `Closes #<numéro>` si elle la réalise entièrement, sinon `Refs #<numéro>`
   ↓
8. Fusionner la PR et fermer l'issue lorsque tous les critères sont satisfaits
```

`Closes #<numéro>` est réservé à une PR qui réalise entièrement l'issue d'implémentation ciblée et satisfait ses critères d'acceptation, de validation et de fermeture. Pour l'epic parent ou pour un travail partiel, utiliser `Refs #<numéro>`.

Commandes GitHub CLI utiles :

```bash
gh issue list --state all
gh issue view <issue-number>
gh issue create --template bug_report.yml
gh issue create --template feature_request.yml
gh issue develop <issue-number> --name issue-<issue-number>-<short-description> --checkout
gh pr create --web
```

## 📝 Comment contribuer

1. **Rechercher** si le besoin est déjà suivi.
2. **Créer** une GitHub Issue en suivant le template adapté.
3. **Faire valider** son périmètre et ses critères d'acceptation.
4. **Créer** un canvas local uniquement si l'analyse technique le justifie.
5. **Tester** l'implémentation dans le périmètre convenu.
6. **Soumettre** une PR qui référence l'issue GitHub.

## 🔗 Liens utiles

- [Architecture Backend](../BACKEND-ARCHITECTURE.md)
- [README principal](../README.md)
- [Protocole AITP (nom de fichier historique)](../docs/ADTP_PROTOCOL.md)
- [Guide de contribution](../CONTRIBUTING.md)

---

**Maintenu par** : L'équipe OwlLayer AI
**Dernière mise à jour** : 11 août 2026
