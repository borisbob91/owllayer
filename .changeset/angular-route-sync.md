---
"@owllayer/angular": minor
---

The agent now knows the current page after an Angular Router navigation (#121).

- `provideOwlLayer` sends the new page to the server when the path changes, even if the page tools stay the same.
- It stops listening when the application injector is destroyed.
