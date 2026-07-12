# Sprint LK-08 progress - Telephony Deploy

Date prepared: 2026-07-10
Branch: `feat/feature-35-livekit-optional-runtime`
Base sprint: `sprints/livekit/SPRINT-LK-08-telephony-deploy.md`
Status: docs/contracts slice closed; adapter usage documentation corrected; no telephony implementation.

## Objective

Prepare the production, telephony, scaling and observability layer for the optional LiveKit runtime.

LK-08 must not implement telephony until its scope is explicitly started. The sprint file itself says: `PS: ne pas implmeter se la feature telephony!`

## Sprint boundary

- Do not replace DomOS ADTP, Shadow Context, ToolRouter/HITL or DomOSClient.
- Do not add LiveKit dependencies to `@domos/server`.
- Do not expose LiveKit/API/provider secrets to the dashboard or client.
- Do not make phone/SIP behavior look delivered before it is implemented and verified.
- Keep `@domos/audio` as codec/format utility only, not a room runtime or bridge owner.

## Package cartography to preserve

- `packages/adapter-livekit`: only package allowed to own LiveKit runtime, SIP/telephony helpers, deployment helpers and provider mappings.
- `packages/server`: generic DomOS sessions, bridge snapshots, bridge tool routing and admin endpoints. No direct LiveKit imports.
- `packages/ui`: operations dashboard. It can show safe room/call/session state, not raw context, tokens or tool payloads.
- `packages/react`: optional LiveKit room client hook for web demo/client usage.
- `packages/audio`: PCM/base64, WAV, Opus and MIME/format utilities reused by adapter/client code.
- `apps/demo-server`: self-host wiring reference for token endpoint, bridge startup and future deploy docs.
- `apps/demo`: browser usage reference for DomOSClient + optional LiveKit room flow.

## Target files from sprint brief

- `packages/adapter-livekit/src/telephony/*`
- `packages/adapter-livekit/src/deploy/*`
- `packages/adapter-livekit/src/observability/*`
- `packages/server/src/admin/AdminAPI.ts`
- `packages/ui/src/dashboard/pages/StatusPage.tsx`
- `packages/ui/src/dashboard/pages/SessionDetailPage.tsx`
- `apps/demo-server/src/server.ts`
- `docs/livekit/telephony.md` or docs-site equivalent

## TODO

- [x] Read the active Codex objective file before continuing this phase.
- [x] Verify the current sprint chain status after LK-07 commit.
- [x] Update the central agent register in `framework/rapport/agent-register.md` for LK-04 through LK-07 review/explorer missions.
- [x] Decide whether LK-08 is documentation/planning only or starts a minimal non-SIP deploy/observability slice.
- [x] Define the room/call/session data model without leaking secrets.
- [x] Define how a phone call creates or attaches to a DomOS session.
- [x] Define tool exposure rules for sessions without UI clients.
- [x] Define dashboard fields for rooms/calls/transcripts with redaction rules.
- [x] Define retention/export policy for transcripts and traces.
- [x] Define self-host vs LiveKit Cloud deploy differences.
- [x] Request `code_reviewer_54` once a concrete LK-08 slice is implemented.

## Definition of Done

- [ ] An incoming/outgoing call or room can be linked to a DomOS session, or the gap is explicitly documented.
- [ ] Sessions without UI expose only server tools.
- [ ] Sessions with UI expose mounted client tools and remove them on component unmount.
- [ ] Dashboard shows call/room/session state without secrets.
- [ ] Transcript and trace retention policy is explicit.
- [ ] Self-host and LiveKit Cloud deployment are documented separately.
- [ ] No direct LiveKit imports are introduced in `@domos/server`.

## Goal continuation audit - 2026-07-10

Current evidence from the repository:

- LK-00 through LK-07 have progress files with completed DoD and `code_reviewer_54` closure.
- LK-07 was committed as `e84a3ab test(livekit): close security docs readiness`.
- The requested `feature-22` branch number was not used because `features/README.md` already records feature 22 for Google adapter event alignment; LK-00 documents the collision and the current branch is `feat/feature-35-livekit-optional-runtime`.
- `@domos/server` still must remain free of direct LiveKit imports. Last LK-07 validation scanned `packages/server/src` and `packages/server/package.json` with no LiveKit matches.
- `@domos/audio` was reviewed with the workspace MCP. It remains a codec/format utility used by LiveKit audio mapping and Angular capture; it must not become the LiveKit bridge runtime.
- `framework/rapport/agent-register.md` now records LK-04, LK-05, LK-06 and LK-07 agent missions. This file is outside the `domos` Git repository and is a local report artifact, not part of the commit history.

Current gaps by design:

