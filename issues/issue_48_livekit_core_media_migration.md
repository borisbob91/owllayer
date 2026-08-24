# Issue #48: Migrate LiveKit audio consumption to Core Media

**GitHub issue**: https://github.com/borisbob91/owllayer/issues/48
**Parent**: https://github.com/borisbob91/owllayer/issues/30
**Dependency**: https://github.com/borisbob91/owllayer/issues/46 (merged)
**Domain**: Server / adapter
**Package**: `@owllayer/adapter-livekit`

## Narrow objective

Migrate the internal audio dependency of `@owllayer/adapter-livekit` from the
standalone `@owllayer/audio` workspace to the provider-neutral public Core Media
subpath `@owllayer/core/media/audio`, while preserving the adapter's current
behavior.

This is a dependency and import migration only. It does not add LiveKit
capabilities or redesign the adapter.

## Source inventory

The implementation audit for this issue is limited to the following sources:

- `packages/adapter-livekit/package.json`: the pre-migration baseline declared
  `@owllayer/audio` as a workspace runtime dependency.
- `packages/adapter-livekit/src/live/audioMapping.ts`: the pre-migration
  baseline imported `decodeAudio`, `getFormatFromMimeType`, and `getMimeType`
  from `@owllayer/audio`; these helpers support PCM input decoding, MIME
  validation, and LiveKit-to-OwlLayer PCM output mapping.
- `packages/adapter-livekit/tests/GeminiLiveAdapter.test.ts`: existing focused
  adapter coverage for the runtime helper boundary, PCM input frames, PCM
  output MIME mapping, and PCM MIME validation.
- The matching `packages/adapter-livekit` dependency edge in `pnpm-lock.yaml`.

The target package already exposes the required public subpath through
`@owllayer/core` as `./media/audio`.

## Allowed implementation scope

- Update the adapter's audio import to `@owllayer/core/media/audio`.
- Update the adapter manifest so it directly declares the package that owns
  the Core Media audio subpath and no longer declares `@owllayer/audio` as its
  runtime audio dependency.
- Adjust `packages/adapter-livekit/tests/GeminiLiveAdapter.test.ts` only if
  the dependency or resolution change requires a behavior-focused test
  adjustment; preserve the existing fixtures and assertions unless they must
  change for that reason.
- Update only the matching adapter dependency edge in `pnpm-lock.yaml`.
- Add the required Changeset for the public adapter package.
- Keep this technical canvas up to date with the issue's verified scope and
  validation evidence.

## Forbidden scope

- Core Media APIs, implementation, exports, codecs, PCM behavior, or MIME
  behavior changes.
- LiveKit features, architecture, rooms, sessions, provider capabilities, or
  server-runtime redesign.
- Work belonging to #38.
- Removal of the standalone audio workspace; that work belongs to #49.
- Changes to AITP, HITL, sessions, permissions, credentials, browser access,
  or optional-package boundaries.
- Changes to unrelated packages, release workflows, package inventories, or
  unrelated lockfile edges.

## Compatibility and security invariants

- `@owllayer/adapter-livekit` remains an optional provider-specific adapter.
- Existing PCM frame construction, PCM decoding, MIME validation, and output
  mapping remain behaviorally unchanged.
- Provider-specific LiveKit types and runtime dependencies remain inside the
  adapter package.
- No AITP wire behavior, HITL enforcement, session ownership, permission
  boundary, credential ownership, or optional-package boundary changes.
- No new codec, transport, room, or session behavior is introduced.

## Expected validation

- Run the adapter lint, focused tests, and build successfully:
  `pnpm --filter @owllayer/adapter-livekit lint`,
  `pnpm --filter @owllayer/adapter-livekit test`, and
  `pnpm --filter @owllayer/adapter-livekit build`.
- Build or otherwise validate `@owllayer/core` and confirm that the
  `@owllayer/core/media/audio` subpath resolves through its published ESM and
  declaration entry points.
- Inspect the adapter tarball to confirm that the migrated import and required
  runtime package boundary are publishable without the standalone audio
  workspace dependency.
- Validate ESM imports and generated TypeScript declarations from the built
  adapter and Core Media subpath.
- Run the required Changeset validation, including `pnpm changeset status`.
- Run `git diff --check` and verify that the changed-file list contains only
  the approved issue scope; preserve unrelated worktree changes.

## Closure conditions

Issue #48 can close only when all of the following are true:

- `packages/adapter-livekit` has no runtime or manifest dependency on the
  standalone `@owllayer/audio` workspace.
- The adapter consumes the public `@owllayer/core/media/audio` surface.
- PCM handling, retained audio behavior, and MIME behavior remain covered
  wherever the adapter consumes them.
- Adapter lint, tests, build, tarball inspection, ESM/type validation, and
  required Changeset checks pass.
- The change adds no LiveKit capability and does not change LiveKit
  architecture, rooms, sessions, or provider behavior.
- The implementation PR remains limited to #48, references parent #30, and
  respects the dependency on merged #46.
- No forbidden package, release, security, protocol, or standalone-audio
  removal work is included.
