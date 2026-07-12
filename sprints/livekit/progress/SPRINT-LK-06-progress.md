# Sprint LK-06 progress - Dashboard Ops LiveKit

Date prepared: 2026-07-10
Branch: `feat/feature-35-livekit-optional-runtime`
Base sprint: `sprints/livekit/SPRINT-LK-06-dashboard-ops.md`
Status: closed; reviewer-approved.

## Objective

Expose LiveKit operational state in the DomOS dashboard without turning the admin UI into a lab.

The dashboard should help an operator configure and monitor the essentials of the agent already in place:

- whether LiveKit is configured;
- available realtime/TTS/STT providers and runtime voices;
- active rooms and linked DomOS sessions;
- agent participant identity;
- AgentSession state and useful bridge events;
- provider errors, latency and cost when available;
- DomOS tool surface exposed to the bridge.

## Current-state evidence

- Dashboard UI lives in `packages/ui/src/dashboard` and uses Preact.
- `DashboardPanel.tsx` routes pages through hash navigation.
- `Layout.tsx` owns the sidebar; current pages are Status, Sessions, Tools, API Keys, Agents, Configuration, Lines and Metrics.
- `api.ts` is the central admin HTTP client and already authenticates requests with a Bearer token stored in sessionStorage.
- `StatusPage.tsx` already displays server health, active agents and admin events.
- `CapabilitiesPage.tsx` already displays LLM, live audio, STT, TTS and runtime voice preferences.
- `SessionDetailPage.tsx` already displays one DomOS session, conversation, tools and graph metrics.
- `ToolsPage.tsx` already distinguishes mounted client tools, effective LLM tools and ignored collisions.
- `LinesPage.tsx` is virtual-lines specific and should not be mixed with LiveKit rooms except through explicit links later.
- `AdminAPI` currently has a generic optional `bridge?: { getStats() }`, `GET /admin/bridge`, and `status.bridge`.
- `DomOSServer` does not currently inject a bridge instance into `AdminAPI`; LK-06 must decide whether to add a generic runtime hook or keep bridge observation at the demo/adapter level.
- `@domos/server` still must not import LiveKit directly.

## Scope allowed in LK-06

- `packages/server/src/admin/AdminAPI.ts`
- `packages/server/tests/AdminAPI.dashboard.test.ts`
- `packages/ui/src/dashboard/api.ts`
- `packages/ui/src/dashboard/pages/StatusPage.tsx`
- `packages/ui/src/dashboard/pages/CapabilitiesPage.tsx`
- `packages/ui/src/dashboard/pages/SessionDetailPage.tsx`
- `packages/ui/src/dashboard/pages/ToolsPage.tsx`
- `packages/ui/src/dashboard/components/*` if a small reusable dashboard component removes duplication.
- `sprints/livekit/progress/SPRINT-LK-06-progress.md`

## Scope read-only first

- `packages/server/src/core/DomOSServer.ts`
- `packages/adapter-livekit/src/bridge/*`
- `apps/demo-server/src/server.ts`
- `packages/ui/src/dashboard/DashboardPanel.tsx`
- `packages/ui/src/dashboard/components/Layout.tsx`

## Scope forbidden in LK-06

- No LiveKit direct import in `@domos/server`.
- No dashboard field may expose LiveKit API secret, provider secret, API key raw value or room token.
- No replacement of DomOS ADTP, Shadow Context, DomOSClient or ToolRouter.
- No client tool execution from dashboard.
- No telephony/SIP implementation; LK-08 owns that.
- No new standalone "LiveKit laboratory" page unless existing dashboard pages cannot carry the required ops information.

## Initial implementation direction

1. Prefer extending existing dashboard pages before adding a new route.
2. Put LiveKit summary on `StatusPage`: enabled, active rooms/bridges, linked sessions, last error if available.
3. Put provider/model/voice information on `CapabilitiesPage`, reusing the existing cards.
4. Put per-session room/participant information on `SessionDetailPage` when bridge stats can link a session id.
5. Put bridge-exposed tool surface notes on `ToolsPage`, using existing effective/ignored tools sections.
6. Keep `LinesPage` separate from LiveKit rooms.
7. Add typed API client methods in `api.ts` for bridge/livekit status.
8. Add AdminAPI tests for enabled=false, enabled=true mock, redaction, and status/dashboard payload shape.

## Decisions to make before implementation

- Keep `GET /admin/bridge` as the main dashboard endpoint for LK-06 instead of introducing `/admin/livekit/*` aliases now.
- Add `GET /admin/bridge/events` as a dedicated safe event stream summary, because raw bridge events can contain room handles, context snapshots, tool args or results.
- Keep `BridgeStats` generic and optional: active bridges, linked sessions, safe events, last error and optional provider/model/voice fields. Latency/cost stay reserved until real provider metrics exist.
- Do not inject an adapter-specific bridge in `DomOSServer` during this sprint; the AdminAPI remains generic with `bridge?: { getStats(); getEvents?() }`.
- Do not create a new dashboard page. Extend existing Status, Configuration, SessionDetail and Tools pages to keep the admin operational.

## Implementation delivered - 2026-07-10

- `AdminAPI` now normalizes bridge stats before returning them to the dashboard.
- `AdminAPI` now exposes `GET /admin/bridge/events` with summarized events only: type, sessionId, roomName, toolName, reason, message and toolCount.
- Raw bridge fields such as room objects, Shadow Context, tool args/results and provider secrets are not returned.
- `packages/ui/src/dashboard/api.ts` now has typed bridge stats/session/event contracts and `getBridge()` / `getBridgeEvents()` helpers.
- `StatusPage` shows LiveKit/AgentSession configured state, active rooms, linked sessions, last error and recent safe events.
- `CapabilitiesPage` shows a compact runtime media summary using existing live/STT/TTS provider capabilities and bridge state.
- `SessionDetailPage` shows the linked LiveKit room and agent participant for the active DomOS session.
- `ToolsPage` shows which active bridge sessions consume the effective DomOS tool surface.

