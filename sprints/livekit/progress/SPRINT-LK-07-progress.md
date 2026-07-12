# Sprint LK-07 progress - Tests Docs Security

Date prepared: 2026-07-10
Branch: `feat/feature-35-livekit-optional-runtime`
Base sprint: `sprints/livekit/SPRINT-LK-07-tests-docs-security.md`
Status: closed; `code_reviewer_54` approved.

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

- [x] No secret in frontend or dashboard payloads.
- [x] Room token TTL behavior is documented and technically consistent with deployed client/server constraints.
- [x] Room token binding to DomOS session/API key is documented or explicitly deferred with rationale.
- [x] No raw DomOS API key in LiveKit metadata.
- [x] Logs do not expose provider API keys, room tokens or raw tool payloads.
- [x] CORS/allowed origins are documented.
- [x] Room/session quota behavior is documented or explicitly deferred with rationale.
- [x] DomOS revocation closing linked rooms is documented or explicitly deferred with rationale.
- [x] Dashboard admin auth remains required.

## Implementation delivered - 2026-07-10

- Added `packages/adapter-livekit/src/tokens/LiveKitTokenCors.ts` with testable CORS allowlist helpers for LiveKit token endpoints.
- Updated `apps/demo-server/src/server.ts` so `/domos/livekit/token` no longer reflects arbitrary browser origins. Local Vite origins remain allowed by default; deployed origins use `DOMOS_LIVEKIT_ALLOWED_ORIGINS`.
- Added `packages/adapter-livekit/tests/LiveKitTokenCors.test.ts` for parsing, default allowlist rejection and explicit wildcard behavior.
- Extracted `apps/demo-server/src/livekitTokenEndpoint.ts` and added `packages/adapter-livekit/tests/LiveKitTokenEndpoint.test.ts` to cover the real endpoint path.
- Added `DomOSServer.isAgentBridgeSessionOwnedByApiKey()` so token endpoints can verify session ownership without exposing raw API keys in bridge snapshots.
- Updated `packages/server/.env.example` with server-only LiveKit variables and `DOMOS_LIVEKIT_ALLOWED_ORIGINS`.
- Updated `packages/adapter-livekit/README.md`, `docs/LIVEKIT.md`, `apps/docs-site/src/content/docs/livekit.mdx`, `docs/CONCEPTS.md`, `framwork.md` and `README.md`.
- Added `rapport/livekit.md` with architecture, red/orange findings, gates and actions.

## Explorer review - 2026-07-10

`long_explorer_spark` reviewed LK-07 read-only and found:

- Dashboard UI has no component test harness. Decision: document as concrete limitation because `@domos/ui` has no test script today; validation uses AdminAPI redaction tests plus `@domos/ui build`.
- Token endpoint CORS needed proof. Action: added adapter CORS helper tests and wired demo-server to the helper.
- Revocation -> room closure is covered by separate AdminAPI/session and bridge cleanup tests, not as one end-to-end chain. Decision: document as partial and keep as future integration-test hardening.
- Room/session quota policy was not explicit. Action: documented as deployment policy to enforce near the token endpoint or room provisioner before broad production rollout.
- Non-Gemini provider example was missing. Action: added provider-neutral extension example without claiming another provider is implemented.
- README dashboard roadmap was stale. Action: marked dashboard admin as delivered.

## Reviewer findings and fixes - 2026-07-10

- `code_reviewer_54` did not approve the first LK-07 diff.
- High finding fixed: `/domos/livekit/token` now rejects a valid API key for another key's session before minting a LiveKit room token.
- The ownership check is performed by `DomOSServer.isAgentBridgeSessionOwnedByApiKey(sessionId, apiKey)`; bridge snapshots still do not expose the raw API key.
- Medium finding fixed: endpoint-level tests now cover allowed origin + owning key, disallowed origin, invalid key, unknown session, cross-key session rejection and allowed preflight.

## Audio package review - 2026-07-10

