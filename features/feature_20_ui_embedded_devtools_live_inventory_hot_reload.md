# Feature 20 — Sprint 4 : Inventaire live, hot reload et distinction plugins installés / tools actifs dans `@owllayer/ui/devtools`

**Statut** : 🟡 Validée  
**Domaine** : ui  
**Porteur** : @BorisBob  
**Validé par** : @BorisBob  
**Date** : 2026-04-01  
**Sprint** : 1 semaine — 5 jours ouvrés  
**Dépendances** : feature_12_ui_devtools_cross_framework.md, feature_19_ui_embedded_devtools_panel_parity.md

---

## Objectif

Rendre `@owllayer/ui/devtools` fidèle au runtime réel pendant l'intégration : tools actifs alignés sur les montages et démontages de pages/composants, hot reload visible sans remount manuel du panneau, et séparation explicite entre plugin installé et tool actuellement actif.

Ce sprint reste strictement UI. Il consomme le runtime existant exposé au panneau, mais ne redéfinit ni le lifecycle core des tools ni les règles serveur.

---

## Diagnostic actuel

- `packages/ui/src/devtools/ToolsInspector.tsx` fait son propre polling live, mais `PluginInspector.tsx` et `ToolCallSimulator.tsx` travaillent encore sur des snapshots ponctuels.
- Deux onglets du même panneau peuvent donc refléter des états différents juste après une navigation, un montage de composant ou un hot reload.
- Le panneau ne distingue pas encore assez clairement les plugins installés d'un côté et les tools actifs réellement montés de l'autre.
- `PluginInspector.tsx` compte les tools par plugin, mais sans expliquer qu'un plugin peut être installé tout en ayant zéro tool actif à l'instant T.
- Le simulateur peut garder une sélection devenue obsolète après un unmount de composant ou un hot reload.
- Le rafraîchissement est distribué localement dans les tabs au lieu d'être centralisé au niveau du panneau.

---

## Besoin

Le DevTools embarqué doit montrer l'état réellement exécutable du système au moment précis où le développeur l'ouvre, afin d'éviter les faux diagnostics du type « le plugin a disparu » alors qu'il est installé mais sans tool actif, ou l'inverse.

### User story

> En tant que développeur OwlLayer, je veux voir en temps réel quels plugins sont installés et quels tools sont réellement actifs selon les composants montés, afin de diagnostiquer immédiatement un problème de page, de lifecycle ou de hot reload.

---

## Positionnement

- Sprint d'observabilité UI uniquement.
- Source de vérité pour les plugins installés : le registre transmis au panneau.
- Source de vérité pour les tools actifs : `getRegisteredTools()`.
- Interdiction absolue : dériver les plugins installés à partir des seuls tools actifs.
- Interdiction absolue : introduire une dépendance runtime vers `apps/**` ou vers un SDK framework pour résoudre l'inventaire.

---

## Règles de design

- L'inventaire live doit être orchestré une seule fois au niveau de `@owllayer/ui/devtools`, puis partagé à tous les onglets.
- Un plugin installé avec zéro tool actif doit rester visible comme plugin installé, avec un état explicite et non ambigu.
- Un tool retiré par un unmount ou un hot reload doit disparaître du simulateur et des vues d'inventaire sans nécessiter un remount du panneau.
- Le panneau doit exposer une information de fraîcheur simple : dernier refresh, état live, ou état stale clairement visible.
- Aucun onglet ne doit reconstruire sa propre logique live de manière divergente.

---

## AVANT

- Le tab Tools est le seul à suivre réellement le runtime de façon continue.
- Le tab Plugins et le simulateur peuvent afficher une image retardée ou incomplète de l'état courant.
- La frontière sémantique entre plugin installé et tool actif reste implicite.
- Le panneau peut induire un faux diagnostic après navigation ou hot reload.

## APRÈS

- Un snapshot live unique alimente tous les tabs du panneau.
- Le panneau sépare explicitement l'inventaire des plugins installés de celui des tools actifs.
- Les tools apparaissent et disparaissent à chaud selon le montage réel des composants/pages.
- Le simulateur invalide proprement une sélection devenue obsolète et ne propose plus de tool démonté.
- Le développeur peut distinguer un plugin installé mais momentanément sans tools actifs d'un plugin réellement absent.

## POURQUOI

- Le cycle de vie des tools est un comportement central de OwlLayer ; le DevTools doit l'exposer fidèlement.
- Un mauvais inventaire live produit des diagnostics faux, donc des pertes de temps et des corrections au mauvais endroit.
- La séparation plugin installé / tool actif est indispensable dans un système où les tools dépendent du montage de composants.
- Centraliser la logique live dans `@owllayer/ui/devtools` évite des incohérences internes entre tabs.

---

## Périmètre strict

### Ce que ce sprint fait

- Centralise l'acquisition de snapshot live au niveau de `DevToolsPanel` ou d'un hook interne dédié.
- Alimente `ToolsInspector`, `PluginInspector` et `ToolCallSimulator` à partir d'une même source live.
- Clarifie dans l'UI la différence entre `plugins installés` et `tools actifs`.
- Gère proprement l'invalidation d'un tool sélectionné si son composant propriétaire se démonte.
- Rend explicite l'état live du panneau lors des montages, démontages et hot reloads.

### Ce que ce sprint ne fait PAS

- Ne change pas le protocole ADTP.
- Ne modifie pas `@owllayer/core`.
- Ne revoit pas le lifecycle des tools dans les SDKs.
- Ne change pas les bridges React, Vue, Svelte ou Browser dans ce sprint UI.
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

### Interface interne de snapshot

- `readInventorySnapshot(config)`
- `useDevToolsInventory(config)`

