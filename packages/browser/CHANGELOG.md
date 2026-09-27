# @owllayer/browser

## 0.4.0

### Minor Changes

- 77e1cd2: The texts of the built-in approval overlay can now be customized (#94).

  - New optional `hitl.labels` option: `title`, `message`, `approve`, `deny`, `deniedMessage` and `toolLabels` (display name per tool, shown in the overlay).
  - Without configuration, the current texts are unchanged. The HITL policy message stays displayed unless `message` is set.
  - `getHitlLabels()`, also available on the CDN global `OwlLayer`, returns the configured labels for custom approval UIs.

- 3882762: The agent now knows the current page after a client-side navigation in single-page apps using the browser SDK (#122).

  - `OwlLayer.init()` sends the new page to the server when the path changes, even if the page tools stay the same.
  - `destroy()` stops listening.
  - Classic multi-page sites are unchanged: each page load already sends its own page and tools.

### Patch Changes

- Updated dependencies [6da45e1]
- Updated dependencies [3a3a4bc]
- Updated dependencies [5585c15]
- Updated dependencies [21f1410]
  - @owllayer/core@0.5.0

## 0.3.0

### Minor Changes

- d48199c: Restore i18n support for Browser SDK with complete locale resolution and message interpolation

### Patch Changes

- d5b4ecf: Exclure les source maps (`.map`) des tarballs npm publies via le champ `files`, et verifier l'absence de `.map` dans `verify-packages`.
- Updated dependencies [d5b4ecf]
- Updated dependencies [dc67452]
  - @owllayer/core@0.4.0

## 0.2.0

### Minor Changes

- 6a9a96b: Migrate the Browser SDK to canonical `@owllayer/browser` naming as part of the final pre-publication cutover.

### Patch Changes

- Updated dependencies [1ee6cff]
  - @owllayer/core@0.3.0

## 0.1.1

### Patch Changes

- Updated dependencies [17d76b3]
  - @owllayer/core@0.1.1
