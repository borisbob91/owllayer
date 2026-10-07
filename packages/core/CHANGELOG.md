# @owllayer/core

## 0.5.0

### Minor Changes

- 3a3a4bc: New shared `HitlLabels` type for the texts of approval UIs, used by all framework SDKs (#90).

  - Fields, all optional: `title`, `message`, `approve`, `deny`, `deniedMessage` and `toolLabels` (display name per tool).

- 5585c15: The agent can now use the tools of a new page right after navigating to it (#76).

  - Tools registered while the agent is busy (for example by a page mounted during a tool call) are now sent to the server.
  - After a tool that navigates, `OwlLayerClient` waits for the new page to register its tools (up to 500 ms) before returning the tool result.
  - `LLMAdapter.handleToolResult` accepts an optional third argument: the tools currently available.

- 21f1410: New `watchRouteChanges(client)` helper: sends the current page to the agent when the app changes page without a full reload (#118).

  - Detects router navigations (`history.pushState`, `replaceState`) and the browser back and forward buttons.
  - Sends an update only when the path changes; query string and hash changes are ignored.
  - Returns a cleanup function that restores `history`. Does nothing during server-side rendering.
  - Used by the Vue, Svelte, Angular and Browser SDKs; React already had the same behavior.

### Patch Changes

- 6da45e1: The client now sends one context update per page change instead of one per tool (#105).

  - Tools and context changes made in the same render are grouped into a single `CONTEXT_UPDATE`, sent right after the render with the final state. A navigation that mounted 5 tools sent 7 messages; it now sends 1.
  - The server does less work per navigation: one tool list update, one `tools_effective` reply, and one tool update for OpenAI Realtime voice sessions.
  - The `tool.registry.synced` event and the `onToolsSync` callback fire once per group of changes, with the same final tool list.
  - `syncToolsWithServer()` still sends immediately.

## 0.4.0

### Minor Changes

- dc67452: Restore core i18n infrastructure with locale resolution, language packs, and message interpolation

### Patch Changes

- d5b4ecf: Exclure les source maps (`.map`) des tarballs npm publies via le champ `files`, et verifier l'absence de `.map` dans `verify-packages`.

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
