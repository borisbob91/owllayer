---
"@owllayer/server": minor
---

Security: weak admin passwords are rejected in production, and server tool arguments are validated before the handler runs (#172).

- The admin password must have at least 12 characters and must not be a well-known value. With `NODE_ENV=production`, a weak password stops the server from starting; otherwise it logs a warning.
- LLM arguments are checked against the server tool's declared `parameters` (types, `required`, `enum`); invalid arguments never reach the handler.
- A server tool registered without `risk` logs a warning, since it runs without human approval. The default stays `'none'` for now.
