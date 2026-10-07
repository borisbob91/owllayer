---
"@owllayer/server": minor
---

New opt-in `toolGuidance` option: the agent adapts how it uses each tool to its risk level (#80).

- Each tool sent to the LLM gets a tag based on its HITL risk: `[PROACTIVE]` (none), `[PREAMBLE]` (low), `[SCREEN CONFIRMATION]` (high and critical).
- A "Tool Behavior" section (English or French) explaining these tags is added to the system prompt, in text, hybrid and live modes.
- Disabled by default.
