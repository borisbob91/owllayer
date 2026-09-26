---
"@owllayer/adapter-anthropic": minor
---

Tools now work with `AnthropicAdapter`: Claude receives each tool result and can call the next tool (#96).

- Tool results are sent back to Claude instead of being shown to the user as raw JSON.
- Tool parameters are converted to the JSON Schema format required by the Claude API.
- One tool call is handled per turn.
- The default model is now `claude-sonnet-5`. The model list offers `claude-sonnet-5`, `claude-opus-5` and `claude-haiku-4-5`.
