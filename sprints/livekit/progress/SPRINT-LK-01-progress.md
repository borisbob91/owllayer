# Sprint LK-01 progress - LiveKit package foundation

Date prepared: 2026-07-06  
Branch: `feat/feature-35-livekit-optional-runtime`  
Base sprint: `sprints/livekit/SPRINT-LK-00-architecture-contract.md` closed on 2026-07-06  
Active sprint file: `sprints/livekit/SPRINT-LK-01-package-foundation.md`

## Objective

Create the optional `@domos/adapter-livekit` package foundation without changing DomOS server runtime behavior.

The sprint prepares the package boundary, public exports, configuration types and build wiring needed for later LiveKit work. It must keep LiveKit out of `@domos/server` and reuse the existing contracts from `@domos/core`.

## Current-state evidence

- Workspace discovery: `pnpm-workspace.yaml` already includes `packages/*`, so `packages/adapter-livekit` should be picked up automatically.
- Existing adapter pattern: `packages/adapter-google` and `packages/adapter-openai` are the references for package naming, build shape and public exports.
- Existing core contracts: `packages/core/src/voice/contracts.ts` owns `LiveAdapter`, `LiveSession`, `LiveSessionConfig`, `TTSService` and `STTService`.
- Server aliasing: `packages/server/src/llm/types.ts` and `packages/server/src/speech/types.ts` reexport the relevant contracts from `@domos/core`.
- Existing server wiring: `packages/server/src/core/DomOSServer.ts` already receives `live`, `tts`, `stt` and `llm` adapters through options.

## Scope allowed in LK-01

- `packages/adapter-livekit/**`
- `sprints/livekit/progress/SPRINT-LK-01-progress.md`
- `pnpm-workspace.yaml` only if workspace inclusion fails, which is not expected because `packages/*` already exists.
- Minimal docs in `sprints/livekit/**` only if a package decision must be captured.

## Scope forbidden in LK-01

- No `packages/server/src/core/DomOSServer.ts` runtime change.
- No `packages/core/src/voice/contracts.ts` contract change unless an explicit blocker is found and documented first.
- No Gemini TTS implementation.
- No Gemini Live implementation.
- No AgentSession bridge.
- No frontend room client.
- No dashboard endpoint.
- No LiveKit token endpoint.
- No telephony or deployment work.

## Decisions

1. The package name is `@domos/adapter-livekit`.
2. LiveKit dependencies belong in `packages/adapter-livekit`, not in `packages/server`.
3. The first package foundation must stay provider-neutral; Gemini, OpenAI and LiveKit Inference are provider options, not hard requirements.
4. Secrets such as `LIVEKIT_API_SECRET` and provider API keys must never be exported to browser-facing packages.
5. Public exports should be minimal: config/types/errors first, runtime classes only when their sprint implements them.
6. The package must build in isolation before any later sprint depends on it.
7. LK-01 will not add `@livekit/agents`, `@livekit/agents-plugin-google` or `livekit-server-sdk` yet because no runtime class imports them in this sprint. Adding them now would create dependency weight without executed code. They remain reserved for LK-02/LK-03/LK-04 when concrete TTS/live/bridge code needs them.
8. `pnpm-lock.yaml` may be updated only for the new workspace importer and already-existing tool dependencies required by `@domos/adapter-livekit`.

## TODO

- [x] Inspect `packages/adapter-google` and `packages/adapter-openai` package/build shape before creating files.
- [x] Create `packages/adapter-livekit/package.json`.
- [x] Create `packages/adapter-livekit/tsconfig.json`.
- [x] Create `packages/adapter-livekit/tsup.config.ts` or reuse the repo's established build pattern. Existing adapters use direct `tsup` scripts, so no `tsup.config.ts` was created.
- [x] Create `packages/adapter-livekit/src/index.ts`.
- [x] Create `packages/adapter-livekit/src/types.ts`.
- [x] Create `packages/adapter-livekit/src/LiveKitRuntimeConfig.ts`.
- [x] Create `packages/adapter-livekit/src/errors.ts`.
- [x] Document required server-only environment variables in the package README or source comments.
- [x] Run the package build in isolation.
- [x] Request `code_reviewer_54` review before closing LK-01.

## Definition of Done

