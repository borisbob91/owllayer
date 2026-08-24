# Issue #27 — Migration `@owllayer/angular` vers `@owllayer/angular` + Shim

## 🎯 Objectif
Migrer le SDK Angular vers la nomenclature canonique `@owllayer/angular` et fournir un shim de compatibilité `@owllayer/angular`.

## 📋 Périmètre des modifications
- Renommer `packages/angular/package.json` ➔ `@owllayer/angular`.
- Migrer les dépendances `@owllayer/core` et `@owllayer/ui` vers `@owllayer/core` et `@owllayer/ui`.
- Mettre à jour les imports dans `packages/angular/src/` et `packages/angular/tests/`.
- Créer `packages/angular-legacy` avec identity `@owllayer/angular` réexportant `@owllayer/angular`.
