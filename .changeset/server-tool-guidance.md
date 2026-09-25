---
"@owllayer/server": minor
---

Add the opt-in `toolGuidance` option: tools sent to the LLM carry a behavior tag derived from their HITL risk (`[PROACTIVE]`, `[PREAMBLE]`, `[SCREEN CONFIRMATION]`) and a "Tool Behavior" section (EN/FR) is appended to the system prompt in text, hybrid and live modes (#80).
