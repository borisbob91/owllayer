# Issue #08 : Dashboard UI introuvable malgré `@owllayer/ui` installé

**Statut** : 🟢 Résolu  
**Priorité** : 🟡 Majeur  
**Domaine** : server  
**Porteur** : @BorisBob  
**Date** : 2026-04-01

---

## Résumé

Quand `ui.enabled` est activé dans `OwlLayerServer`, le runtime logge `@owllayer/ui n'est pas installé ou son bundle est introuvable` alors que `@owllayer/ui` est bien déclaré en dépendance du serveur et que le bundle dashboard existe dans `dist/`.

Le dashboard embarqué devient alors indisponible en pratique, malgré une installation correcte.

---

## Reproduction

### Conditions
- Version affectée : branche courante post feature_13
- Environnement : Windows / Node.js / workspace pnpm
- Configuration : `ui.enabled: true` avec `@owllayer/ui` déjà buildé

### Scénario pas-à-pas

1. Build `@owllayer/ui`
2. Démarrer `OwlLayerServer` avec `ui.enabled: true`
3. Observer le log du constructeur `DashboardUIHandler`
4. → Bug observé : warning `@owllayer/ui n'est pas installé ou son bundle est introuvable.`

---

## Analyse technique

### Cause racine

`DashboardUIHandler` tente de résoudre un deep path non exporté du package `@owllayer/ui`.

```
Fichier : packages/server/src/admin/DashboardUIHandler.ts
Ligne   : 20
Code    : return require.resolve('@owllayer/ui/dist/dashboard.esm.js');
```

Le package `@owllayer/ui` expose `./dashboard` pour les imports ESM, mais pas `./dist/dashboard.esm.js` pour `require.resolve`.

### Pourquoi c'est un bug (et pas un comportement attendu)

Le package `@owllayer/ui` est bien installé et son bundle existe. L'échec vient uniquement de la méthode de résolution utilisée par le serveur, pas d'une absence réelle du package.

---

## Solution

### Approche retenue

Résoudre le bundle dashboard via l'export ESM `@owllayer/ui/dashboard` avec `import.meta.resolve`, convertir l'URL fichier en chemin local, puis dériver la sourcemap depuis ce chemin.

Ajouter un test serveur qui vérifie que `DashboardUIHandler` sert bien `/bundle.js` quand `@owllayer/ui` est installé et buildé.

### Fichiers qui seront modifiés

| Fichier | Type de modification | Risque |
|---|---|---|
| `packages/server/src/admin/DashboardUIHandler.ts` | Correction logique de résolution du bundle | Faible |
| `packages/server/tests/DashboardUIHandler.test.ts` | Nouveau test de non-régression | Faible |
| `issues/issue_08_dashboard_ui_bundle_resolution.md` | Documentation du bug | Faible |

> ⚠️ Tout fichier modifié en PR qui ne figure pas dans ce tableau est un motif de refus.

### Ce qui NE sera PAS modifié

- `packages/ui`
- `apps/dashboard`
- `packages/server/src/core/OwlLayerServer.ts`
- le packaging public de `@owllayer/ui`

---

## Tests

- [x] Test unitaire couvrant le bug
- [ ] Test d'intégration si applicable
- [x] `pnpm build` passe sur les packages affectés
- [x] `pnpm test` ne régresse pas