# GitHub issue #128: Approved server tool result sent to the wrong model

**GitHub issue**: https://github.com/borisbob91/owllayer/issues/128
**Status**: Fix implemented — awaiting review
**Domain**: Server (`packages/server`, `OwlLayerServer`)

## Context

Two models can call tools in the same session:

- the **text LLM** (`llm.chat` / `llm.handleToolResult`), for typed messages;
- the **live voice provider** (OpenAI Realtime, Gemini Live), while voice mode
  is on.

Each one gives its calls its own ids, and only accepts results for its own
ids. A server tool with `risk: 'high'` or `'critical'` waits for the user's
approval in `pendingServerApprovals`, then runs and sends its result.

## Root cause

`pendingServerApprovals` did not record who made the call. The pending
status (`notifyApprovalPending`) and the result (`notifyToolResult`) went to
the voice provider whenever a voice session was active at that moment,
otherwise to the text LLM.

| Call from | Voice session | Before | After |
|---|---|---|---|
| Text LLM | none | text LLM | text LLM |
| Text LLM | active | **voice provider, unknown id; text LLM never answered** | text LLM |
| Voice provider | active | voice provider | voice provider |
| Voice provider | closed before approval | **text LLM, unknown id: raw JSON shown to the user** | nothing sent (tool still runs, warning logged) |
| Agent bridge (LiveKit) | any | unchanged | unchanged |

## Fix

- `pendingServerApprovals` entries carry `origin: 'text' | 'live' | 'bridge'`.
- Text calls no longer send a pending status to the voice provider.
- `notifyToolResult` routes by origin: `text` always to the text LLM, `live`
  to the voice provider only while it is active, `bridge` keeps the previous
  behavior.

## Tests

`packages/server/tests/OwlLayerServer.serverToolOrigin.test.ts`: approval
and refusal of a text call with an active voice session, voice call, voice
session closed before approval, text only. 3 of 5 fail before the fix.

## Out of scope

- Agent bridge (`routeAgentBridgeToolCall`): after approval, there is no
  channel to send the result back to the bridge. Needs its own issue.
- The voice provider receives a `pending_approval` status, then the result,
  for the same call id (existing design).
