---
"@owllayer/react": patch
---

Import `HitlLabels` from `@owllayer/core` instead of redefining it locally; `@owllayer/react` still exports `HitlLabels` with the same shape, so this is not a public API change (#90).