- LK-08 is prepared but not implemented.
- SIP/telephony must not be implemented yet because `SPRINT-LK-08-telephony-deploy.md` explicitly says not to implement the telephony feature.
- Room/session quotas, transcript retention/export policy and deploy split self-host vs LiveKit Cloud remain LK-08 planning targets.
- Dashboard UI still has no dedicated component harness; this is documented in LK-07 and `rapport/livekit.md`.

## Implementation delivered - docs/contracts slice - 2026-07-10

- Added `docs/livekit/telephony-deploy-observability.md` as the root documentation contract for LK-08.
- Added `apps/docs-site/src/content/docs/livekit/telephony-deploy-observability.mdx` as the French docs-site page.
- Linked the new page from `apps/docs-site/astro.config.mjs`, `apps/docs-site/src/content/docs/livekit.mdx` and `docs/LIVEKIT.md`.
- Scope is documentation and architecture contracts only. No SIP/telephony runtime code was added.
- Official LiveKit docs checked during this slice:
  - Agents overview: `https://docs.livekit.io/agents/`
  - Agent deployment: `https://docs.livekit.io/deploy/agents/`
  - Observability: `https://docs.livekit.io/deploy/observability/`
  - Telephony: `https://docs.livekit.io/telephony/`
  - Self-host deployment: `https://docs.livekit.io/transport/self-hosting/deployment/`

## Validation run - docs/contracts slice - 2026-07-10

- `git diff --check` passed for the LK-08 docs/contracts files.
- `rg -n "@livekit|livekit-server-sdk|livekit-client" packages/server/src packages/server/package.json --glob '!dist/**' --glob '!node_modules/**'` returned no matches.
- `pnpm --filter @domos/docs-site build` passed and generated `/livekit/telephony-deploy-observability/`.

## Reviewer approval - docs/contracts slice - 2026-07-10

- `code_reviewer_54` reviewed the LK-08 docs/contracts slice.
- Finding fixed: clarified the French docs-site sentence for `DomOSBridgeSessionSnapshot` as a minimal filtered snapshot.
- Verdict: no blocking findings; this docs/contracts slice can be closed.

## Documentation correction - adapter usage first - 2026-07-10

User feedback: the LiveKit documentation was too architecture-oriented and did not clearly answer how to use the adapter.

Scope delivered:

- Rewrote `packages/adapter-livekit/README.md` around concrete usage:
  - install `@domos/adapter-livekit`;
  - configure server-only env vars;
  - pass `GeminiLiveAdapter` into `DomOSServer.live`;
  - pass `GeminiTTSService` into `DomOSServer.tts`;
  - expose a server token endpoint;
  - use `useDomOSLiveKitRoom` from React;
  - optionally use `DomOSLiveKitAgentBridge` for `AgentSession` tool calls.
- Rewrote `docs/LIVEKIT.md` as a concise usage guide.
- Rewrote `apps/docs-site/src/content/docs/livekit.mdx` so the public docs page starts with adapter usage, not LK-08 architecture.
- Kept `@domos/audio` out of this user-facing adapter usage slice.

Validation:

- `pnpm --filter @domos/docs-site build` passed and generated `/livekit/index.html`.

## Documentation-site correction - usage guide in LiveKit folder - 2026-07-10

User feedback: the public docs must follow the existing React documentation pattern and answer how a developer uses the adapter before explaining advanced architecture.

Scope delivered:

- Added `apps/docs-site/src/content/docs/livekit/readme.md` as the adapter overview and package map.
- Added `apps/docs-site/src/content/docs/livekit/getting-started.mdx` as the executable usage guide:
  - install server and React packages;
  - configure server-only environment variables;
  - pass `GeminiLiveAdapter` to `DomOSServer.live`;
  - create the token endpoint with session ownership checks;
  - connect React with `useDomOSLiveKitRoom`;
  - use `GeminiTTSService` or `DomOSLiveKitAgentBridge` only when needed.
- Updated `apps/docs-site/astro.config.mjs` with a dedicated LiveKit documentation group.
- Removed the duplicate root `apps/docs-site/src/content/docs/livekit.mdx` page so the docs loader has one canonical page per LiveKit route.
- Kept `telephony-deploy-observability.mdx` as the advanced deployment and future telephony contract.
- Added links to the official LiveKit Gemini Live, Gemini TTS and models documentation.

Validation:

- `pnpm --filter @domos/docs-site build` passed with exit code 0.
- Generated routes include `/livekit/readme/`, `/livekit/getting-started/` and `/livekit/telephony-deploy-observability/`.
- Pagefind indexed the generated documentation without a slug or syntax warning.

## Next step persisted

Next step: ask `code_reviewer_54` to review only the new docs-site usage pages against the real adapter exports and demo flow, then decide whether LK-08 continues with observability helpers or deployment docs refinement. Do not start SIP/telephony implementation until explicitly scoped.
