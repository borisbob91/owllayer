---
"@owllayer/core": minor
---

`OwlLayerClient` now syncs tool registrations while the agent is busy (a tool registered during a tool call, e.g. after a navigation, was never sent to the server), `LLMAdapter.handleToolResult` accepts an optional current tool surface, and `OwlLayerClient` waits for the new page to register its tools before returning the result of a tool that navigated, so the agent can chain the next tool (#76).
