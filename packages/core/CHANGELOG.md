# @owllayer/core

## 0.3.0

### Minor Changes

- 1ee6cff: Complete the Core and UI naming migration as part of the final pre-publication OwlLayer cutover.

## 0.2.0

### Minor Changes

- c5a7134: Add the canonical `@owllayer/core/media/audio` subpath and keep
  `@owllayer/audio` as a compatibility shim for the migrated audio helpers.
- 17d76b3: Make `@owllayer/core` the canonical public core package and keep `@owllayer/core`
  as a temporary compatibility bridge that re-exports it. The canonical package
  adds the AITP public aliases while preserving the existing ADTP exports,
  message behavior, and wire compatibility.
