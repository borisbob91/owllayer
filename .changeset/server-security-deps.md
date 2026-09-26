---
"@owllayer/server": patch
---

Security: the server no longer installs dependencies with known vulnerabilities (#136).

- `bcrypt` 6: prebuilt binaries, no more `@mapbox/node-pre-gyp` and its vulnerable `tar` (critical). Same API, Node.js 18 or later.
- Prisma 7.10 (`@prisma/client`, `@prisma/adapter-pg`, `prisma` CLI).
- `ws` 8.22 minimum.
