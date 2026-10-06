# @owllayer/react

## 0.4.0

### Minor Changes

- 52eb9ad: The texts of the built-in approval modal and banner can now be customized (#84).

  - New optional `config.hitl.labels`: `title`, `message`, `approve`, `deny`, `deniedMessage` and `toolLabels` (display name per tool).
  - Without configuration, the current texts are unchanged. The HITL policy message stays displayed unless `message` is set.
  - `useApproval()` returns the configured labels for custom approval UIs.

### Patch Changes

- 4b73aa5: `HitlLabels` now comes from `@owllayer/core` (#90).

  - No change for users: `@owllayer/react` still exports `HitlLabels` with the same fields.

- c52ae37: Fixed: slow agent responses caused by `useAgentToolResolver` (#74).

  - Unchanged tools are no longer registered again on every render.
  - Inline resolver configs no longer trigger a loop of context updates between the browser and the server.

- 229738b: The agent now always knows the current page, including after client-side navigations (#83).

  - `OwlLayerProvider` sends the page URL to the server on `pushState` and `replaceState`, in addition to the browser back and forward buttons.
  - The URL is sent only when the path changes, and whenever a session is established, even while the agent is busy.

- Updated dependencies [6da45e1]
- Updated dependencies [3a3a4bc]
- Updated dependencies [5585c15]
- Updated dependencies [21f1410]
  - @owllayer/core@0.5.0

## 0.3.0

### Minor Changes

- d48199c: Restore i18n composable bindings for React SDK with reactive locale switching and message interpolation

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

## 0.1.1

### Patch Changes

- Updated dependencies [17d76b3]
  - @owllayer/core@0.1.1
