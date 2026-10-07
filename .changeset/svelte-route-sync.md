---
"@owllayer/svelte": minor
---

The agent now knows the current page after a SvelteKit or router navigation (#120).

- `initOwlLayer` sends the new page to the server when the path changes, even if the page tools stay the same.
- The cleanup function returned by `initOwlLayer` stops listening.
