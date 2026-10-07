---
"@owllayer/core": minor
---

New `watchRouteChanges(client)` helper: sends the current page to the agent when the app changes page without a full reload (#118).

- Detects router navigations (`history.pushState`, `replaceState`) and the browser back and forward buttons.
- Sends an update only when the path changes; query string and hash changes are ignored.
- Returns a cleanup function that restores `history`. Does nothing during server-side rendering.
- Used by the Vue, Svelte, Angular and Browser SDKs; React already had the same behavior.