Le hook interne est autorisé car il servira à plusieurs tabs du même panneau. Il n'introduit pas de nouvelle API publique côté package.

### startIndex

Non applicable sur ce sprint. Aucun buffer paginé n'est exposé publiquement.

### Boilerplate libs

- `preact`
- `preact/hooks`

Aucune nouvelle dépendance npm n'est autorisée pour ce sprint.

---

## Codes d'erreur stables

- `OWLLAYER_DEVTOOLS_UI_INVENTORY_STALE` : le panneau n'a pas pu confirmer un refresh récent de l'inventaire live.
- `OWLLAYER_DEVTOOLS_UI_ACTIVE_TOOLS_UNAVAILABLE` : snapshot des tools actifs indisponible ou invalide.
- `OWLLAYER_DEVTOOLS_UI_INSTALLED_PLUGINS_UNAVAILABLE` : snapshot des plugins installés indisponible ou invalide.
- `OWLLAYER_DEVTOOLS_UI_STALE_TOOL_SELECTION` : le tool sélectionné dans le simulateur n'est plus actif.

---

## Fichiers ciblés

| Fichier | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `packages/ui/src/devtools/DevToolsPanel.tsx` | Chaque tab porte une partie de la logique live ou des compteurs locaux | Orchestrateur unique du snapshot live, des compteurs et de la fraîcheur | Éviter des états divergents entre tabs |
| `packages/ui/src/devtools/ToolsInspector.tsx` | Polling local et comptage local | Consomme un snapshot live partagé | Garder le tab Tools aligné avec le reste du panneau |
| `packages/ui/src/devtools/PluginInspector.tsx` | Snapshot ponctuel et lecture ambiguë des tools par plugin | Vue installée vs active explicitée à partir d'un snapshot partagé | Éviter la confusion plugin installé / tool actif |
| `packages/ui/src/devtools/ToolCallSimulator.tsx` | Liste de tools potentiellement obsolète après navigation/hot reload | Sélecteur branché au snapshot live et invalidation des selections mortes | Empêcher des simulations sur des tools démontés |
| `packages/ui/src/devtools/StateMonitor.tsx` | Monitor isolé du reste de l'inventaire live | Peut afficher l'état de fraîcheur ou de désynchronisation du panneau | Donner un feedback utile au développeur |
| `packages/ui/src/devtools/index.ts` | Contrat public minimal d'entrée du panneau | Peut accueillir les types internes utiles au snapshot sans changer l'API publique principale | Stabiliser le point d'entrée UI si des types communs sont nécessaires |
| `packages/ui/src/devtools/useDevToolsInventory.ts` | N'existe pas | Nouveau hook interne de snapshot partagé | Centraliser proprement la logique live commune |

---

## Ce qui NE sera PAS modifié

- `packages/react/src/plugins/useDevTools.ts`
- `packages/vue/src/composables/useDevTools.ts`
- `packages/svelte/src/composables/createDevTools.ts`
- `packages/browser/src/runtime/BrowserOwlLayer.ts`
- `packages/react/src/plugins/PluginDevPanel.tsx`
- `packages/core/**`
- `packages/server/**`
- `apps/**`

---

## Plan journalier

### Jour 1

- Cartographier tous les points où `@owllayer/ui/devtools` lit l'inventaire runtime aujourd'hui.
- Isoler les divergences de snapshot entre `ToolsInspector`, `PluginInspector` et `ToolCallSimulator`.
- Valider que le sprint reste confiné à `packages/ui/src/devtools/**`.

### Jour 2

- Introduire le mécanisme central de snapshot partagé dans `DevToolsPanel` ou via un hook interne dédié.
- Stabiliser la cadence de refresh et l'état de fraîcheur du panneau.

### Jour 3

- Brancher `ToolsInspector.tsx` et `PluginInspector.tsx` sur le snapshot partagé.
- Afficher explicitement `plugin installé` vs `tool actif` dans les cartes et compteurs.

### Jour 4

- Brancher `ToolCallSimulator.tsx` sur le snapshot partagé.
- Gérer l'invalidation propre d'un tool sélectionné devenu inactif après navigation ou hot reload.
- Ajouter, si utile, un feedback de stale state dans `StateMonitor.tsx`.

### Jour 5

- Builder `@owllayer/ui`.
- Vérifier manuellement qu'un montage/démontage de composant fait bien varier l'inventaire visible sans remount du panneau.
- Vérifier qu'aucune dépendance vers `apps/**` ou vers un SDK n'a été introduite dans `packages/ui`.

---

## Gate fin de sprint

- `pnpm --filter @owllayer/ui build` passe.
- Les tabs Plugins, Tools et Simulateur lisent tous le même snapshot live.
- Un plugin installé avec zéro tool actif reste visible comme installé.
- Un tool démonté disparaît du simulateur et des listes sans remount du panneau.
- Le panneau n'introduit aucune dépendance runtime vers `apps/**` ni vers un autre package SDK.
- La PR d'implémentation reste strictement dans le domaine `ui`.

---

## Hypothèses ouvertes

- Le registre des plugins installés reste disponible au montage du panneau sans devoir ajouter de nouveau contrat cross-domain dans ce sprint UI.
- La notion de hot reload visée ici couvre le remount de composants/pages en dev et les cycles HMR observables par le panneau, pas un rechargement de package npm.
- Si un SDK doit plus tard exposer un meilleur signal live de plugins installés, cela devra être documenté dans un sprint distinct de son domaine propre.

---

## Ordre de livraison recommandé

1. `useDevToolsInventory.ts`
2. `DevToolsPanel.tsx`
3. `ToolsInspector.tsx`
4. `PluginInspector.tsx`
5. `ToolCallSimulator.tsx`
6. `StateMonitor.tsx`
7. `index.ts` si un type partagé interne devient nécessaire
