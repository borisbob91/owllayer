# GitHub issue #105: Batch CONTEXT_UPDATE messages when several tools register at once

**GitHub issue**: https://github.com/borisbob91/owllayer/issues/105
**Status**: Fix implemented — awaiting review
**Domain**: Core (`packages/core`, `OwlLayerClient`)

## Summary

Each change to the tool registry or the context sends a full `CONTEXT_UPDATE`
to the server right away. A page registers its tools one at a time, so one
navigation sends a burst of messages that each repeat the whole tool list.
Only the last one matters. The server processes every one of them: it answers
each with a `tools_effective` event, logs each as a page view, and, during an
OpenAI Realtime voice session, sends each tool list to OpenAI.

The fix: group the changes made in the same burst and send one
`CONTEXT_UPDATE` with the final state, right after the burst.

## How it works today

`OwlLayerClient` keeps the tools in a `Map`. Five methods change the registry
or the context, and each ends with the same call:

```ts
if (this.canSyncWithServer) {
  this.syncToolsWithServer(); // sends CONTEXT_UPDATE immediately
}
```

| Method | Called by |
|---|---|
| `registerTool` | `useAgentTool` mount (React, Vue, Svelte, Angular), `OwlLayer.registerTool` (Browser) |
| `unregisterTool` | tool unmount |
| `unregisterToolsByComponent` | component unmount |
| `updateContext`, `setContext` | `useAgentContext` and equivalents |

`syncToolsWithServer()` builds the message from the whole registry (URL,
title, every tool declaration, context data), sends it, then calls
`onToolsSync` and emits `tool.registry.synced`.

### What a navigation looks like

The user asks "go to checkout". The agent calls `go_to_checkout`, the router
changes the page, React unmounts the home page and mounts the checkout page.
In one render commit:

```
unregisterToolsByComponent('home')   → CONTEXT_UPDATE (2 tools: the global ones)
registerTool('fill_address')         → CONTEXT_UPDATE (3 tools)
registerTool('fill_checkout_form')   → CONTEXT_UPDATE (4 tools)
registerTool('apply_coupon')         → CONTEXT_UPDATE (5 tools)
registerTool('choose_shipping')      → CONTEXT_UPDATE (6 tools)
registerTool('confirm_checkout')     → CONTEXT_UPDATE (7 tools)
updateContext({ cartTotal: 42 })     → CONTEXT_UPDATE (7 tools)
```

Only the last message describes the real page. The first six describe
intermediate states that never exist for the user.

### Measurement

Built client, session established, the navigation above:

| | Today | Batched |
|---|---|---|
| `CONTEXT_UPDATE` sent | 7 | 1 |
| Tools per message | 2, 3, 4, 5, 6, 7, 7 | 7 |
| Bytes sent | 3,611 | 684 |

Mounting the home page (6 tools) sends 6 messages for the same reason. The
cost grows with the number of tools per page: n tools send n messages and
about n²/2 tool declarations.

## What each extra message costs on the server

`OwlLayerServer.handleContextUpdate` runs for every `CONTEXT_UPDATE`:

1. **Tool surface rebuilt**: updates the session and rebuilds the effective
   tool list (client tools + server tools).
2. **Page history inflated**: `SessionGraph.recordContextChange(url)` appends
   an entry each time, even for the same URL. One visit to checkout shows up
   as 7 page views (`pagesVisited`) in the admin dashboard.
3. **Messages sent back**: a `tools_effective` event goes back to the
   browser for each message, so 7 round trips for one navigation. The
   DevTools and UI state update 7 times.
4. **Voice session updates**: with an active OpenAI Realtime session,
   `liveSession.updateTools()` sends a `session.update` to OpenAI each time:
   7 updates, 6 of them with an incomplete tool list. If the model starts
   answering in between, it can see a partial list.

## Root cause

The client syncs on every single change instead of once per burst of
changes. Frameworks apply mount and unmount effects synchronously in one
batch (React runs all effects of a commit in one pass, Vue runs `onMounted`
hooks in the same flush), so all changes of a navigation happen in the same
JavaScript task. Nothing groups them.

## Proposed solution

Schedule the sync instead of sending it, and send once at the end of the
current task (microtask).

