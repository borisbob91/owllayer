# @owllayer/angular

## 0.4.0

### Minor Changes

- ca74596: The texts of the built-in approval modal can now be customized (#93).

  - New optional `hitl.labels` option of `provideOwlLayer`: `title`, `message`, `approve`, `deny`, `deniedMessage` and `toolLabels`.
  - `owllayer-approval-modal` accepts a `labels` input. The widget passes the configured labels to it.
  - Without configuration, the current texts are unchanged. The HITL policy message stays displayed unless `message` is set.
  - `OwlLayerAngularService.hitlLabels` returns the configured labels for custom approval UIs.

- 4b349ec: The agent now knows the current page after an Angular Router navigation (#121).

  - `provideOwlLayer` sends the new page to the server when the path changes, even if the page tools stay the same.
  - It stops listening when the application injector is destroyed.

### Patch Changes

- 64281fc: Tool arguments are now validated by the client before the approval request, in every SDK (#152).

  - `useAgentTool` (React, Vue), `agentTool` (Svelte), the resolvers (`useAgentToolResolver` in React and Vue, `agentToolResolver` in Svelte, `registerToolResolver` in Angular) and Angular `registerTool` pass their schema to the client. The SDKs no longer validate arguments in their own wrapper, so there is one validation path.
  - An invalid call now fails with `Validation args "<name>": <issue>`. Resolvers used `Validation failed for "<name>"`, and Svelte `agentTool`, `navigateTool` and `uiStateTool` used the bare issue message.
  - A resolver no longer calls its handler or its hooks (`onBeforeCall`, `onBeforeAnyCall`, `onError`, `onErrorAnyCall`) for an invalid call. Errors thrown by the handler still reach `onError` and `onErrorAnyCall`.
  - Angular: a tool registered with a `schema` (service `registerTool`, `owllayerTool` directive, tool button, `registerNavigationTool`, `registerViewStateTool`) now has its arguments validated. Before, the schema only described the parameters.
  - Svelte: `navigateTool` and `uiStateTool` accept a `global` option, as in Angular. `navigate` is global by default and stays registered when its node is removed; `ui_state` is local by default.

- Updated dependencies [6da45e1]
- Updated dependencies [3a3a4bc]
- Updated dependencies [64281fc]
- Updated dependencies [dd0bdd7]
- Updated dependencies [5585c15]
- Updated dependencies [21f1410]
- Updated dependencies [ba6bc1b]
- Updated dependencies [5a215ef]
- Updated dependencies [6e62051]
  - @owllayer/core@0.5.0

## 0.3.0

### Minor Changes

- d48199c: Restore i18n support for Angular SDK with composable bindings and locale management

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

- 4226060: Migrate Angular's internal PCM capture import from the standalone `@owllayer/audio`
  workspace to `@owllayer/core/media/audio`.

## 0.1.1

### Patch Changes

- Updated dependencies [c5a7134]
- Updated dependencies [17d76b3]
  - @owllayer/audio@0.1.1
  - @owllayer/core@0.1.1
