# GitHub issue #175: Gemini Live, tools not updated after navigation

**GitHub issue**: https://github.com/borisbob91/owllayer/issues/175
**Status**: Fix implemented, awaiting review
**Domain**: Server adapters (`packages/adapter-google`)

## Symptom

Voice mode with Gemini Live on the React demo: from the checkout page to the
confirmation, the tools are registered (DevTools, `CONTEXT_UPDATE` received by
the server with 21 tools) but the agent answers that it doesn't have them and
can't fill the form or confirm the order. Text mode works on the same pages
(checked: `start_checkout` then `fill_checkout_form` chained in one turn).

## Cause

| # | Finding | Impact |
|---|---|---|
| 1 | `GoogleLiveAdapter` sends the tools only in the setup of `ai.live.connect()` and its session has no `updateTools` | `OwlLayerServer.handleContextUpdate` skips the update: the session keeps the tools of the page where voice started |
| 2 | The Live API reads the setup only in the first message | Tools can't change on an open connection |
| 3 | A session resumed with a `sessionResumption` handle keeps its original tools (checked against `gemini-3.8-live`: resumed with only `fill_checkout_form`, the model still called `add_to_cart`) | Resumption keeps the conversation but not the new tools |

## Fix

- `updateTools(tools)`: compares the Gemini declarations with the applied list;
  when they differ, keeps them pending.
- At the end of the current turn (no model answer, no user turn, no tool call
  waiting for its response), opens a new connection with the new tools, closes
  the old one and replays the transcript history (user and agent transcriptions,
  `sendText` messages, last 40 turns) with `sendClientContent({ turns, turnComplete: false })`,
  supported throughout the session by Gemini 3.8 Live.
- Callbacks of the replaced connection are ignored (no `onClose`, `onError` or
  tool call from it).
- `sendAudio`, `sendText`, `sendToolResponse` and `endAudioTurn` wait for the
  reconnection and go to the new connection.
- A failed reconnection closes the session and calls `onError`; the server opens
  a new session on the next audio.

A tool of the new page is available from the next spoken turn: during the turn
that navigates (`go_to_checkout`), the model still has the previous tools.

## Validation

- `tests/GoogleLiveAdapter.test.ts`: 16 tests (mocked Live client).
- Mutation check: 22 targeted mutants on the guards, history and reconnection,
  22 killed.
- Real API (`gemini-3.8-live`): after `updateTools`, the model calls the new tool
  and remembers the previous request; reversed control calls the tool of the new list.
