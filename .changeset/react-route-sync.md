---
"@owllayer/react": patch
---

The agent now always knows the current page, including after client-side navigations (#83).

- `OwlLayerProvider` sends the page URL to the server on `pushState` and `replaceState`, in addition to the browser back and forward buttons.
- The URL is sent only when the path changes, and whenever a session is established, even while the agent is busy.