```ts
private syncScheduled = false;

/** Groupe les changements d'une meme rafale en un seul CONTEXT_UPDATE. */
private scheduleSync(): void {
  if (!this.canSyncWithServer || this.syncScheduled) return;
  this.syncScheduled = true;
  queueMicrotask(() => this.flushPendingSync());
}

private flushPendingSync(): void {
  if (!this.syncScheduled) return;
  this.syncScheduled = false;
  if (this.canSyncWithServer) this.syncToolsWithServer();
}
```

- The five methods call `scheduleSync()` instead of `syncToolsWithServer()`.
- The message is built at send time, so it holds the final state.
- A microtask runs as soon as the current synchronous code ends, before any
  timer or network event: no added delay (unlike a `setTimeout` debounce).
- `syncToolsWithServer()` stays public and immediate. It also clears a
  pending scheduled sync, so the same state is not sent twice. The React
  route sync (#83) and the handshake keep using it directly.

### Ordering guarantees

| Case | Rule |
|---|---|
| Tool that navigates (#76) | `waitForToolRegistryToSettle()` waits at least 50 ms, so the microtask has already run. `flushPendingSync()` is also called before sending `TOOL_RESULT`, so `CONTEXT_UPDATE` always comes first. |
| Tool that changes the context without navigating | Same explicit flush before `TOOL_RESULT` and before `APPROVAL_RESPONSE`. |
| Handshake | Unchanged: immediate `syncToolsWithServer()` after `HANDSHAKE_ACK`. |
| No session yet | Unchanged: nothing is scheduled (`canSyncWithServer` is false). The handshake sends the full state. |
| Disconnection between schedule and flush | The flush checks `canSyncWithServer` again and sends nothing. |

### Visible changes for SDKs and apps

- `onToolsSync` and the `tool.registry.synced` event fire once per burst
  instead of once per tool, with the same final list. The React, Vue and
  Browser SDKs only store that list; the DevTools state monitor shows one
  line instead of seven.
- Right after `registerTool()`, the message is not sent yet: it leaves at
  the end of the current task. Code that relied on a synchronous send (tests
  that check `send` just after `registerTool`) must wait a microtask
  (`await Promise.resolve()`).

## Files to change

| File | Change |
|---|---|
| `packages/core/src/client/OwlLayerClient.ts` | `scheduleSync()`, `flushPendingSync()`, five call sites, flush before `TOOL_RESULT` / `APPROVAL_RESPONSE`, `syncToolsWithServer()` clears the pending flag |
| `packages/core/tests/client.contextBatching.test.ts` | New tests (below) |
| `packages/core/tests/client.toolSync.test.ts` | Adjust only if an assertion depends on the synchronous send |
| `.changeset/core-batch-context-updates.md` | `@owllayer/core` patch |

No change in the SDKs, the server or the AITP protocol.

## Test plan

1. 6 `registerTool` calls in the same task send 1 `CONTEXT_UPDATE` with 6
   tools.
2. Navigation scenario above (unregister + 5 registers + `updateContext`)
   sends 1 message with the final list and context.
3. Changes in two separate tasks send 2 messages.
4. No session: nothing is sent, and nothing is sent later.
5. Tool that navigates: the last `CONTEXT_UPDATE` is sent before
   `TOOL_RESULT` and lists the new page tools (existing #76 test keeps
   passing).
6. Tool that calls `updateContext` without navigating: `CONTEXT_UPDATE`
   before `TOOL_RESULT`.
7. `syncToolsWithServer()` called directly sends immediately, and the
   pending scheduled sync does not send a duplicate.
8. `tool.registry.synced` fires once per burst.

Validation: `pnpm --filter @owllayer/core build lint test`, then the React,
Vue, Svelte and Browser test suites (they use the client).

## Result

- `tests/client.contextBatching.test.ts`: the 8 cases above; 5 fail without
  the fix (cases 4, 3 and 6 describe guarantees that already hold and must
  keep holding).
- `tests/client.toolSync.test.ts`: one test now waits a microtask after
  `registerTool` before clearing its send spy.
- Measurement after the fix: mounting the home page sends 1 message instead
  of 6; the navigation sends 1 message (684 bytes) instead of 7 (3,611 bytes).
- Core 117 tests, React 52, Vue 40, Svelte 46, Browser 86, Angular 13,
  Server 202: all pass.

## Out of scope (possible follow-ups, server domain)

- Record a page view only when the URL changes (`recordContextChange`):
  even batched, each `updateContext` on the same page still counts as a view.
- Skip `updateTools()` and `tools_effective` when the effective tool surface
  did not change (context-only updates).
