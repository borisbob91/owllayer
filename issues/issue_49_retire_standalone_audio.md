# GitHub issue #49: Retire the standalone audio workspace

**GitHub issue**: https://github.com/borisbob91/owllayer/issues/49
**Parent**: https://github.com/borisbob91/owllayer/issues/30
**Status**: In progress
**Domain**: Release infrastructure and Core Media documentation
**Priority**: Complete the Foundation layer before #19

## Objective

Remove the local `@owllayer/audio` compatibility shim after the completed Core
Media, Angular, and LiveKit migrations. Retained helpers remain available from
`@owllayer/core/media/audio`.

## Confirmed migration state

- The npm registry has no published `@owllayer/audio` package, so a compatibility
  or deprecation release is not required.
- #46 moved the maintained implementation to Core Media.
- #47 and #48 removed the confirmed Angular and LiveKit workspace consumers.
- No maintained package manifest or source file depends on `@owllayer/audio`.

## Release-scope decision

The release guard distinguishes:

- 12 retained canonical packages in the OwlLayer migration cohort;
- the approved temporary public compatibility shims `@owllayer/core` and
  `@owllayer/ui`.

The audio workspace is neither a retained canonical package nor a published
compatibility package. Removing it therefore leaves 12 canonical packages and
two explicitly approved temporary shims.

## Authorized scope

- Remove `packages/audio/`.
- Update `scripts/release/verify-release-scope.mjs` and `pnpm-lock.yaml`.
- Update release and migration documentation that described the audio shim as
  current.
- Preserve historical changelogs and unrelated architecture documentation.

## Out of scope

- Removing the approved `@owllayer/core` or `@owllayer/ui` compatibility shims.
- Migrating Browser, adapters, framework SDKs, Server, AITP, or LiveKit
  architecture.
- Adding codecs, changing media behavior, or publishing a new audio package.
- Changing GitHub workflows when the existing release workflow already consumes
  the release-scope guard.

## Validation

- Verify the release scope reports 12 retained canonical packages and two
  temporary public compatibility shims.
- Confirm no maintained workspace manifest or source import references
  `@owllayer/audio`.
- Run the affected Core build, lint, test, tarball, ESM, and type checks.
- Run package verification, Changeset validation, lockfile validation, and
  `git diff --check`.

## Closure conditions

- The focused pull request closes #49 and references #30.
- The public issue records sanitized validation evidence only.
- #30 can be closed only after this issue is merged.
