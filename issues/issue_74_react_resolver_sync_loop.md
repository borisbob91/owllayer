# GitHub issue #74: React tool resolver CONTEXT_UPDATE feedback loop

**GitHub issue**: https://github.com/borisbob91/owllayer/issues/74
**Status**: Fix implemented — awaiting review
**Domain**: React (`packages/react`)

## Objective

Restore React agent latency to the Vue/Svelte level by registering resolver
tools once per mount and re-synchronizing only when declarations change.

## Observed behavior

React demos become very slow (text and voice, Gemini/OpenAI/DeepSeek) while Vue
and Svelte stay fluid. The audio pipeline is not involved: React's
`useVoiceMode` does not use the former audio package and matches Vue's code.

## Confirmed root cause

`useAgentToolResolver` keys its registration effect on `flatTools`, memoized on
the `config` identity. With an inline config (documented usage, demo), every
render re-registers all tools; each register/unregister sends a full
`CONTEXT_UPDATE`; the server replies `tools_effective`; the provider stores it
(`setToolSurface`), re-renders with a new context value, and the resolver
component re-renders again: a self-sustaining loop.

Measured (real server + real provider in jsdom, 7 tools, 5 s idle):

| Config | Renders | CONTEXT_UPDATE sent | Messages received |
|---|---|---|---|
| Inline, before fix (3 runs) | 8 / 114 / 108 | 49 / 897 / 849 | 9 / 880 / 824 |
| Inline, after fix (3 runs) | 3 | 1 | 2 |

## Implementation

- Registration effect keyed on a declaration signature (name, description,
  risk, parameters) instead of the `config` identity.
- Handlers resolve the latest definition through a ref, so fresh closures are
  used without re-registration.
- Same approach as the unmerged branch
  `fix/adapter-openai-issues-with-demos-react-deepseek`, to avoid conflicts.

## Out of scope

- Batching `syncToolsWithServer` in Core (one CONTEXT_UPDATE per tool).
- Server-side `tools_effective` deduplication.

## Validation

- `tests/useAgentToolResolver.test.tsx`: no re-registration on inline rerender,
  re-sync on declaration change, latest handler used, unregister on unmount.
- `@owllayer/react` build, lint and tests pass.
- Manual demo check: no idle WS traffic in `apps/demo-react`.

## Closure condition

The focused pull request closes #74 with regression tests, CI green and the
manual demo check confirmed.
