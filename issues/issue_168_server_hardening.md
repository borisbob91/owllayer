# GitHub issue #168: Server hardening

**GitHub issue**: https://github.com/borisbob91/owllayer/issues/168 (epic)
**Sub-issues**:
- #169 critical: session isolation, plugin sandbox, WebRTC signaling
- #170 high: bound message sizes and rates
- #171 high: tenant isolation per API key
- #172 high: secure defaults for the admin password and server tools

**Status**: implemented on branch `issue-168-server-hardening`, one commit per sub-issue
**Domain**: server (`packages/server`), plus the demo server configuration (`apps/demo-server`)

## Summary

I reviewed `@owllayer/server` for one scenario: one server serving several client apps (several API keys, several SDKs) in production.

The base is solid:
- AITP messages are validated against schemas;
- SQL queries are parameterized;
- the admin password is hashed with bcrypt;
- admin tokens are random;
- client tools cannot shadow server tools.

Four areas needed work before I can recommend that setup:

1. **Isolation between sessions and API keys.** Approvals and tool results were matched by call id only. Server tools were visible to every key. Origins could only be restricted globally. Session ids were 32 bits.
2. **Limits.** Message sizes, HTTP bodies, message rates and parallel LLM turns were unbounded. Browser API keys are public, so the server has to protect itself and the integrator's LLM budget.
3. **Plugin isolation.** The `untrusted` plugin mode ran handlers in a worker thread, which shares the server process.
4. **Defaults.** The demo shipped a default admin password, server tool arguments were not validated, and server tools default to `risk: 'none'`.

## Changes per sub-issue

### #169 — Critical

| Area | Before | After |
|---|---|---|
| Server tool approval (`APPROVAL_RESPONSE`) | matched by call id | accepted only from the session that received the request; purged when the session closes |
| Client tool result (`TOOL_RESULT`), approval timeout extension | matched by call id | accepted only from the connection that received the `TOOL_CALL` |
| Tool call ids | `call_` + 8 hex characters | `call_` + full UUID |
| `untrusted` plugin handlers | `worker_thread` in the server process | separate Node.js process with the Node permission model: filesystem, child processes, workers and native addons denied unless declared |
| WebRTC signaling | client could send the connection id; unbounded body; peer connection created before authentication | server-generated UUID only; 64 KB body; origin and API key checked first (401) |

Measured cost of the new plugin executor: about 37 ms per call, against 60 ms for the previous worker thread.

### #170 — Sizes and rates

| Limit | Default | Option |
|---|---|---|
| WebSocket message | 4 MB | `limits.maxMessageBytes` |
| HTTP body (admin API, virtual lines, signaling) | 64 KB, 413 above | — (`readBody` helper) |
| Text input | 8,000 characters | `limits.maxTextInputChars` |
| Client tools per `CONTEXT_UPDATE` | `maxActiveTools` (30), never lower | `limits.maxClientTools` |
| Context data | 64 KB | `limits.maxContextBytes` |
| Messages per connection | 100 per second | `rateLimit.messagesPerSecond` |
| User messages per connection | 20 per minute | `rateLimit.userInputsPerMinute` |
| User messages per API key | off | `rateLimit.userInputsPerMinutePerKey` |

A session also runs **one LLM turn at a time**: a user message received while a turn is running gets a clear error instead of starting a parallel turn.

### #171 — Tenant isolation

- `apiKeys` on server tools and at plugin installation. The check happens both in the tool surface sent to the LLM and at execution time (text, voice, bridge, after approval). The option is never sent to the LLM or to the browser.
- `allowedOrigins` per API key, stored in SQLite (new column, added to existing databases), MongoDB and memory. It is available through `server.addApiKey(key, { allowedOrigins })` and the admin API. With it, other origins and connections without `Origin` are rejected.
- Session ids are full UUIDs. With a persistent agent memory store, short ids could collide and load another session's memory.

### #172 — Secure defaults

- **Admin password**: at least 12 characters and not a well-known value. With `NODE_ENV=production`, a weak password stops the server from starting; otherwise it logs a warning.
- **Demo server**: no default admin password. Without `ADMIN_PASSWORD`, the admin API and the dashboard are disabled, and the startup banner says so.
- **Server tool arguments**: validated against the declared `parameters` (types, `required`, `enum`, nested objects, array items) before the handler runs.
- **Server tool risk**: a server tool without `risk` logs a warning. The default stays `'none'` in this release.

## Decisions

- **Optional sender parameters on `ToolRouter`.** `handleToolResult` and `extendTimeoutForApproval` take an optional sender connection, to keep the public `ToolRouter` API compatible. `OwlLayerServer` always passes it.
- **Per-key user message cap off by default.** A fixed default would block legitimate traffic on busy sites. The release notes tell integrators to set it.
- **One turn at a time.** While a client tool waits for a HITL approval (up to 120 s), a new typed message is rejected instead of running in parallel. I prefer a consistent history and no double billing.
- **Plugin sandbox limits.** Node 22 has no network permission, so network stays open for `untrusted` handlers. The plugin module and its `setup()` still run in the server process. Both are documented, and a full sandbox is a follow-up.
- **`risk` default kept to `'none'`.** Moving it to `'high'` would make every server tool without `risk` ask for approval. I'll decide for the next minor release.

## Verification

- 19 new tests:
  - `OwlLayerServer.isolation.test.ts`;
  - `WorkerExecutor.test.ts`;
  - `security.limits.test.ts`;
  - `security.tenantIsolation.test.ts`;
  - `security.defaults.test.ts`.
- 14 of the 16 behavior tests fail on the code before the change. The 2 others test the new helpers themselves.
- One existing assertion changed: `OwlLayerServer.hitl.test.ts` now also expects the sender connection.
- `pnpm --filter @owllayer/server build lint test`: 227 tests pass.
- `pnpm build:packages && pnpm test:packages`: no change outside the server. The plugin tests and both demo servers build.
- Local checks against a built server with a fake LLM:
  - approvals from another key are ignored;
  - a 20 MB message closes the connection (1009) and nothing reaches the LLM;
  - a burst of 200 messages gives at most 20 LLM calls per minute;
  - a 50 MB admin login body gets 413 without memory growth;
  - an `untrusted` handler cannot read files or run commands.
- **Still to check**: WebRTC signaling with `wrtc` installed. The module is not a dependency of the repository.

## Out of scope (follow-up)

- Per-key token or cost quotas; short-lived session tokens issued by the integrator's backend.
- Network restriction for plugins, and running plugin `setup()` in the sandbox.
- Authentication before the WebSocket upgrade (`verifyClient`).
- Connection limit in anonymous mode (all anonymous clients share one counter).
- Per-key system prompt in voice mode.
- LLM adapter pending state keyed by session, and agent memory scoped by API key.
- Trusted proxy headers for the admin login rate limit.
- Virtual line acquisition limits.
- Generic error messages to clients.
- Dashboard security headers.
- Hashed API keys with separate public and secret keys.
- Documentation updates: `SECURITY.md`, the plugin guide (what `untrusted` guarantees), and the server deployment page (`limits`, `rateLimit`, per-key origins).
