# Feature 19 — Sprint 3 : Parité visuelle et ergonomique du panneau DevTools embarqué `@domos/ui/devtools`

**Statut** : 🟡 Validée  
**Domaine** : ui  
**Porteur** : @BorisBob  
**Validé par** : @BorisBob  
**Date** : 2026-04-01  
**Sprint** : 1 semaine — 5 jours ouvrés  
**Dépendances** : feature_12_ui_devtools_cross_framework.md

---

## Objectif

Remettre le panneau embarqué `@domos/ui/devtools` au niveau de lisibilité, de densité d'information et de confort d'usage attendu pour un vrai outil développeur DomOS, sans jamais réintroduire une dépendance runtime vers `@domos/react` ni vers `apps/**`.

Ce sprint ne traite pas la fidélité live de l'inventaire. Il traite la parité visuelle et ergonomique du panneau lui-même.

---

## Diagnostic actuel

- `packages/ui/src/devtools/DevToolsPanel.tsx` expose bien un panneau flottant cross-framework, mais son langage visuel s'éloigne fortement du `PluginDevPanel` historique utilisé comme repère UX par les intégrateurs DomOS.
- `packages/ui/src/devtools/PluginInspector.tsx` n'affiche pas les composants UI déclarés par plugin, alors que cette information faisait partie du repère développeur historique.
- Le panneau embarqué démarre réduit et privilégie un rendu générique d'overlay, ce qui dégrade la lecture immédiate des plugins, tools et états en phase d'intégration.
- Le simulateur de tools reste fonctionnel, mais son ergonomie est plus pauvre que l'usage attendu pour un panneau DevTools DomOS : hiérarchie visuelle faible, contexte plugin insuffisant, feedback d'exécution trop brut.
- Le badge de risque et les compteurs n'ont pas encore une grammaire visuelle stable et cohérente entre les onglets.

---

## Besoin

Le package livrable `@domos/ui/devtools` doit devenir le panneau DevTools de référence de DomOS côté UI, avec une ergonomie immédiatement lisible pour les développeurs qui intègrent des plugins, déclarent des tools et diagnostiquent un comportement agent.

### User story

> En tant que développeur DomOS, je veux retrouver dans `@domos/ui/devtools` une expérience visuelle et ergonomique au moins aussi claire que le panneau React historique, afin de débuguer mes plugins et tools sans friction et sans dépendre d'une app de démo.

---

## Positionnement

- Sprint de consolidation UI uniquement.
- Référence UX autorisée : `packages/react/src/plugins/PluginDevPanel.tsx`.
- Interdiction absolue : importer du code runtime depuis `packages/react/**` ou `apps/**`.
- La démo React peut inspirer la hiérarchie visuelle, jamais fournir la logique runtime ni des composants réutilisés tels quels.

---

## Règles de design

- `@domos/ui/devtools` reste l'unique source de vérité runtime pour le panneau embarqué cross-framework.
- La parité recherchée est une parité de lisibilité, de densité utile et d'ergonomie, pas une copie pixel-perfect du `PluginDevPanel` React.
- Les informations clés doivent être visibles sans exploration profonde : plugins installés, tools actifs, niveau de risque, composants UI déclarés, état agent.
- Chaque onglet doit partager la même grammaire visuelle : badges, compteurs, titres, états vides, couleur d'accent.
- Aucune dépendance vers `apps/**` n'est autorisée dans `packages/ui`.
- Aucune dépendance vers `packages/react/**`, `packages/vue/**`, `packages/svelte/**` ou `packages/browser/**` n'est autorisée dans `packages/ui`.

---

## AVANT

- Le panneau embarqué existe et fonctionne, mais son rendu est plus proche d'un overlay générique que d'un DevTools DomOS identifiable.
- Le header ne restitue pas la hiérarchie d'information attendue pour un usage développeur intensif.
- L'inspection plugin perd une partie du contexte utile, notamment les composants UI déclarés.
- Les badges et compteurs sont présents, mais pas encore harmonisés entre tabs et cartes.
- Le simulateur permet l'exécution, mais pas avec le niveau de guidage visuel attendu pour un sprint de parité UX.

