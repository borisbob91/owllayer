# DomOS Issues & Solutions

Ce dossier contient des analyses techniques détaillées des problèmes identifiés dans le framework DomOS, accompagnées de solutions propres et testables.

## 📋 Convention de nommage

```
issue_XX_nom_descriptif.md
```

- **XX** : Numéro séquentiel (01, 02, 03...)
- **nom_descriptif** : Nom court en snake_case décrivant le problème

## 🏗️ Structure d'une issue

Chaque document suit ce template :

1. **En-tête** : Statut, priorité, complexité, composants affectés
2. **Description du problème** : Contexte, scénario, impact, fréquence
3. **Analyse technique** : Architecture actuelle, problèmes identifiés
4. **Solution proposée** : Code, types, tests
5. **Plan d'implémentation** : Phases avec estimations
6. **Notes d'implémentation** : Considérations, patterns, références

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

### Sécurité

_(À venir)_

### Performance

_(À venir)_

### Documentation

_(À venir)_

## 🎯 Critères de qualité

Chaque issue doit contenir :

- ✅ **Reproduction** : Scénario clair et reproductible
- ✅ **Impact** : Fréquence, gravité, composants affectés
- ✅ **Solution** : Code complet, pas juste des idées
- ✅ **Tests** : Scénarios de test avec assertions
- ✅ **Estimations** : Temps d'implémentation réaliste
- ✅ **Références** : Liens vers docs pertinentes

## 🔄 Workflow

```
1. Identifier un problème
   ↓
2. Créer une issue (issue_XX_nom.md)
   ↓
3. Analyser l'architecture existante
   ↓
4. Proposer une solution propre
   ↓
5. Valider avec l'équipe
   ↓
6. Implémenter par phases
   ↓
7. Tester et valider
   ↓
8. Mettre à jour le statut → 🟢
```

## 📝 Comment contribuer

1. **Fork** le projet
2. **Créer** une nouvelle issue en suivant le template
3. **Proposer** une solution basée sur l'architecture existante
4. **Tester** votre solution
5. **Soumettre** une PR avec le document + implémentation

## 🔗 Liens utiles

- [Architecture Backend](../BACKEND-ARCHITECTURE.md)
- [README principal](../README.md)
- [Protocol ADTP](../docs/ADTP_PROTOCOL.md)
- [Guide de contribution](../CONTRIBUTING.md) _(à créer)_

---

**Maintenu par** : L'équipe DomOS  
**Dernière mise à jour** : 12 février 2026
