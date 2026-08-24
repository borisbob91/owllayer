# Issue #25 — Migration `@owllayer/vue` vers `@owllayer/vue` + Shim

## 🎯 Objectif
Migrer le SDK Vue vers la nomenclature canonique `@owllayer/vue` et fournir un shim de compatibilité `@owllayer/vue`.

## 📋 Périmètre des modifications
- Renommer `packages/vue/package.json` ➔ `@owllayer/vue`.
- Migrer les dépendances `@owllayer/core` et `@owllayer/ui` vers `@owllayer/core` et `@owllayer/ui`.
- Mettre à jour les imports dans `packages/vue/src/` et `packages/vue/tests/`.
- Créer `packages/vue-legacy` avec identity `@owllayer/vue` réexportant `@owllayer/vue`.
