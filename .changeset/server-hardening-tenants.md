---
"@owllayer/server": minor
---

Security: server tools, plugins and API keys can now be scoped per client app (#171).

- New `apiKeys` option on server tools and at plugin installation: the tool is only offered to, and only runs for, those API keys. Without it, a tool stays available to every key.
- New `allowedOrigins` per API key (`server.addApiKey(key, { allowedOrigins })`, admin API, SQLite and MongoDB stores): connections from another origin, or without an `Origin` header, are rejected.
- Session ids are full UUIDs.
