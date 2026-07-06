# Issue #17 : Build `@domos/ui` cassé par la perte de narrowing de `MonitorEvent` dans `StateMonitor`

**Statut** : 🔴 Ouvert  
**Priorité** : 🔴 Bloquant  
**Domaine** : ui  
**Porteur** : @BorisBob  
**Date** : 2026-04-07

---

## Résumé

Le build du package `@domos/ui` casse dans `packages/ui/src/devtools/StateMonitor.tsx` avec des erreurs TypeScript `TS18048` et `TS2339` autour de `describeEvent()` et des accès à `event.payload.*`.

La régression ne relève pas de `issue_10` : cette dernière documente une interaction pointer/click sur `DevToolsPanel.tsx` et mentionne explicitement que les erreurs TypeScript de `StateMonitor.tsx` restent hors périmètre.

---

## Reproduction

### Conditions
- Version affectée : branche courante au 2026-04-07
- Environnement : Windows / pnpm workspace / package `@domos/ui`
- Configuration : build du package depuis `domos/`

### Scénario pas-à-pas

1. Se placer à la racine `domos/`
2. Exécuter `pnpm --filter @domos/ui build`
3. Laisser TypeScript analyser `packages/ui/src/devtools/StateMonitor.tsx`
4. → Bug observé : le build casse avec `TS18048` et `TS2339` dans `describeEvent()` autour des accès à `event.payload.previous`, `event.payload.current`, `event.payload.source`, `event.payload.tools`, `event.payload.request`, etc.

---

## Analyse technique

### Cause racine

`StateMonitor.tsx` remplace le contrat discriminé `DomOSClientEvent` par un union local plus large :

```
Fichier : packages/ui/src/devtools/StateMonitor.tsx
Ligne   : 39-45
Code    : type MonitorEvent = DomOSClientEvent | {
            type: string;
            payload?: {
              text?: string;
              done?: boolean;
              sessionId?: string;
            };
          };
```

Puis `describeEvent()` s'appuie sur un `switch (event.type)` comme si le narrowing discriminé de `DomOSClientEvent` restait intact :

```
Fichier : packages/ui/src/devtools/StateMonitor.tsx
Ligne   : 216-242
Code    : return `${event.payload.previous} -> ${event.payload.current}`;
          return `source: ${event.payload.source}`;
          return `${event.payload.tools.length} tool(s)`;
          return `${event.payload.request.toolName} (${event.payload.request.risk})`;
```

Le problème est structurel : l'alternative `{ type: string; payload?: ... }` élargit `type` à `string` et rend `payload` optionnel. TypeScript ne peut donc plus discriminer précisément les branches de `DomOSClientEvent`, et toutes les lectures de `event.payload.*` dans `describeEvent()` deviennent potentiellement invalides.

### Pourquoi c'est un bug (et pas un comportement attendu)

Le package `@domos/ui` est en `strict` et son build doit rester vert. Ici, `StateMonitor.tsx` dégrade localement un type canonique déjà discriminé côté `@domos/core`, ce qui casse la compilation sans apporter de bénéfice fonctionnel côté UI.

Le besoin réel du composant est limité : agréger quelques événements textuels tolérants côté monitor. Cela ne justifie pas de casser le contrat TypeScript du flux complet des événements client.

---

## Solution

### Approche retenue

Corriger `StateMonitor.tsx` localement, sans modifier `@domos/core` ni le bridge DevTools, en restaurant un chemin de typage qui préserve le narrowing discriminé de `DomOSClientEvent` dans `describeEvent()`.

Concrètement :

- garder `describeEvent()` ancré sur le contrat canonique `DomOSClientEvent` ou sur un type local qui n'élargit pas `type` à `string` générique ;
- isoler le cas tolérant des flux texte non strictement canoniques derrière un garde local dédié, au lieu de l'injecter dans tout le type `MonitorEvent` ;
- conserver la logique métier actuelle de résumé d'événements et d'agrégation texte ;
- ne pas ouvrir de refactor du panneau DevTools ni du protocole d'événements.

### Fichiers qui seront modifiés

| Fichier | Type de modification | Risque |
|---|---|---|
| `issues/issue_17_ui_state_monitor_event_narrowing_build_break.md` | Documentation du bug et du périmètre | Faible |
| `packages/ui/src/devtools/StateMonitor.tsx` | Correction ciblée du typage local pour restaurer le narrowing discriminé et faire repasser le build | Faible |

> ⚠️ Tout fichier modifié en PR qui ne figure pas dans ce tableau est un motif de refus.

### Ce qui NE sera PAS modifié

- `packages/core/**`
- `packages/ui/src/devtools/DevToolsPanel.tsx`
- `packages/ui/src/devtools/PluginInspector.tsx`
- `packages/ui/src/devtools/ToolCallSimulator.tsx`
- `packages/ui/src/devtools/ToolsInspector.tsx`
- `packages/ui/src/devtools/index.ts`
- `apps/**`
- `issue_10_devtools_panel_interaction_regression.md`
- toute extension d'infrastructure de tests dans `@domos/ui`

---

## Tests

- [ ] Vérifier que `pnpm --filter @domos/ui build` repasse sans `TS18048` ni `TS2339` dans `StateMonitor.tsx`
- [ ] Vérifier que `pnpm --filter @domos/ui lint` repasse sans régression de typage sur le package
- [ ] Vérifier manuellement que le monitor continue de résumer correctement les événements `connection.state.changed`, `session.started`, `turn.*`, `tool.registry.synced`, `approval.requested` et les flux texte déjà gérés
- [ ] `pnpm test` ne régresse pas

Absence assumée de périmètre de test additionnel dans cette issue : aucun nouveau fichier de test n'est autorisé ici. Si la correction exige finalement un nouveau point d'entrée de test dédié dans `packages/ui`, cela devra être cadré par une issue séparée.