---
"@owllayer/server": patch
---

A live session that reports an error is now closed when the server drops it, so the provider connection, its timers and its billing stop instead of running until the provider times out.
