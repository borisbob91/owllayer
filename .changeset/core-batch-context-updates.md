---
"@owllayer/core": patch
---

The client now sends one context update per page change instead of one per tool (#105).

- Tools and context changes made in the same render are grouped into a single `CONTEXT_UPDATE`, sent right after the render with the final state. A navigation that mounted 5 tools sent 7 messages; it now sends 1.
- The server does less work per navigation: one tool list update, one `tools_effective` reply, and one tool update for OpenAI Realtime voice sessions.
- The `tool.registry.synced` event and the `onToolsSync` callback fire once per group of changes, with the same final tool list.
- `syncToolsWithServer()` still sends immediately.
