# Feature 17 — Sprint 1 : Alignement contractuel du dashboard embarqué `@domos/ui`

**Statut** : 🟡 Validée  
**Domaine** : ui  
**Porteur** : @BorisBob  
**Validé par** : @BorisBob  
**Date** : 2026-03-31  
**Sprint** : 1 semaine — 5 jours ouvrés  
**Dépendances** : feature_11_ui_dashboard_embarque.md, feature_13_server_ui_integration.md

---

## Objectif

Rendre le dashboard embarqué de `@domos/ui` autonome et cohérent avec les contrats canoniques du monorepo, sans aucune dépendance fonctionnelle ou conceptuelle à `apps/dashboard`.

Le sprint ne cherche pas à enrichir visuellement le dashboard. Il corrige la base contractuelle pour que le package livrable consomme les bons types et n'écrase pas des données structurées gérées par le serveur.

---

## Diagnostic actuel

- `packages/ui/src/dashboard/api.ts` redéfinit localement `SystemPromptConfig` au lieu d'utiliser le contrat canonique exporté par `@domos/core`.
- La redéfinition locale diverge déjà du contrat canonique et rend le dashboard embarqué vulnérable aux dérives futures.
- `packages/ui/src/dashboard/pages/AgentsPage.tsx` nettoie les prompts avant sauvegarde, mais ne préserve pas toutes les sections structurées possibles d'un prompt.
- Le dashboard embarqué parle bien au serveur via `/admin/*`, mais il ne doit jamais devenir une copie divergente de l'app de démo.

---

## Périmètre strict

### Ce que ce sprint fait

- Reroute le contrat `SystemPromptConfig` du dashboard embarqué vers `@domos/core`.
- Assure que la sauvegarde de configuration dans le dashboard embarqué ne détruit pas les sections structurées existantes.
- Garde le dashboard embarqué autonome vis-à-vis de `apps/dashboard`.

### Ce que ce sprint ne fait PAS

- Ne touche pas `apps/dashboard`.
- Ne crée pas de nouvelles routes serveur.
- Ne change pas le design ou le layout du dashboard.
- Ne refond pas toutes les pages du dashboard embarqué.

---

## Règles de design

- `packages/ui` consomme les contrats partagés depuis `@domos/core`, jamais via une copie locale si le contrat existe déjà.
- Le dashboard embarqué ne doit perdre aucune donnée de prompt structurée lors d'une lecture-modification-écriture.
- Aucun import depuis `apps/` vers `packages/ui` n'est autorisé.
- `apps/dashboard` reste une démo et exemple d'inspiration et non une source de vérité.

---

## Fichiers ciblés

| Fichier | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `packages/ui/src/dashboard/api.ts` | Redéfinit `SystemPromptConfig` localement | Réutilise et ré-exporte le contrat canonique de `@domos/core` | Éviter une dérive de contrat |
| `packages/ui/src/dashboard/pages/AgentsPage.tsx` | Nettoie un prompt sans préserver explicitement toutes les sections structurées | Préserve les sections structurées existantes | Éviter la perte de données |

---

## Gate de fin de sprint

- `packages/ui` ne redéfinit plus `SystemPromptConfig` si `@domos/core` l'exporte déjà.
- La sauvegarde d'un prompt structuré depuis le dashboard embarqué ne supprime pas `sections`.
- `pnpm --filter @domos/ui build` passe.
- `pnpm --filter @domos/server build` passe après rebuild de `@domos/ui`.

---

## Plan journalier

### Jour 1

- Relire `feature_11` et `feature_13` pour confirmer la frontière `package ui` vs `apps/dashboard`.
- Relever toutes les redéfinitions locales de types prompts dans `packages/ui/src/dashboard`.
- Valider le périmètre strict des fichiers à toucher.

### Jour 2

- Basculer `packages/ui/src/dashboard/api.ts` sur les types exportés par `@domos/core`.
- Vérifier la compatibilité des types avec les méthodes `getPrompts` / `setPrompt`.

### Jour 3

- Corriger `AgentsPage.tsx` pour préserver `sections` lors du nettoyage avant sauvegarde.
- Vérifier les cas `prompt` string et `prompt` structuré.

### Jour 4

- Builder `@domos/ui`.
- Builder `@domos/server` pour valider le branchement du dashboard embarqué servi par le serveur.
- Corriger les erreurs de typage ou d'exports si nécessaires.

### Jour 5

- Relecture finale du contrat prompt côté `ui`.
- Vérification qu'aucun import depuis `apps/` n'a été introduit.
- Commit de clôture du sprint si la gate est verte.
