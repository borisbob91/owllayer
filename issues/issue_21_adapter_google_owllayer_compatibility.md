# Issue #21 — Migration `@owllayer/adapter-google` vers `@owllayer/adapter-google` + Shim

## 🎯 Objectif
Migrer l'adapter Google Gemini vers la nomenclature canonique `@owllayer/adapter-google` et fournir un shim de compatibilité `@owllayer/adapter-google`.

## 📋 Périmètre des modifications
- Renommer `packages/adapter-google/package.json` ➔ `@owllayer/adapter-google`.
- Migrer la dépendance `@owllayer/core` vers `@owllayer/core`.
- Mettre à jour les imports dans `packages/adapter-google/src/` et `packages/adapter-google/tests/`.
- Créer `packages/adapter-google-legacy` avec identity `@owllayer/adapter-google` réexportant `@owllayer/adapter-google`.
