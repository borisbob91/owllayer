# @owllayer/server

## 0.2.0

### Minor Changes

- 6a9a96b: Migrate the Server package to canonical `@owllayer/server` naming as part of the final pre-publication cutover.

### Patch Changes

- Updated dependencies [1ee6cff]
  - @owllayer/core@0.3.0
  - @owllayer/ui@0.3.0

## 0.1.3

### Patch Changes

- Updated dependencies [7f0bb7f]
  - @owllayer/ui@0.1.2

## 0.1.2

### Patch Changes

- Updated dependencies [17d76b3]
  - @owllayer/core@0.1.1
  - @owllayer/ui@0.1.1

## 0.1.1

### Patch Changes

- a8ad67a: Use browser-safe ESM imports in CRUD resolver helpers so declaration builds and runtime calls do not depend on CommonJS `require`. Normalize plugin worker errors safely when the runtime reports a non-`Error` value.
