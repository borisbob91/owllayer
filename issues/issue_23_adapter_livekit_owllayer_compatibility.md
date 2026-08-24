# Issue #23 — Migration `@owllayer/adapter-livekit` vers `@owllayer/adapter-livekit` + Shim

## 🎯 Objectif
Migrer l'adapter LiveKit vers la nomenclature canonique `@owllayer/adapter-livekit` et fournir un shim de compatibilité `@owllayer/adapter-livekit`.

## 📋 Périmètre des modifications
- Renommer `packages/adapter-livekit/package.json` ➔ `@owllayer/adapter-livekit`.
- Remplacer la dépendance `@owllayer/core` par `@owllayer/core`.
- Mettre à jour les imports dans `packages/adapter-livekit/src/` et `packages/adapter-livekit/tests/`.
- Créer `packages/adapter-livekit-legacy` avec identity `@owllayer/adapter-livekit` réexportant `@owllayer/adapter-livekit`.
