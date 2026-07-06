# Sprint LK-00 progress - Architecture contract DomOS x LiveKit

Date started: 2026-07-06  
Branch: `feat/feature-35-livekit-optional-runtime`  
Snapshot before branch: `6821c64 chore: snapshot current project state`  
Active sprint file: `sprints/livekit/SPRINT-LK-00-architecture-contract.md`

## Objective

Define and lock the integration contract before any LiveKit implementation:

- LiveKit is an optional realtime media / AgentSession layer.
- DomOS keeps Neural-DOM Binding, Shadow Context, ADTP, ToolRouter, HITL and dashboard ownership.
- Existing DomOS voice contracts must be reused instead of duplicated.
- The next implementation sprint must be able to create `packages/adapter-livekit` without rediscovering architecture.

## Current-state evidence read

- `sprints/livekit/README.md`
- `sprints/livekit/SPRINT-LK-00-architecture-contract.md`
- `sprints/livekit/SPRINT-LK-01-package-foundation.md`
- `sprints/livekit/SPRINT-LK-02-gemini-tts-service.md`
- `sprints/livekit/SPRINT-LK-03-realtime-live-adapters.md`
- `sprints/livekit/SPRINT-LK-04-agent-session-bridge.md`
- `sprints/livekit/SPRINT-LK-05-client-room-frontends.md`
- `sprints/livekit/SPRINT-LK-06-dashboard-ops.md`
- `sprints/livekit/SPRINT-LK-07-tests-docs-security.md`
- `sprints/livekit/SPRINT-LK-08-telephony-deploy.md`
- `packages/core/src/voice/contracts.ts`
- `packages/server/src/core/DomOSServer.ts`
- `packages/server/src/index.ts`
- `packages/adapter-google/src/GoogleLiveAdapter.ts`
- `packages/adapter-google/src/GoogleTTS.ts`
- `packages/adapter-openai/src/OpenAILiveAdapter.ts`
- `apps/demo-server/src/server.ts`
- `apps/demo/src/App.tsx`
- Official LiveKit docs checked: Agents overview, Gemini Live plugin, Gemini TTS plugin.

## Code reality

- `@domos/core` already owns `LiveAdapter`, `LiveSession`, `LiveSessionConfig`, `TTSService`, `STTService`.
- `@domos/server` already accepts `llm`, `live`, `stt`, `tts` through `DomOSServerOptions`.
- `DomOSServer` already routes live tool calls through `handleLiveToolCall()` and `ToolRouter`.
- `DomOSServer` already updates live session tools after `CONTEXT_UPDATE` when `liveSession.updateTools()` exists.
- `@domos/adapter-google` already provides `GoogleLiveAdapter`, `GoogleTTS`, `GoogleSTT` and Gemini tool conversion.
- `@domos/adapter-openai` already provides `OpenAILiveAdapter`.
- `apps/demo-server` already wires Google Live/TTS/STT into `DomOSServer`.
- `apps/demo` already validates the React flow with `DomOSProvider`, `useAgentContext`, `useAgentToolResolver` and `useAgentTool`.

## Scope allowed in LK-00

- `sprints/livekit/**`
- `docs/CONCEPTS.md` only for architecture wording if needed
- `framwork.md` only for architecture wording if needed
- `rapport/livekit.md` if an architecture decision report is needed

## Scope forbidden in LK-00

- No `packages/adapter-livekit` implementation yet.
- No LiveKit dependency install yet.
- No `@domos/server` runtime change.
- No SDK frontend room implementation.
- No dashboard endpoints.
- No Gemini TTS implementation.

## Decisions

1. Package name remains `@domos/adapter-livekit`.
2. Branch uses `feature-35`, not `feature-22`, because `feature_22_server_google_adapter_event_alignment.md` already exists.
3. LiveKit dependencies must live in `packages/adapter-livekit`, not in `packages/server`.
4. `packages/core/src/voice/contracts.ts` remains the source of truth for live and speech contracts.
5. Existing Google/OpenAI adapters are references, not code to duplicate.
6. LiveKit AgentSession must never execute client tools directly; tool calls must return to DomOS routing.
7. LK-01 can create package foundation, but must not implement Gemini TTS, AgentSession bridge or frontend rooms.

## Agent registry

### code_reviewer_54

- agent id: `019f381f-0087-7360-9f77-91039a9c34f9`
- nickname: Verifier
- custom agent type: `code_reviewer_54`
- mission: read-only review of LK-00 architecture/progress against current code reality.
- allowed scope: `sprints/livekit/**`, `docs/CONCEPTS.md`, `framwork.md`, `packages/core/src/voice/contracts.ts`, `packages/server/src/core/DomOSServer.ts`, `packages/server/src/index.ts`, current Google/OpenAI adapters, `apps/demo-server/src/server.ts`, `apps/demo/src/App.tsx`.
- forbidden scope: source edits, package install, commits, branch changes.
- status: closed without report
- created at: 2026-07-06
- last update: 2026-07-06 - no result after repeated waits; agent closed.
- expected output: findings by severity, file/line evidence, missing gates/tests, final recommendation for LK-00 closure.
- close/result: closed without report; replacement review requested below.

### code_reviewer_54 second pass

- agent id: `019f3827-beb1-7ce0-892a-8a5d29e1df33`
- nickname: Review
- custom agent type: `code_reviewer_54`
- mission: short read-only closure review for LK-00 docs/progress.
- allowed scope: `sprints/livekit/**`, `docs/CONCEPTS.md`, `framwork.md`, `packages/core/src/voice/contracts.ts`, `packages/server/src/core/DomOSServer.ts`.
- forbidden scope: source edits, package install, commits, branch changes.
- status: closed without report
- created at: 2026-07-06
- last update: 2026-07-06 - no result after repeated waits; agent closed.
- expected output: blocking findings only plus close/no-close recommendation.
- close/result: closed without report; LK-00 remains open until a reviewer verdict is obtained.

## TODO

- [x] Read LiveKit sprint plan LK-00 to LK-08.
- [x] Verify existing DomOS voice/live contracts.
- [x] Verify existing Google/OpenAI live adapters.
- [x] Verify demo-server wiring.
- [x] Verify React demo SDK usage.
- [x] Commit current project state before branch.
- [x] Create LiveKit branch.
- [x] Create sprint progress file.
- [x] Update architecture docs with an explicit LiveKit optional runtime section.
- [ ] Obtain `code_reviewer_54` review before closing LK-00. Two attempts were closed without report.
- [ ] Prepare LK-01 progress file after LK-00 review.

## Definition of Done

- [x] Contract explicitly says what LiveKit owns and what DomOS owns.
- [x] No decision makes Gemini mandatory.
- [x] Existing contracts are reused and not duplicated.
- [x] Secret boundaries are documented.
- [x] Branch/snapshot decision is documented.
- [ ] `code_reviewer_54` review is completed and real findings handled.
- [ ] Next sprint and its entry conditions are written before LK-00 closes.

## Validation plan

No build is required for LK-00 unless architecture docs are modified only. Validation is review-based:

- inspect `packages/core/src/voice/contracts.ts`;
- inspect adapter references;
- inspect `DomOSServer` live routing;
- run markdown/source searches if docs are updated.

## Next step persisted

Next step: obtain a completed `code_reviewer_54` review for LK-00 docs and progress. LK-01 must not create `packages/adapter-livekit` until LK-00 has a reviewer verdict.
