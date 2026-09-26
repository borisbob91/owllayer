# GitHub issue #117: Send the current page to the agent on client-side navigation (all SDKs)

**GitHub issue**: https://github.com/borisbob91/owllayer/issues/117 (epic)
**Sub-issues**: #118 core, #119 Vue, #120 Svelte, #121 Angular, #122 Browser
**Status**: #118 implemented — awaiting review; #119 to #122 not started
**Domain**: Core first (`packages/core`), then one SDK per sub-issue

## Summary

The agent knows which page the user is on only through the URL sent in each
`CONTEXT_UPDATE`. Outside React, nothing sends one when the router changes
the page, unless the navigation also changes the registered tools. The agent
then answers about the previous page.

React fixed this in #83. This epic moves that logic into core as a shared
helper, `watchRouteChanges(client)`, and wires it into Vue, Svelte, Angular
and Browser.

## How the page reaches the agent today

1. The client builds each `CONTEXT_UPDATE` with `window.location.pathname`,
   the title, the tools and the context data (`syncToolsWithServer()`).
2. The server stores the URL in the session (`SessionManager.updateContext`).
3. Each LLM request adds it to the system prompt: `[Page actuelle: /checkout]`
   (`BaseLLMAdapter.formatContext`).

A `CONTEXT_UPDATE` is sent when:

| Trigger | Sends the new URL? |
|---|---|
| Session start (handshake) | yes |
| Tool registered or unregistered, context changed | yes, as a side effect |
| Router navigation that keeps the same tools | **no**, except in React (#83) |

## The problem

Routers change the URL with `history.pushState` / `replaceState`. These
calls do not fire any browser event (`popstate` only fires on the back and
forward buttons). So:

- Two pages that share the same tools (only global tools, or two product
  pages built by the same component): no tool changes, no message, the
  server keeps the old URL.
- A page with no tools at all: same.
- The URL can even be wrong after a navigation that does change tools, if
  the tools are registered before the router updates the URL.

Example: the user is on `/products/42`, clicks on another product
(`/products/57`). Same component, same tools. The user asks "is this one in
stock?". The system prompt still says `[Page actuelle: /products/42]`.

| SDK | Listens to URL changes |
|---|---|
| React | yes (#83) |
| Vue, Svelte, Angular, Browser | no |

## Solution

### Step 1 — core helper (#118)

`watchRouteChanges(client)` in `packages/core/src/client/watchRouteChanges.ts`,
exported from `@owllayer/core`. Same logic as the React provider:

- Wraps `history.pushState` and `replaceState`, and listens to `popstate`.
- On each call, compares `location.pathname` with the last one: syncs only
  when the path changes. Query string (`?tab=2`) and hash (`#details`)
  changes are ignored, like in React.
- Syncs whenever a session is established (`client.sessionId !== null`),
  even while the agent is busy: a navigation triggered by a tool happens
  while the agent is in the `thinking` state (#76).
- Uses `client.syncToolsWithServer()`, which sends immediately (not batched,
  see #105), so the new URL is sent right away.
- Returns a cleanup function that removes the `popstate` listener and
  restores `pushState` / `replaceState`, unless another library wrapped them
  after us (then its wrapper is kept).
- Without `window` (server-side rendering): does nothing and returns an
  empty cleanup.

Why in core: the SDKs must not import from each other (AGENTS.md), and the
logic depends only on the browser `history` API, not on a framework.

### Steps 2 to 5 — wiring in each SDK

| SDK | Start | Stop |
|---|---|---|
| Vue (#119) | `OwlLayerPlugin.install`, in the browser | existing `app.unmount` override |
| Svelte (#120) | `initOwlLayer` | cleanup function returned by `initOwlLayer` |
| Angular (#121) | `provideOwlLayer` service factory | `DestroyRef` of the environment injector |
| Browser (#122) | `BrowserOwlLayer.init` and `BrowserOwlLayerCore.init` | `destroy()` |

Each SDK adds one call and one cleanup, plus a test: a `pushState` to a new
path sends a `CONTEXT_UPDATE` with the new URL, and the teardown restores
`history.pushState`.

## Tests (#118)

`packages/core/tests/watchRouteChanges.test.ts`, with a minimal fake
`window` (core tests run in Node, no `jsdom` dependency added):

1. `pushState` and `replaceState` to a new path sync.
2. Query or hash changes do not sync.
3. `popstate` (back button) syncs.
4. No session: no sync; syncs once a session exists.
5. Cleanup restores `history` and removes the `popstate` listener.
6. A wrapper installed after ours is kept by the cleanup.
7. No `window`: no error, no sync.

All 7 fail before the helper is exported.

## Out of scope

- **React migration**: the React provider keeps its own copy of the logic
  (#83). Switching it to the core helper changes no behavior; possible
  follow-up.
- **Hash-based routers** (`/#/checkout`, Vue `createWebHashHistory`, Angular
  `HashLocationStrategy`): the client sends `location.pathname` only, which
  stays `/`. True in every SDK, including React.
- **Page views in the admin dashboard**: counted on every `CONTEXT_UPDATE`
  (see the follow-up discussed after #105).
