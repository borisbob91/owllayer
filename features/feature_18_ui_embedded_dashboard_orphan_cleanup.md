# Feature 18 — Sprint 2 : Nettoyage du code orphelin et des routes mortes du dashboard embarqué `@domos/ui`

**Statut** : 🟢 Livrée  
**Domaine** : ui  
**Porteur** : @BorisBob  
**Validé par** : @BorisBob  
**Date** : 2026-03-31  
**Sprint** : 1 semaine — 5 jours ouvrés  
**Dépendances** : feature_17_ui_embedded_dashboard_contract_alignment.md

---

## Objectif

Supprimer du dashboard embarqué les reliquats de construction qui ne servent plus au livrable `@domos/ui`, afin que le package reste autonome, lisible et sans pages mortes.

---

## Diagnostic actuel

- `packages/ui/src/dashboard/DashboardPanel.tsx` importe `PromptsPage` mais ne l'utilise pas réellement.
- Le hash `prompts` est aujourd'hui rendu par `AgentsPage`, ce qui montre que `PromptsPage` est déjà sortie du flux principal.
- `packages/ui/src/dashboard/pages/PromptsPage.tsx` est devenu un reliquat de développement, distinct de la vraie page encore active dans le package.
- Garder cette page morte entretient la confusion entre ancienne UI et dashboard embarqué réel.

---

## Périmètre strict

### Ce que ce sprint fait

- Retire les imports et fichiers orphelins liés à `PromptsPage` dans `packages/ui`.
- Conserve une compatibilité minimale de hash `#/prompts` en le servant via la page active `AgentsPage` si nécessaire.
- Nettoie la documentation de features pour refléter la trajectoire réelle du package embarqué.

### Ce que ce sprint ne fait PAS

- Ne modifie pas `apps/dashboard`.
- Ne remplace pas `AgentsPage` par une nouvelle UX.
- Ne change pas le protocole admin du serveur.
- Ne rajoute pas de nouvelles pages au dashboard embarqué.

---

## Règles de design

- Une page non navigable et sans responsabilité produit ne doit pas rester dans `packages/ui`.
- La compatibilité éventuelle de route ne justifie pas de garder une page source morte.
- Le dashboard embarqué doit rester un livrable autonome, pas un historique de copies d'écran de la démo.

---

## Fichiers ciblés

| Fichier | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `packages/ui/src/dashboard/DashboardPanel.tsx` | Importe `PromptsPage` alors que la route active utilise déjà `AgentsPage` | Ne garde que les pages réellement actives | Supprimer l'import orphelin |
| `packages/ui/src/dashboard/pages/PromptsPage.tsx` | Fichier source non utilisé par le dashboard embarqué | Supprimé | Nettoyer le code mort du package |
| `features/README.md` | N'indexe pas encore les sprints de clean du dashboard embarqué | Référence les features 17 et 18 | Garder la roadmap à jour |

---

## Gate de fin de sprint

- `PromptsPage.tsx` n'existe plus dans `packages/ui` si elle n'a plus de point d'entrée réel.
- `DashboardPanel.tsx` ne garde plus d'import orphelin lié à cette page.
- `pnpm --filter @domos/ui build` passe.
- `pnpm --filter @domos/server build` passe après rebuild de `@domos/ui`.

---

## Plan journalier

### Jour 1

- Vérifier tous les points d'entrée réels du dashboard embarqué.
- Confirmer que `PromptsPage` n'a plus de rôle produit dans `packages/ui`.

### Jour 2

- Supprimer l'import orphelin de `DashboardPanel.tsx`.
- Décider et documenter le comportement de compatibilité du hash `#/prompts`.

### Jour 3

- Supprimer `packages/ui/src/dashboard/pages/PromptsPage.tsx`.
- Vérifier qu'aucun autre fichier source du package ne le référence encore.

### Jour 4

- Builder `@domos/ui`.
- Builder `@domos/server` pour valider le bundle embarqué servi par le serveur.
- Corriger les erreurs de build si nécessaire.

### Jour 5

- Relire le package `ui` pour confirmer qu'aucune dépendance conceptuelle à `apps/dashboard` n'a été introduite.
- Mettre à jour l'index des features.
- Commit de clôture si la gate est verte.
