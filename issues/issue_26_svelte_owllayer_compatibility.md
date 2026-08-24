# Issue #26 — Migration `@owllayer/svelte` vers `@owllayer/svelte` + Shim

## 🎯 Objectif
Migrer le SDK Svelte vers la nomenclature canonique `@owllayer/svelte` et fournir un shim de compatibilité `@owllayer/svelte`.

## 📋 Périmètre des modifications
- Renommer `packages/svelte/package.json` ➔ `@owllayer/svelte`.
- Migrer les dépendances `@owllayer/core` et `@owllayer/ui` vers `@owllayer/core` et `@owllayer/ui`.
- Mettre à jour les imports dans `packages/svelte/src/` et `packages/svelte/tests/`.
- Créer `packages/svelte-legacy` avec identity `@owllayer/svelte` réexportant `@owllayer/svelte`.
