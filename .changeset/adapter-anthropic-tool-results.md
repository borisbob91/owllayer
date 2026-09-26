---
"@owllayer/adapter-anthropic": minor
---

`AnthropicAdapter.handleToolResult` now sends the tool result back to Claude (assistant `tool_use` + user `tool_result`, `is_error` on failures) with the current tool surface, instead of returning the raw JSON as the agent reply, so tools can be chained. AITP tool schemas are converted to JSON Schema, a single tool call is handled per turn (`disable_parallel_tool_use`), and the default model and catalog move to `claude-sonnet-5`, `claude-opus-5` and `claude-haiku-4-5` (#96).
