# Issue #22 — Migration `@owllayer/adapter-anthropic` vers `@owllayer/adapter-anthropic` + Shim

## 🎯 Objectif
Migrer l'adapter Anthropic Claude vers la nomenclature canonique `@owllayer/adapter-anthropic` et fournir un shim de compatibilité `@owllayer/adapter-anthropic`.

## 📋 Périmètre des modifications
- Renommer `packages/adapter-anthropic/package.json` ➔ `@owllayer/adapter-anthropic`.
- Migrer la dépendance `@owllayer/core` vers `@owllayer/core`.
- Mettre à jour les imports dans `packages/adapter-anthropic/src/`.
- Créer `packages/adapter-anthropic-legacy` avec identity `@owllayer/adapter-anthropic` réexportant `@owllayer/adapter-anthropic`.
