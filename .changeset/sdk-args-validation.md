---
"@owllayer/react": patch
"@owllayer/vue": patch
"@owllayer/svelte": patch
---

`useAgentTool` (React, Vue) and `agentTool` (Svelte) now pass their schema straight to the client, which validates arguments before the approval request (#152).

- The SDKs no longer validate arguments themselves in their own wrapper — one validation path instead of two.
- Resolvers are unchanged.
