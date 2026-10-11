# GitHub issue #196: Voice sessions do not use the system prompt of the client app

**GitHub issue**: https://github.com/borisbob91/owllayer/issues/196
**Status**: fixed on branch `issue-196-voice-system-prompt`
**Domain**: server (`packages/server`)

## Problem

Each client app can have its own system prompt, attached to its API key (`server.setPromptOverride(apiKey, prompt)` or the agent store). Text and hybrid requests use it. Voice sessions did not:

| Path | Before | After |
|---|---|---|
| Streamed voice: `AUDIO_STREAM` → `getOrCreateLiveSession` (widget voice mode) | live adapter prompt only; the key prompt was ignored | key prompt, then live adapter prompt, then `'You are an intelligent voice assistant.'` |
| Audio as a user message: `USER_INPUT` audio → `handleLiveAudio` | key prompt, then the **text** LLM prompt | key prompt, then live adapter prompt, then text LLM prompt |
| Agent bridge snapshot | key prompt, then live adapter prompt, then LLM prompt | unchanged (already correct) |
| Text and hybrid requests | key prompt, then LLM prompt | unchanged |

Effect before the fix: in the demo, the Vue admin and Svelte travel apps got the generic voice prompt in voice mode, while their text mode used their own prompt.

## Fix

- `handleLiveAudio`: `agentRecord?.prompt ?? this.live?.systemPrompt ?? this.llm.systemPrompt`, the same order as the agent bridge snapshot.
- `getOrCreateLiveSession`: the key prompt is loaded inside the creation promise (`agentStore.load(...).then(...)`). The promise is still stored in `liveSessionCreating` before any `await`, so audio chunks that arrive in a burst still share one live session.

## Verification

- `tests/OwlLayerServer.livePrompt.test.ts` (5 tests): key prompt on both voice paths, live adapter prompt when the key has none, a single live session for concurrent calls. The two tests for the bug fail on the code before the fix.
- `pnpm --filter @owllayer/server build lint test`: 298 tests pass.
