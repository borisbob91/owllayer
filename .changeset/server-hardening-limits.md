---
"@owllayer/server": minor
---

Security: the server now bounds message sizes and rates, and runs one LLM turn at a time per session (#170).

- WebSocket messages are capped at 4 MB (`limits.maxMessageBytes`) and HTTP request bodies at 64 KB (413 above).
- Text inputs are capped at 8,000 characters, client tools per context update at `maxActiveTools` (30 by default; `limits.maxClientTools` can raise it but not lower it below `maxActiveTools`) and context data at 64 KB (`limits`).
- New `rateLimit` option: 100 messages per second and 20 user messages per minute per connection by default; `userInputsPerMinutePerKey` caps all connections of an API key (off by default, set it to cap your LLM cost).
- A user message received while the assistant is still answering is rejected with a clear error instead of starting a parallel turn. Long hybrid audio recordings may need a higher `maxMessageBytes`.
