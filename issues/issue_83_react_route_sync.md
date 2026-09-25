# GitHub issue #83: React client-side navigation does not update the agent page URL

**GitHub issue**: https://github.com/borisbob91/owllayer/issues/83
**Status**: Fix implemented — awaiting review
**Domain**: React (`packages/react`)

## Root cause

`OwlLayerProvider` only listened to `popstate`, which React Router navigations
(`history.pushState` / `replaceState`) never fire. When a navigation did not
change the registered tools, no `CONTEXT_UPDATE` was sent and the server kept
the previous URL. The `popstate` handler also required `isConnected`, which is
false while the agent is busy (see #76).

## Implementation

- Wrap `history.pushState` / `replaceState` and listen to `popstate`; sync only
  when the pathname changes (query/hash changes ignored).
- Sync whenever a session is established (`client.sessionId !== null`).
- On unmount, restore the original methods unless another library wrapped
  them afterwards.

## Out of scope

- Vue, Svelte, Angular and Browser SDK parity (separate issues).

## Validation

- `tests/routeSync.test.tsx` (push/replace, hash/query ignored, popstate, no
  session, restore, later wrapper preserved); 4 tests fail without the fix.
- `@owllayer/react` build, lint and 46 tests.
