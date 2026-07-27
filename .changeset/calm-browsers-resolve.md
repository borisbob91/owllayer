---
"@domos/svelte": patch
"@domos/vue": patch
"@domos/server": patch
---

Use browser-safe ESM imports in CRUD resolver helpers so declaration builds and runtime calls do not depend on CommonJS `require`. Normalize plugin worker errors safely when the runtime reports a non-`Error` value.
