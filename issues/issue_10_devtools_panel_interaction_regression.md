# Issue #10 : Régression d'interaction sur le panneau DevTools embarqué

**Statut** : 🟡 En cours  
**Priorité** : 🟡 Majeur  
**Domaine** : ui  
**Porteur** : @BorisBob  
**Date** : 2026-04-01

---

## Résumé

Le panneau DevTools embarqué de `@domos/ui` ne s'ouvre plus au clic quand il est réduit, alors que ce bouton constitue le point d'entrée principal du panneau.

Le drag devient également instable car la capture de pointeur est prise sur `e.target` au lieu d'un handle stable, ce qui casse le déplacement depuis le panneau réduit et fragilise le déplacement depuis l'en-tête du panneau ouvert.

---

## Reproduction

### Conditions
- Version affectée : branche courante au 2026-04-01
- Environnement : Windows / pnpm workspace / package `@domos/ui`
- Configuration : DevTools embarqué affiché via `packages/ui/src/devtools/DevToolsPanel.tsx`

### Scénario pas-à-pas

1. Afficher le panneau DevTools embarqué sous forme réduite
2. Cliquer simplement sur le panneau réduit
3. Observer que le panneau ne s'ouvre pas
4. Tenter ensuite un drag depuis le panneau réduit puis depuis l'en-tête du panneau ouvert
5. → Bug observé : l'ouverture au clic est bloquée et le drag n'est pas fiable selon l'élément ciblé

---

## Analyse technique

### Cause racine

La logique de `onPointerDown` ignore immédiatement tout événement dont la cible remonte vers `button, select, textarea, input`. Quand le panneau est réduit, l'élément racine est lui-même un `<button>`, donc le handler retourne avant d'initialiser `dragging.current`.

Ensuite, l'ouverture du panneau réduit dépend de `onPointerUp` avec `dragging.current` initialisé et `hasMoved.current === false`, ce qui ne peut plus arriver.

Enfin, la capture de pointeur est effectuée sur `e.target` au lieu d'un handle stable, ce qui rend le drag fragile dès que l'utilisateur démarre l'interaction sur un sous-élément interne.

```
Fichier : packages/ui/src/devtools/DevToolsPanel.tsx
Ligne   : 30-43, 65-69, 111-117, 146-149
Code    : if ((e.target as HTMLElement).closest('button, select, textarea, input')) return;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          if (dragging.current && !hasMoved.current) {
            setCollapsed(c => !c);
          }
```

### Pourquoi c'est un bug (et pas un comportement attendu)

Le panneau réduit doit rester cliquable pour ouvrir l'interface et déplaçable par drag sans ambiguïté. Les boutons internes du panneau ouvert doivent rester interactifs sans initier de drag. Le comportement actuel casse ces trois attentes de base sur le composant principal de debug UI.

---

## Solution

### Approche retenue

Conserver le style et la structure existants, mais séparer clairement les zones d'interaction :

- le panneau réduit reste à la fois cliquable et draggable ;
- le panneau ouvert ne démarre le drag que depuis son en-tête ;
- la capture de pointeur se fait sur `e.currentTarget`, c'est-à-dire le handle stable qui porte réellement le drag ;
- les boutons internes continuent de court-circuiter le drag pour préserver leurs clics.

### Fichiers qui seront modifiés

| Fichier | Type de modification | Risque |
|---|---|---|
| `issues/issue_10_devtools_panel_interaction_regression.md` | Documentation du bug et du correctif | Faible |
| `packages/ui/src/devtools/DevToolsPanel.tsx` | Correction ciblée de la logique pointer/click/drag | Faible |

> ⚠️ Tout fichier modifié en PR qui ne figure pas dans ce tableau est un motif de refus.

### Ce qui NE sera PAS modifié

- `apps/**`
- `packages/server/**`
- `packages/core/**`
- les autres SDKs `packages/react/**`, `packages/vue/**`, `packages/svelte/**`, `packages/browser/**`, `packages/shopify/**`, `packages/woocommerce/**`
- les autres composants DevTools hors blocage de typage, non attendu ici

---

## Tests

- [ ] Test unitaire couvrant le bug
- [ ] Test d'intégration si applicable
- [ ] `pnpm --filter @domos/ui build` passe sur le package affecté
- [ ] `pnpm test` ne régresse pas

Validation actuelle : le correctif ciblé est implémenté, mais le build `@domos/ui` reste bloqué par des erreurs TypeScript préexistantes dans `packages/ui/src/devtools/StateMonitor.tsx`, hors périmètre de cette issue.