---
"@owllayer/vue": minor
---

The agent now knows the current page after a Vue Router navigation (#119).

- `OwlLayerPlugin` sends the new page to the server when the path changes, even if the page tools stay the same.
- It stops listening when the app is unmounted.
