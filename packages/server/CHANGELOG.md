# @owllayer/server

## 0.4.0

### Minor Changes

- 01740c6: New opt-in `toolGuidance` option: the agent adapts how it uses each tool to its risk level (#80).

  - Each tool sent to the LLM gets a tag based on its HITL risk: `[PROACTIVE]` (none), `[PREAMBLE]` (low), `[SCREEN CONFIRMATION]` (high and critical).
  - A "Tool Behavior" section (English or French) explaining these tags is added to the system prompt, in text, hybrid and live modes.
  - Disabled by default.

- de657a8: The agent can now chain tools without a new user message, for example navigate to checkout and then fill the address (#76).

  - After a tool result, the LLM receives the tools currently available, including those of a page it just opened.
  - Up to 5 tool calls can follow each other in one turn.
  - The Google adapter uses these current tools in its follow-up request.

### Patch Changes

- a83cc31: Fixed: high and critical client tools now show the approval UI when a live voice session is active (#72).

  - The tool call is always forwarded to the browser, so the approval modal or banner appears.
  - The live voice provider receives a single response, with its own call id.

- b1585a0: Fixed: the admin dashboard counts a page view only when the URL changes (#129).

  - Opening a modal, switching a tab or updating the context on the same page no longer adds a page view to the session history.
  - The tools sent to the agent are unchanged: components still register their tools when they mount, with or without a URL change.

- 3e9db5e: Fixed: after the user approves a high or critical server tool, the result now goes back to the model that called it (#128).

  - Typed request while voice mode is on: the text agent now receives the result and answers. Before, the result was sent to the voice provider with an id it did not know, and the user got no answer.
  - Voice request, voice session closed before the approval: the action still runs, but its result is no longer shown to the user as raw JSON.

- Updated dependencies [6da45e1]
- Updated dependencies [3a3a4bc]
- Updated dependencies [5585c15]
- Updated dependencies [21f1410]
  - @owllayer/core@0.5.0
  - @owllayer/ui@0.4.1

## 0.3.0

### Minor Changes

- dc67452: Restore i18n support in server runtime with locale negotiation and middleware integration

### Patch Changes

- d5b4ecf: Exclure les source maps (`.map`) des tarballs npm publies via le champ `files`, et verifier l'absence de `.map` dans `verify-packages`.
- Updated dependencies [d5b4ecf]
- Updated dependencies [dc67452]
- Updated dependencies [396b74c]
  - @owllayer/core@0.4.0
  - @owllayer/ui@0.4.0

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