## TODO

- [x] Wait for LK-05 reviewer re-approval.
- [x] Re-read `SPRINT-LK-06-dashboard-ops.md` after LK-05 closure.
- [x] Inspect current dashboard UI state again before edits.
- [x] Finalize endpoint strategy: `/admin/bridge` plus `/admin/bridge/events`.
- [x] Define redacted dashboard payload types.
- [x] Add AdminAPI tests before or with endpoint changes.
- [x] Extend `api.ts` typed client.
- [x] Extend Status/Capabilities/SessionDetail/Tools views without creating a lab-style console.
- [x] Run targeted UI/server builds and tests.
- [x] Request `code_reviewer_54` before LK-06 closure.

## Definition of Done

- [x] Dashboard clearly shows LiveKit configured vs not configured.
- [x] Active rooms/bridges are visible without secrets.
- [x] A DomOS session can display linked room and agent participant data when available.
- [x] Capabilities communicate that LiveKit can host multiple providers, not only Gemini.
- [x] Bridge events or errors are visible in an operator-safe way.
- [x] Virtual lines and LiveKit rooms remain separate concepts.
- [x] `@domos/server` still has no direct LiveKit dependency/import.
- [x] Tests cover disabled and enabled bridge/livekit dashboard payloads.
- [x] Builds/tests pass for touched packages.
- [x] `code_reviewer_54` approves the sprint.

## Validation run - 2026-07-10

- `pnpm --filter @domos/server test -- AdminAPI.dashboard.test.ts` passed with 7 tests.
- `pnpm --filter @domos/ui lint` passed.
- `pnpm --filter @domos/server build` passed.
- `pnpm --filter @domos/ui build` passed.
- `rg -n "LIVEKIT_API_SECRET|apiSecret|server-secret|server-key|livekit.*secret|room_token|lk_secret" packages/ui/src/dashboard packages/server/src/admin/AdminAPI.ts --glob '!dist/**' --glob '!node_modules/**'` returned no matches.
- `rg -n "@livekit|livekit-server-sdk|livekit-client" packages/server/src packages/server/package.json --glob '!dist/**' --glob '!node_modules/**'` returned no matches.

## Reviewer findings and fixes - 2026-07-10

- `code_reviewer_54` requested changes and did not approve the first LK-06 diff.
- High finding fixed: raw bridge error/tool failure messages are no longer forwarded to dashboard events or `lastError`.
- Medium finding fixed: optional `bridge.getEvents()` failures now degrade to `events: []` and do not break `/admin/status`, `/admin/bridge` or `/admin/bridge/events`.
- Added `redactBridgeText()` for non-error bridge strings and generic messages for `error` / `tool.call_failed` summaries.
- Changed bridge-event failure logging to avoid logging the raw thrown error.
- Added regression tests for secret-like strings embedded inside error messages.
- Added regression tests for `bridge.getEvents()` throwing while admin bridge/status endpoints still return `200`.
- Re-review finding fixed: `rawStats.lastError` is now converted to a generic redacted bridge error before it can reach `/admin/status` or `/admin/bridge`.
- Added regression test for `getStats().lastError` containing secret-like strings.

## Validation run - 2026-07-10 reviewer fixes

- `pnpm --filter @domos/server test -- AdminAPI.dashboard.test.ts` passed with 8 tests.
- `pnpm --filter @domos/ui lint` passed.
- `pnpm --filter @domos/server build` passed.
- `pnpm --filter @domos/ui build` passed.
- `rg -n "LIVEKIT_API_SECRET|apiSecret|server-secret|server-key|livekit.*secret|room_token|lk_secret|tok_secret" packages/ui/src/dashboard packages/server/src/admin/AdminAPI.ts --glob '!dist/**' --glob '!node_modules/**'` returns only the intentional redaction-helper regex in `AdminAPI.ts`.
- `rg -n "@livekit|livekit-server-sdk|livekit-client" packages/server/src packages/server/package.json --glob '!dist/**' --glob '!node_modules/**'` returned no matches.

## Validation run - 2026-07-10 lastError fix

- `pnpm --filter @domos/server test -- AdminAPI.dashboard.test.ts` passed with 9 tests.
- `pnpm --filter @domos/server build` passed.
- `code_reviewer_54` re-review approved LK-06 after the lastError redaction fix.

## Audio package check - 2026-07-10

- `packages/audio` was inspected with the workspace MCP before LK-06 closure.
- `@domos/audio` is a codec/format utility package: PCM encode/decode, WAV decode, Opus decode and audio MIME/format detection.
- Existing LiveKit integration already consumes it in `packages/adapter-livekit/src/live/audioMapping.ts` for PCM base64 decoding and MIME mapping.
- Angular voice capture already consumes `base64EncodeAudio`; playback still contains manual PCM decode logic and should be considered for a later client/audio cleanup, not LK-06.
- Decision: keep `@domos/audio` as a shared audio normalization dependency for adapters/clients. It must not become the LiveKit bridge runtime and must not receive LiveKit/provider secrets.

## Next step persisted

Next step: LK-06 is closed. Prepare LK-07 tests/docs/security progress from `sprints/livekit/SPRINT-LK-07-tests-docs-security.md` without implementation.