- [x] `@domos/adapter-livekit` exists as an optional package.
- [x] The package builds in isolation.
- [x] The package exports only foundation types/config/errors needed by later sprints.
- [x] `@domos/server` does not import LiveKit directly.
- [x] Gemini is not mandatory.
- [x] Secrets remain documented as server-only values.
- [x] No runtime room, TTS, LiveAdapter, AgentSession, dashboard or telephony feature is implemented in LK-01.
- [x] `code_reviewer_54` validates the sprint before closure.

## Validation plan

- [x] Run `pnpm --filter @domos/adapter-livekit build` - passed.
- [x] Run `pnpm --filter @domos/adapter-livekit test` - passed, 6 tests.
- [x] Run `pnpm --filter @domos/adapter-livekit lint` - passed.
- [x] Run `pnpm --filter @domos/server build` - passed.
- [x] Run targeted source searches proving `packages/server` has no direct LiveKit import - `rg -n "livekit|@livekit|livekit-server-sdk" packages/server/src packages/server/package.json` returned no matches.
- [x] Inspect public exports from `packages/adapter-livekit/src/index.ts`.
- [x] Run `git diff --stat` before review to confirm the sprint stayed in scope.

## Agent registry

### code_reviewer_54 LK-01 pass

- agent id: `019f3843-b48a-78c0-b405-9b708ff06355`
- nickname: Sentinel
- custom agent type: `code_reviewer_54`
- mission: read-only closure review for LK-01 package foundation.
- allowed scope: `packages/adapter-livekit/**`, `sprints/livekit/progress/SPRINT-LK-01-progress.md`, `sprints/livekit/SPRINT-LK-01-package-foundation.md`, `pnpm-lock.yaml`, adapter package references, `packages/server/package.json`, `packages/server/src/**` only for direct LiveKit import verification.
- forbidden scope: source edits, package installs, commits, branch changes, server runtime changes, core contract changes, Gemini TTS/live implementation, AgentSession bridge, dashboard endpoints, frontend room code.
- status: completed with blocking finding
- created at: 2026-07-06
- last update: 2026-07-06 - reviewer reported one medium closure blocker on redaction of `GOOGLE_APPLICATION_CREDENTIALS`.
- expected output: findings first by severity, file/line evidence, missing tests or scope leaks, final close/no-close recommendation.
- close/result: do not close LK-01 yet. Real finding accepted and corrected.

## Reviewer findings handled

- [x] Medium: `redactLiveKitRuntimeConfig()` masked `googleApiKey` but left `googleApplicationCredentials` visible. Fixed by redacting `googleApplicationCredentials` in the public redacted shape.
- [x] Missing test: redaction regression did not cover `GOOGLE_APPLICATION_CREDENTIALS`. Fixed in `packages/adapter-livekit/tests/LiveKitRuntimeConfig.test.ts`.
- [x] Missing test: invalid LiveKit URL branches were untested. Added invalid protocol and invalid URL assertions.
- [x] README now states `redactLiveKitRuntimeConfig(config)` must be used before logs/admin display and masks LiveKit secrets, `GOOGLE_API_KEY` and `GOOGLE_APPLICATION_CREDENTIALS`.

### code_reviewer_54 LK-01 second pass

- agent id: `019f3843-b48a-78c0-b405-9b708ff06355`
- nickname: Sentinel
- custom agent type: `code_reviewer_54`
- mission: read-only re-review after fixing LK-01 secret redaction finding.
- allowed scope: `packages/adapter-livekit/**`, `sprints/livekit/progress/SPRINT-LK-01-progress.md`, `sprints/livekit/SPRINT-LK-01-package-foundation.md`, `pnpm-lock.yaml`.
- forbidden scope: source edits, package installs, commits, branch changes, server runtime changes, core contract changes, Gemini TTS/live implementation, AgentSession bridge, dashboard endpoints, frontend room code.
- status: completed and closed
- created at: 2026-07-06
- last update: 2026-07-06 - redaction finding fixed, package validations rerun, second pass completed.
- expected output: verify blocker fixed, list any remaining blocking findings, final close/no-close recommendation.
- close/result: no remaining blocking finding. Recommendation: close LK-01.

## Status

Closed on 2026-07-06.

## Next step persisted

Next step: start LK-02 Gemini TTS Service. LK-02 may add the LiveKit Google plugin dependency only if `GeminiTTSService` imports it. It must remain scoped to `TTSService` only and must not implement LiveAdapter, AgentSession bridge, frontend rooms, dashboard endpoints or server runtime changes.
