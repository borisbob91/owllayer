# GitHub issue #59: Eliminate flaky BaseSTTService timing assertion

**GitHub issue**: https://github.com/borisbob91/owllayer/issues/59
**Status**: In progress
**Domain**: Server test suite

## Objective

Make the existing BaseSTTService duration test deterministic without changing
the STT runtime contract or the Core implementation.

## Confirmed root cause

The test awaited a real 100 ms timeout and asserted a wall-clock duration of
at least 100 ms. GitHub Actions recorded 99 ms, which is valid under timer and
clock scheduling granularity but fails the assertion.

## Authorized scope

- Replace the real timer dependency in `packages/server/tests/STTService.test.ts`
  with Vitest fake timers.
- Assert the existing result contract and an exact simulated 100 ms duration.
- Restore real timers after the test.

## Out of scope

- Production STT, TTS, or Core implementation changes.
- Public API, package metadata, release, Changeset, documentation, or CI changes.
- Broad server test refactors.

## Validation

- Run the targeted STT test under Node 22.
- Run the Server lint check.
- Run the package quality gate in GitHub Actions.

## Closure condition

- The focused pull request closes #59 with all checks successful.
