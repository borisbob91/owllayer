# Issue #20 — Migration `@owllayer/adapter-openai` vers `@owllayer/adapter-openai` + Shim

## 🎯 Objectif
Migrer l'adapter OpenAI GPT vers la nomenclature canonique `@owllayer/adapter-openai` et fournir un shim de compatibilité `@owllayer/adapter-openai`.

## 📋 Périmètre des modifications
- Renommer `packages/adapter-openai/package.json` ➔ `@owllayer/adapter-openai`.
- Migrer la dépendance `@owllayer/core` vers `@owllayer/core`.
- Mettre à jour les imports dans `packages/adapter-openai/src/` et `packages/adapter-openai/tests/`.
- Créer `packages/adapter-openai-legacy` avec identity `@owllayer/adapter-openai` réexportant `@owllayer/adapter-openai`.
