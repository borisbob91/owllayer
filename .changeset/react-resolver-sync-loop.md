---
"@owllayer/react": patch
---

Fixed: slow agent responses caused by `useAgentToolResolver` (#74).

- Unchanged tools are no longer registered again on every render.
- Inline resolver configs no longer trigger a loop of context updates between the browser and the server.
