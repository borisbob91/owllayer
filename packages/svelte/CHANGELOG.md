# @owllayer/svelte

## 0.4.0

### Minor Changes

- bc92893: The texts of the built-in approval modal and banner can now be customized (#92).

  - New optional `hitl.labels` option of `initOwlLayer`: `title`, `message`, `approve`, `deny`, `deniedMessage` and `toolLabels` (display name per tool, shown in the banner).
  - Without configuration, the current texts are unchanged. The HITL policy message stays displayed unless `message` is set.
  - The new `hitlLabels` store returns the configured labels for custom approval UIs.

- 44b2ea6: The agent now knows the current page after a SvelteKit or router navigation (#120).

  - `initOwlLayer` sends the new page to the server when the path changes, even if the page tools stay the same.
  - The cleanup function returned by `initOwlLayer` stops listening.

### Patch Changes

- Updated dependencies [6da45e1]
- Updated dependencies [3a3a4bc]
- Updated dependencies [5585c15]
- Updated dependencies [21f1410]
  - @owllayer/core@0.5.0

## 0.3.0

### Minor Changes

- dc67452: Restore i18n support in Svelte SDK with composable bindings and reactive locale switching

### Patch Changes

- d5b4ecf: Exclure les source maps (`.map`) des tarballs npm publies via le champ `files`, et verifier l'absence de `.map` dans `verify-packages`.
- Updated dependencies [d5b4ecf]
- Updated dependencies [dc67452]
  - @owllayer/core@0.4.0

## 0.2.0

### Minor Changes

- 6a9a96b: Migrate framework SDK packages to canonical `@owllayer/*` naming as part of the final pre-publication cutover.

### Patch Changes

- Updated dependencies [1ee6cff]
  - @owllayer/core@0.3.0

## 0.1.2

### Patch Changes

- Updated dependencies [17d76b3]
  - @owllayer/core@0.1.1

## 0.1.1

### Patch Changes

- a8ad67a: Use browser-safe ESM imports in CRUD resolver helpers so declaration builds and runtime calls do not depend on CommonJS `require`. Normalize plugin worker errors safely when the runtime reports a non-`Error` value.