- Reviewed `packages/audio` with the local workspace MCP before closing LK-07.
- `@domos/audio` exposes PCM base64 encode/decode, WAV decode, Opus decode and MIME/format detection.
- It is already used by `packages/adapter-livekit/src/live/audioMapping.ts` for PCM/MIME normalization and by Angular voice capture.
- React, Vue, Svelte and browser voice paths still contain manual PCM encode/decode logic. This is not a blocker for LK-07, but future client hardening should consolidate playback/capture helpers around `@domos/audio`.
- Decision: LiveKit must keep using `@domos/audio` only as a codec/format utility. It must not move room runtime, bridge lifecycle or secrets into `@domos/audio`.

## TODO

- [x] Re-read LK-02 through LK-06 progress files and final diffs.
- [x] Map existing tests before adding new ones.
- [x] Identify which LK-07 tests are already covered and which are missing.
- [x] Add focused adapter tests.
- [x] Add or extend server/dashboard security tests.
- [x] Decide whether UI dashboard tests are feasible in the current test stack; document limitation if not.
- [x] Update public docs and architecture docs without overstating provider support.
- [x] Update `.env.example` only if the repository has an existing pattern for it.
- [x] Write or update `rapport/livekit.md` with architecture decisions and known limits.
- [x] Run required builds/tests.
- [x] Request `code_reviewer_54` before LK-07 closure.

## Definition of Done

- [x] Adapter tests pass.
- [x] Server tests pass.
- [x] Dashboard tests pass, or the absence of a dashboard test harness is documented with concrete remaining risk.
- [x] `pnpm --filter @domos/adapter-livekit build` passes.
- [x] `pnpm --filter @domos/server build` passes.
- [x] `pnpm --filter @domos/ui build` passes.
- [x] Secret leak scans pass for adapter, server admin and dashboard UI.
- [x] Docs clearly explain LiveKit as optional runtime and multi-provider-capable integration.
- [x] Docs distinguish DomOSServer, LiveKit AgentSession, DomOSClient and `@domos/audio`.
- [x] Known limitations are explicit and dated.
- [x] `code_reviewer_54` approves the sprint.

## Validation run - 2026-07-10

- `pnpm --filter @domos/adapter-livekit test` passed: 6 files, 42 tests before endpoint extraction.
- `pnpm --filter @domos/adapter-livekit lint` passed.
- `pnpm --filter @domos/server test -- AdminAPI.dashboard.test.ts DomOSServer.server-tools.test.ts` passed: 2 files, 15 tests.
- `pnpm --filter @domos/adapter-livekit build` passed.
- `pnpm --filter @domos/server build` passed.
- `pnpm --filter @domos/ui build` passed.
- `pnpm --filter @domos/demo-server build` passed.
- `pnpm --filter @domos/docs-site build` passed and generated `/livekit/`.
- `rg -n "@livekit|livekit-server-sdk|livekit-client" packages/server/src packages/server/package.json --glob '!dist/**' --glob '!node_modules/**'` returned no matches.
- Secret scan over dashboard/admin/demo/adapter paths returned only expected server-side config references and redaction helper patterns; no client-side secret literal or dashboard leak was found.

## Validation run - 2026-07-10 reviewer fixes

- `pnpm --filter @domos/adapter-livekit test -- LiveKitTokenEndpoint.test.ts LiveKitTokenCors.test.ts` passed: 2 files, 9 tests.
- `pnpm --filter @domos/server test -- DomOSServer.server-tools.test.ts` passed.
- `pnpm --filter @domos/server build` passed.
- `pnpm --filter @domos/demo-server build` passed.
- `pnpm --filter @domos/adapter-livekit build` passed.
- `pnpm --filter @domos/audio test` passed: 2 files, 26 tests.
- `pnpm --filter @domos/audio lint` passed.

## Reviewer approval - 2026-07-10

- `code_reviewer_54` re-reviewed the LK-07 diff after ownership and endpoint-test fixes.
- Verdict: no blocking findings; LK-07 can be closed.
- Residual non-blockers remain documented: room/session quotas are deployment policy and dashboard UI still lacks a dedicated component harness.

## Next step persisted

Next step: prepare LK-08 telephony/deploy without implementation. LK-08 must keep telephony as planned work until its own scope is explicitly started.
