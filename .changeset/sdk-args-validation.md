---
"@owllayer/react": patch
"@owllayer/vue": patch
"@owllayer/svelte": minor
"@owllayer/angular": patch
---

Tool arguments are now validated by the client before the approval request, in every SDK (#152).

- `useAgentTool` (React, Vue), `agentTool` (Svelte), the resolvers (`useAgentToolResolver` in React and Vue, `agentToolResolver` in Svelte, `registerToolResolver` in Angular) and Angular `registerTool` pass their schema to the client. The SDKs no longer validate arguments in their own wrapper, so there is one validation path.
- An invalid call now fails with `Validation args "<name>": <issue>`. Resolvers used `Validation failed for "<name>"`, and Svelte `agentTool`, `navigateTool` and `uiStateTool` used the bare issue message.
- A resolver no longer calls its handler or its hooks (`onBeforeCall`, `onBeforeAnyCall`, `onError`, `onErrorAnyCall`) for an invalid call. Errors thrown by the handler still reach `onError` and `onErrorAnyCall`.
- Angular: a tool registered with a `schema` (service `registerTool`, `owllayerTool` directive, tool button, `registerNavigationTool`, `registerViewStateTool`) now has its arguments validated. Before, the schema only described the parameters.
- Svelte: `navigateTool` and `uiStateTool` accept a `global` option, as in Angular. `navigate` is global by default and stays registered when its node is removed; `ui_state` is local by default.
