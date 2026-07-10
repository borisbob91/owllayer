# Sprint LK-06 progress - Dashboard Ops LiveKit

Date prepared: 2026-07-10
Branch: `feat/feature-35-livekit-optional-runtime`
Base sprint: `sprints/livekit/SPRINT-LK-06-dashboard-ops.md`
Status: prepared only; implementation must wait until LK-05 reviewer re-approval.

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

- Whether LK-06 keeps `GET /admin/bridge` as the main dashboard endpoint or introduces `/admin/livekit/*` aliases.
- Whether `BridgeStats` should add `events`, `lastError`, `provider`, `latencyMs` and `cost` now or reserve those for later providers.
- How the runtime bridge instance is injected into `AdminAPI` without coupling `@domos/server` to `@domos/adapter-livekit`.
- Whether a separate `LiveKitPage` is justified or whether Status/Capabilities/SessionDetail cover the operator need better.

## TODO

- [ ] Wait for LK-05 reviewer re-approval.
- [ ] Re-read `SPRINT-LK-06-dashboard-ops.md` after LK-05 closure.
- [ ] Inspect current dashboard UI state again before edits.
- [ ] Finalize endpoint strategy: `/admin/bridge` only vs `/admin/livekit/*`.
- [ ] Define redacted dashboard payload types.
- [ ] Add AdminAPI tests before or with endpoint changes.
- [ ] Extend `api.ts` typed client.
- [ ] Extend Status/Capabilities/SessionDetail/Tools views without creating a lab-style console.
- [ ] Run targeted UI/server builds and tests.
- [ ] Request `code_reviewer_54` before LK-06 closure.

## Definition of Done

- [ ] Dashboard clearly shows LiveKit configured vs not configured.
- [ ] Active rooms/bridges are visible without secrets.
- [ ] A DomOS session can display linked room and agent participant data when available.
- [ ] Capabilities communicate that LiveKit can host multiple providers, not only Gemini.
- [ ] Bridge events or errors are visible in an operator-safe way.
- [ ] Virtual lines and LiveKit rooms remain separate concepts.
- [ ] `@domos/server` still has no direct LiveKit dependency/import.
- [ ] Tests cover disabled and enabled bridge/livekit dashboard payloads.
- [ ] Builds/tests pass for touched packages.
- [ ] `code_reviewer_54` approves the sprint.

## Next step persisted

Next step: after LK-05 re-approval, start LK-06 by finalizing the endpoint strategy and writing the AdminAPI dashboard tests first.
