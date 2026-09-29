---
"@owllayer/adapter-deepgram": patch
---

A Deepgram key refused when a websocket opens (Flux, Aura streaming, Voice Agent) is now reported with its HTTP status (`AUTH_FAILED` for 401/403, `QUOTA_EXCEEDED` for 402, and so on) instead of `REMOTE_CLOSED`, so callers do not retry a connection that cannot succeed.
