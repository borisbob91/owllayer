---
"@owllayer/react": patch
---

`OwlLayerProvider` now syncs the page URL on client-side navigations (`pushState`, `replaceState`) in addition to `popstate`, only when the pathname changes and whenever a session is established, so the agent always knows the current page (#83).
