---
"@owllayer/server": patch
---

Fix HITL approvals for high/critical client tools when a live voice session is active: the tool call is now always forwarded to the client so the approval UI appears, and the live provider only receives a single response keyed by its own call id (#72).
