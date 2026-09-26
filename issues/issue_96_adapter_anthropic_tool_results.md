# GitHub issue #96: Anthropic adapter — tool results, JSON Schema, current models

**GitHub issue**: https://github.com/borisbob91/owllayer/issues/96
**Status**: Fix implemented — awaiting review
**Domain**: Server adapters (`packages/adapter-anthropic`)

## Objective

Make `@owllayer/adapter-anthropic` complete a turn that uses tools, like the
OpenAI adapter does since #77.

## Findings

| # | Problem | Impact |
|---|---|---|
| 1 | `handleToolResult` returns `JSON.stringify(result)` as the agent text | Claude never sees the tool result: the user reads raw JSON, no chained tool (navigation → form, approved HITL), `tools` surface (#76) ignored |
| 2 | AITP parameters (`type: 'OBJECT'`, `'STRING'`…) passed as `input_schema` | JSON Schema types are lowercase: tools with parameters are rejected or unusable |
| 3 | Every `tool_use` block returned to the server | The server resumes each call from the same history; the API requires a `tool_result` for every `tool_use` of the previous turn → 400 |
| 4 | Default `claude-sonnet-4-20250514`, Claude 4 / 3.5 Haiku catalog, README documents `claude-3-5-sonnet-20241022` | Outdated models proposed |
| 5 | No tests in the package | Regressions undetected |

## Implementation

- `src/toolConverter.ts`: `toAnthropicTools()` converts AITP declarations to
  JSON Schema (`type` lowercased, `items`, nested `properties`, `required`).
- `AnthropicAdapter`:
  - per-call context (`pendingToolContext`: history, assistant content, system
    prompt) stored when Claude returns a `tool_use`;
  - `handleToolResult(callId, result, tools)` replays history + assistant
    content + one user `tool_result` (`is_error` for `{ status: 'error' }` or
    `{ error }`), with the current tool surface, and parses the new response
    (which can chain another tool); unknown `callId` keeps the previous fallback;
  - `tool_choice: { type: 'auto', disable_parallel_tool_use: true }` when tools
    are sent, plus a guard keeping only the first `tool_use` (the others are
    removed from the replayed assistant content);
  - default model `claude-sonnet-5` (same tier as before), catalog
    `claude-sonnet-5`, `claude-opus-5`, `claude-haiku-4-5`.
- `tests/AnthropicAdapter.test.ts`: 7 tests with a mocked client (5 fail on
  `master`); `vitest` dev dependency and `test` script as in `adapter-openai`.
- README: documented default model.

## Out of scope (noted)

- `max_tokens: 4096` and the 30 s timeout are unchanged.
- No streaming / adaptive thinking: the adapter contract returns a full
  `LLMResponse`.
