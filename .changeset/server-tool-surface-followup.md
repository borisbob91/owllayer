---
"@owllayer/server": minor
"@owllayer/adapter-google": patch
---

Pass the current tool surface to `handleToolResult` and let the agent chain tool calls after a tool result (up to 5 in a row), so a navigation tool can be followed by the new page tools without a new user message. The Google adapter uses the provided surface in its follow-up request (#76).
