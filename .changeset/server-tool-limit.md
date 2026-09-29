---
"@owllayer/server": minor
---

New `maxActiveTools` option (default 30, must be a positive integer, validated at server start) and it is now announced in `HANDSHAKE_ACK` (#152).

- A `CONTEXT_UPDATE` that would push the tool count above the limit keeps the previous tool list — no partial session — while URL, title, and context still update, and a `SYSTEM_EVENT` of kind `error` is sent back.
- Restored sessions keep the server's configured limit.
