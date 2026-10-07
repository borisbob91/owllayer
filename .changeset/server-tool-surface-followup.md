---
"@owllayer/server": minor
"@owllayer/adapter-google": patch
---

The agent can now chain tools without a new user message, for example navigate to checkout and then fill the address (#76).

- After a tool result, the LLM receives the tools currently available, including those of a page it just opened.
- Up to 5 tool calls can follow each other in one turn.
- The Google adapter uses these current tools in its follow-up request.
