# GitHub Issue #47: Migrate Angular audio utilities to Core Media

**GitHub issue**: [#47](https://github.com/borisbob91/domos/issues/47)
**Parent**: [#30](https://github.com/borisbob91/domos/issues/30)
**Dependency**: [#46](https://github.com/borisbob91/domos/issues/46), merged

## Narrow objective

Migrate the Angular package from the standalone audio workspace to the public Core Media audio subpath, `@owllayer/core/media/audio`, after #46. Preserve Angular capture, playback, UI behavior, existing public SDK API, and existing audio behavior.

The standalone audio workspace is not removed here. Issues #48 and #49 are excluded from this canvas.

## Source inventory

The issue identifies these focused Angular sources:

- `packages/angular/package.json` — Angular package manifest and standalone audio dependency declaration.
- `packages/angular/src/lib/services/voice/DomOSVoiceService.ts` — Angular voice service consuming the audio utility.
- `packages/angular/src/public-api.test.ts` — focused existing test covering public API loading through the Angular test harness.

## Allowed scope

- Replace Angular-owned audio imports and package dependency declarations that consume the standalone audio workspace with the Core Media audio subpath.
- Adapt the focused existing Angular test only as needed for the migrated import and preserved behavior.
- Update `pnpm-lock.yaml` only for the resulting Angular dependency edge.
- Add the required Changeset for the affected public package.
- Keep this canvas as the local technical record for #47.

## Forbidden scope

- Defining or changing Core Media exports or Core audio implementation.
- Changing codecs, capture architecture, playback architecture, UI behavior, voice-state semantics, or the existing public Angular runtime API.
- Changing AITP messages, HITL behavior, browser permissions, credentials, or provider behavior.
- Removing the standalone audio workspace.
- Changing other SDKs, Core implementation, or unrelated packages.
- Changing release workflows or the public package inventory.

## Compatibility and security constraints

This is an internal Angular audio dependency migration. Existing Angular audio behavior and the public SDK API must remain compatible. The work must not alter AITP wire behavior, HITL behavior, browser permissions, credentials, or public Angular runtime semantics. No browser or provider secrets are introduced.

## Expected validation

- The focused Angular public-API test and Angular build pass.
- The Core Media audio subpath resolves through the Angular workspace dependency graph.
- The built Angular package passes tarball inspection and ESM import validation.
- Required Changeset checks pass when a Changeset is required.
- `git diff --check` passes.

## Closure conditions

- `packages/angular` has no runtime or manifest dependency on the standalone audio workspace.
- Existing Angular audio behavior and the public SDK API remain compatible.
- Angular tests, build, tarball, ESM, and required Changeset checks are passing.
- The change remains limited to issue #47, references parent #30, depends on merged #46, and does not remove the standalone audio workspace or include #48/#49.