## APRÈS

- Le panneau embarqué affiche immédiatement une identité DevTools DomOS plus nette, cohérente et exploitable.
- Le header et les compteurs reflètent clairement l'état du panneau et la volumétrie observée.
- Les cartes plugins réintègrent la lecture des composants UI déclarés, des tools visibles et des états vides utiles.
- Le simulateur présente mieux le tool choisi, son contexte et son résultat.
- Les badges de risque, les pills d'état et les blocs d'information suivent une même logique visuelle sur tout le panneau.

## POURQUOI

- Un DevTools peu lisible coûte du temps d'intégration à chaque plugin ajouté.
- Le package livrable `@domos/ui/devtools` doit être crédible sans renvoyer implicitement les développeurs vers une démo React.
- La parité UX réduit la tentation de recopier des composants depuis d'anciens panneaux spécifiques à un framework.
- Une grammaire visuelle stable prépare mieux le sprint suivant sur l'inventaire live et le hot reload.

---

## Périmètre strict

### Ce que ce sprint fait

- Revoit le header, la hiérarchie visuelle et le comportement d'ouverture du panneau `DevToolsPanel`.
- Réaligne les cartes plugins avec les attentes développeur DomOS : métadonnées utiles, composants UI, tools, badges, états vides.
- Harmonise la présentation de `ToolsInspector`, `ToolCallSimulator`, `StateMonitor` et `RiskBadge`.
- Clarifie visuellement les compteurs et les labels du panneau sans modifier la logique métier du runtime.

### Ce que ce sprint ne fait PAS

- Ne change pas le cycle de vie des tools.
- Ne traite pas la fidélité live de l'inventaire plugins/tools entre onglets.
- Ne change pas les bridges React, Vue, Svelte ou Browser.
- Ne modifie pas `packages/react/src/plugins/PluginDevPanel.tsx`.
- Ne touche pas `apps/**`.

---

## Interface de service visée

### Méthodes de service

- `mountDevTools(el, config): void`
- `unmountDevTools(el): void`
- `config.getRegisteredTools(): Array<ToolDeclaration & { source?: string; global?: boolean }>`
- `config.callTool(name, args): Promise<unknown>`
- `config.getAgentState(): string`
- `config.getSessionId(): string | null`

### startIndex

Non applicable sur ce sprint. Aucun mécanisme de pagination ou de fenêtre incrémentale n'est introduit.

### Boilerplate libs

- `preact`
- `preact/hooks`

Aucune nouvelle dépendance npm n'est autorisée pour ce sprint.

---

## Codes d'erreur stables

Ce sprint ne modifie pas le protocole ADTP et n'introduit pas de nouveaux codes serveur. Les erreurs UI à stabiliser côté panneau sont :

- `DOMOS_DEVTOOLS_UI_INVALID_SIMULATOR_JSON` : arguments JSON invalides dans le simulateur.
- `DOMOS_DEVTOOLS_UI_SIMULATOR_CALL_FAILED` : exécution d'un tool échouée côté simulateur.
- `DOMOS_DEVTOOLS_UI_PANEL_RENDER_INVALID_STATE` : état de rendu incohérent du panneau ou d'un onglet.

---

## Fichiers ciblés

