---
"@owllayer/react": patch
---

Prevent `useAgentToolResolver` from re-registering unchanged tools on every render. Inline resolver configs no longer trigger a CONTEXT_UPDATE / tools_effective feedback loop that slowed down agent communication (#74).
