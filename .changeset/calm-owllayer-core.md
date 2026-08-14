---
'@owllayer/core': minor
'@domos/core': patch
---

Make `@owllayer/core` the canonical public core package and keep `@domos/core`
as a temporary compatibility bridge that re-exports it. The canonical package
adds the AITP public aliases while preserving the existing ADTP exports,
message behavior, and wire compatibility.
