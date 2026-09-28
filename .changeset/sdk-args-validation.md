---
"@owllayer/react": patch
"@owllayer/vue": patch
"@owllayer/svelte": patch
---

`useAgentTool` (React, Vue) and `agentTool` (Svelte) now pass their schema straight to the client, which validates arguments before the approval request (#152).

- The SDKs no longer validate arguments themselves in their own wrapper — one validation path instead of two.
- In Svelte, an invalid call now fails with `Validation args "<name>": <issue>` (it was the bare issue message), the same message as React and Vue.
- Resolvers are unchanged.
