# GitHub issue #72: HITL approval never reaches the client when a live session is active

**GitHub issue**: https://github.com/borisbob91/owllayer/issues/72
**Status**: Fix implemented — awaiting review
**Domain**: Server (`packages/server`)

## Objective

Guarantee that every client tool declared `risk: 'high' | 'critical'` produces an
approval UI on the client and executes only after explicit approval, whether or
not a live voice session is active, without changing the AITP wire contract.

## Observed behavior

In the demos (React, Vue, Svelte), asking the agent for a high/critical action
(`confirm_checkout`, `add_to_wishlist`) shows no modal and nothing executes.
The fault is shared by every SDK because it sits in the server.

## Verified client chain (works)

`TOOL_CALL` → `OwlLayerClient.handleToolCall` → `HITLPolicy.evaluate`
(`'high'`/`'critical'` string enum, no mismatch) → `APPROVAL_REQUEST` sent to the
server + `onApprovalRequest` → provider `pendingApproval` → `ApprovalModal` /
`ApprovalBanner` → `resolveApproval` → handler → `APPROVAL_RESPONSE` →
`ToolRouter.handleToolResult`.

## Confirmed root causes

Reproduced with a Node harness (real `OwlLayerServer` + real `OwlLayerClient`,
mocked LLM and live adapter, client tool `confirm_checkout` `critical`):

| Scenario | Approval UI | Executed |
|---|---|---|
| Text only, no live adapter | yes | yes |
| Live tool call (voice) | yes | yes, but wrong call id sent to the live provider |
| Text turn while live session active | **no** | **no** |

### 1. `processLLMResponse` drops client tools when a live session is active

`OwlLayerServer.processLLMResponse` handles
`pending_approval && (serverTool || liveSession?.isActive)` by sending only
`SYSTEM_EVENT approval_required`, notifying the live session, then `continue`.
For a client tool this never sends `TOOL_CALL` or `APPROVAL_REQUEST` and
registers no pending approval: the call is lost. No SDK renders
`approval_required` as a modal.

### 2. Live approval uses the router call id instead of the provider call id

`ToolRouter.route` generates an internal `callId`. The client echoes it in
`APPROVAL_REQUEST`; `handleApprovalRequest` → `notifyApprovalPending` then calls
`liveSession.sendToolResponse(<internal id>, …)`. The live provider receives a
response for an unknown id, then a second response for its real id when the
tool completes.

## Proposed fix (server only)

1. In `processLLMResponse`, restrict the early approval branch to server tools
   (`serverTool` defined). Client tools always go through `ToolRouter.route`,
   where the client applies HITL and extends the timeout via `APPROVAL_REQUEST`.
2. In the live path, do not send an interim `pending_approval` response keyed by
   the router id. Either keep a router-id → provider-id mapping for the pending
   live client call, or skip the interim notification for client tools and send
   a single final response with the provider id once `TOOL_RESULT` /
   `APPROVAL_RESPONSE` arrives (current `handleLiveToolCall` already does this).
3. Update `packages/server/tests/OwlLayerServer.hitl.test.ts`: the test
   "priorise live pour approval_required (system_event) dans processLLMResponse"
   currently encodes the faulty behavior; add cases for text-with-live client
   tool approval/denial and for live provider call ids.

## Out of scope

- Client HITL policy, framework approval components, AITP message schemas.
- Demo cosmetics (`approvalBanner: true` plus a manual `<ApprovalModal />` in
  `apps/demo-react`).

## Validation

- Targeted server HITL tests, then `pnpm --filter @owllayer/server build` and `test`.
- Package quality gates in CI.
- Manual demo check: voice once, then a text request for `confirm_checkout`.

## Closure condition

The focused pull request closes #72 with the regression tests and all checks
successful, and the manual demo check confirmed.

## Implementation

- `processLLMResponse`: the early approval branch now applies to server tools
  only; client tools always go through `ToolRouter.route`.
- `handleApprovalRequest`: only extends the router timeout; it no longer sends
  an interim `pending_approval` to the live session with the router call id.
- Tests: the two tests that encoded the faulty behavior were updated, and new
  cases cover text-with-live approval, text-with-live denial, and the live
  provider call id.

Known follow-up (out of scope, server tools unchanged): when a live session is
active, a server tool requested by the text LLM still notifies the live session
with the text LLM call id.
