---
"@owllayer/core": minor
---

`LLMAdapter.handleToolResult` accepts an optional current tool surface, and `OwlLayerClient` waits for the new page to register its tools before returning the result of a tool that navigated, so the agent can chain the next tool (#76).
