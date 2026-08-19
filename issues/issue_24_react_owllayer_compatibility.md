# Issue #24 — Migration `@owllayer/react` vers `@owllayer/react` + Shim

## 🎯 Objectif
Migrer le SDK React vers la nomenclature canonique `@owllayer/react` et fournir un shim de compatibilité `@owllayer/react`.

## 📋 Périmètre des modifications
- Renommer `packages/react/package.json` ➔ `@owllayer/react`.
- Migrer les dépendances `@owllayer/core` et `@owllayer/ui` vers `@owllayer/core` et `@owllayer/ui`.
- Mettre à jour le script de build dans `packages/react/package.json` (`--external @owllayer/ui`).
- Mettre à jour les imports dans `packages/react/src/` et `packages/react/tests/`.
- Créer `packages/react-legacy` avec identity `@owllayer/react` réexportant `@owllayer/react`.
