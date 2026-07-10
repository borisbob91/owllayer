# Sprint LK-07 progress - Tests Docs Security

Date prepared: 2026-07-10
Branch: `feat/feature-35-livekit-optional-runtime`
Base sprint: `sprints/livekit/SPRINT-LK-07-tests-docs-security.md`
Status: prepared; implementation not started.

## Objective

Close the quality, documentation, security and release-readiness gates for the optional LiveKit runtime.

LK-07 must make the integration publishable without leaking secrets and without promising behavior that is not implemented.

## Sprint boundary

LK-07 is not a feature-expansion sprint. It must validate and document what LK-02 through LK-06 delivered:

- optional LiveKit runtime configuration;
- Gemini TTS service;
- Gemini Live adapter;
- AgentSession bridge;
- frontend room demo flow;
- dashboard operational visibility.

## Package cartography to preserve

- `packages/core`: owns DomOS contracts, tool calls, live adapter types and Neural-DOM Binding concepts.
- `packages/server`: owns DomOSServer, AdminAPI, sessions, tools and dashboard endpoints. It must not import LiveKit directly.
- `packages/client`: owns DomOSClient browser/runtime behavior and must not receive provider secrets.
- `packages/adapter-livekit`: owns optional LiveKit/Gemini runtime integration, AgentSession bridge and provider-specific mappings.
- `packages/audio`: shared audio codec and format utility package. It provides PCM encode/decode, WAV decode, Opus decode and MIME/format detection. It is already consumed by Angular voice capture and LiveKit audio mapping. It must remain a normalization dependency, not a bridge runtime or secret holder.
- `packages/angular`: Angular SDK usage surface. It captures voice through `@domos/audio`; playback still has manual PCM decode logic that can be cleaned up later.
- `packages/ui`: dashboard/admin UI. It can display redacted operational LiveKit state but must not expose config secrets or execute tools.
- `apps/demo-server`: real SDK usage reference for server setup.
- `apps/demo`: real SDK usage reference for client/demo behavior.

## Decisions inherited from previous sprints

- LiveKit remains optional and provider-neutral; Gemini is one implementation, not the architecture.
- DomOS ADTP, Shadow Context, ToolRouter/HITL and DomOSClient remain the source of truth.
- Tool calls initiated through LiveKit must still execute through DomOS flow.
- Dashboard is an operations dashboard, not a laboratory.
- Secrets stay server-side. Dashboard payloads must be whitelisted and redacted.
- `@domos/server` must remain free of direct `@livekit/*`, `livekit-server-sdk` or `livekit-client` imports.

## Target files from sprint brief

- `packages/adapter-livekit/tests/**`
- `packages/server/tests/**`
- `packages/ui/src/dashboard/**/__tests__` if a stable UI test pattern exists
- `apps/docs-site/src/content/docs/**`
- `docs/CONCEPTS.md`
- `framwork.md`
- `README.md`
- `.env.example` if present
- `rapport/livekit.md`

## Tests to assess before edits

- `GeminiTTSService.synthesize()` with a mock provider.
- `GeminiTTSService.getCapabilities()`.
- `GeminiLiveAdapter.createSession()` with mocks.
- `LiveSession.sendToolResponse()` mapping.
- `DomOSLiveKitAgentBridge` client-side tool-call path.
- `DomOSLiveKitAgentBridge` server-side tool-call path.
- Session close cleans AgentSession/room state.
- Dashboard endpoints do not leak secrets.
- `enabled=false` stays clean when LiveKit is not configured.
- `@domos/audio` PCM encode/decode and audio mapping remain compatible with adapter/client usage.

## Security gates

- [ ] No secret in frontend or dashboard payloads.
- [ ] Room token TTL behavior is documented and technically consistent with deployed client/server constraints.
- [ ] Room token binding to DomOS session/API key is documented or explicitly deferred with rationale.
- [ ] No raw DomOS API key in LiveKit metadata.
- [ ] Logs do not expose provider API keys, room tokens or raw tool payloads.
- [ ] CORS/allowed origins are documented.
- [ ] Room/session quota behavior is documented or explicitly deferred with rationale.
- [ ] DomOS revocation closing linked rooms is documented or explicitly deferred with rationale.
- [ ] Dashboard admin auth remains required.

## TODO

- [ ] Re-read LK-02 through LK-06 progress files and final diffs.
- [ ] Map existing tests before adding new ones.
- [ ] Identify which LK-07 tests are already covered and which are missing.
- [ ] Add focused adapter tests.
- [ ] Add or extend server/dashboard security tests.
- [ ] Decide whether UI dashboard tests are feasible in the current test stack; document limitation if not.
- [ ] Update public docs and architecture docs without overstating provider support.
- [ ] Update `.env.example` only if the repository has an existing pattern for it.
- [ ] Write or update `rapport/livekit.md` with architecture decisions and known limits.
- [ ] Run required builds/tests.
- [ ] Request `code_reviewer_54` before LK-07 closure.

## Definition of Done

- [ ] Adapter tests pass.
- [ ] Server tests pass.
- [ ] Dashboard tests pass, or the absence of a dashboard test harness is documented with concrete remaining risk.
- [ ] `pnpm --filter @domos/adapter-livekit build` passes.
- [ ] `pnpm --filter @domos/server build` passes.
- [ ] `pnpm --filter @domos/ui build` passes.
- [ ] Secret leak scans pass for adapter, server admin and dashboard UI.
- [ ] Docs clearly explain LiveKit as optional runtime and multi-provider-capable integration.
- [ ] Docs distinguish DomOSServer, LiveKit AgentSession, DomOSClient and `@domos/audio`.
- [ ] Known limitations are explicit and dated.
- [ ] `code_reviewer_54` approves the sprint.

## Next step persisted

Next step: start LK-07 implementation by reading LK-02 through LK-06 progress files, then mapping current tests before editing any source files.
