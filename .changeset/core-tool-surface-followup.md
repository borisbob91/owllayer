---
"@owllayer/core": minor
---

The agent can now use the tools of a new page right after navigating to it (#76).

- Tools registered while the agent is busy (for example by a page mounted during a tool call) are now sent to the server.
- After a tool that navigates, `OwlLayerClient` waits for the new page to register its tools (up to 500 ms) before returning the tool result.
- `LLMAdapter.handleToolResult` accepts an optional third argument: the tools currently available.
