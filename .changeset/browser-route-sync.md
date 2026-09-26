---
"@owllayer/browser": minor
---

The agent now knows the current page after a client-side navigation in single-page apps using the browser SDK (#122).

- `OwlLayer.init()` sends the new page to the server when the path changes, even if the page tools stay the same.
- `destroy()` stops listening.
- Classic multi-page sites are unchanged: each page load already sends its own page and tools.