| Fichier | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `packages/ui/src/devtools/DevToolsPanel.tsx` | Panneau fonctionnel mais encore générique dans sa présentation | Header, densité d'info et ergonomie alignés sur l'attendu DevTools DomOS | Restaurer une lecture développeur immédiate |
| `packages/ui/src/devtools/PluginInspector.tsx` | Vue plugin incomplète, sans vraie parité avec le repère historique | Cartes plugins plus informatives, avec composants UI, tools et états vides cohérents | Éviter les angles morts lors du debug plugin |
| `packages/ui/src/devtools/ToolsInspector.tsx` | Outil utile mais visuellement déconnecté du reste du panneau | Présentation harmonisée avec le reste des tabs | Avoir une grammaire UI stable |
| `packages/ui/src/devtools/ToolCallSimulator.tsx` | Simulation possible, mais contexte et restitution encore bruts | Sélecteur, formulaire et résultat mieux hiérarchisés | Réduire la friction de test manuel |
| `packages/ui/src/devtools/StateMonitor.tsx` | Lecture de l'état agent correcte mais présentation secondaire | Cartes et chronologie réalignées avec le reste du panneau | Garder une cohérence d'usage globale |
| `packages/ui/src/devtools/RiskBadge.tsx` | Badge utilitaire sans charte complètement stabilisée | Palette et labels stabilisés pour tout le panneau | Éviter les variations visuelles inutiles |

---

## Ce qui NE sera PAS modifié

- `packages/react/src/plugins/PluginDevPanel.tsx`
- `packages/react/src/plugins/useDevTools.ts`
- `packages/vue/src/composables/useDevTools.ts`
- `packages/svelte/src/composables/createDevTools.ts`
- `packages/browser/src/runtime/BrowserDomOS.ts`
- `packages/core/**`
- `packages/server/**`
- `apps/**`

---

## Plan journalier

### Jour 1

- Relire `feature_12` et le panneau React historique pour isoler les écarts strictement UX et UI.
- Figer la liste exacte des éléments de parité : header, compteurs, cartes plugins, simulateur, badges, états vides.
- Valider que le sprint reste totalement contenu dans `packages/ui/src/devtools/**`.

### Jour 2

- Refaire `DevToolsPanel.tsx` sur la hiérarchie d'information et le comportement d'ouverture/collapse.
- Harmoniser les tokens visuels du panneau : accent, fonds, bordures, densité, badges.

### Jour 3

- Reprendre `PluginInspector.tsx` pour réintroduire les composants UI déclarés et améliorer la lisibilité des cartes plugin.
- Reprendre `ToolsInspector.tsx` et `RiskBadge.tsx` pour stabiliser la grammaire visuelle commune.

### Jour 4

- Reprendre `ToolCallSimulator.tsx` et `StateMonitor.tsx` pour aligner les formulaires, retours d'exécution et blocs d'état.
- Vérifier qu'aucune dépendance cross-package ni import `apps/**` n'a été introduit.

### Jour 5

- Builder `@domos/ui`.
- Faire une relecture finale centrée sur la parité ergonomique réelle, pas sur un simple re-skin.
- Valider que le panneau DevTools embarqué reste autonome et runtime-safe côté package.

---

## Gate fin de sprint

- `pnpm --filter @domos/ui build` passe.
- Le panneau `@domos/ui/devtools` expose à première lecture les plugins, tools, composants UI, risques et état agent.
- Le panneau ne dépend d'aucun fichier runtime dans `apps/**` ni dans un SDK framework.
- La référence UX React reste une inspiration visuelle seulement, sans copie de runtime.
- La PR d'implémentation ne touche que `packages/ui/src/devtools/**` dans le domaine `ui`.

---

## Hypothèses ouvertes

- La parité visuelle recherchée reste compatible avec le choix d'un overlay flottant cross-framework déjà posé par `feature_12`.
- Aucune dépendance supplémentaire de state management n'est nécessaire pour ce sprint.
- Les écarts de fidélité live entre onglets seront traités séparément dans le sprint 20.

---

## Ordre de livraison recommandé

1. `DevToolsPanel.tsx`
2. `PluginInspector.tsx`
3. `ToolsInspector.tsx` + `RiskBadge.tsx`
4. `ToolCallSimulator.tsx`
5. `StateMonitor.tsx`
