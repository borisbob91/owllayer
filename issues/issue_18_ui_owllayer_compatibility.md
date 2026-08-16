# GitHub Issue #18: UI canonical package migration and compatibility shim

**GitHub issue**: [#18 — Migrate `@domos/ui` to `@owllayer/ui`](https://github.com/borisbob91/domos/issues/18)

**Parent**: [#14 — Migrate DomOS to OwlLayer AI](https://github.com/borisbob91/domos/issues/14)

**Status**: Planned technical canvas for the complete #18 implementation

## Objective

Deliver the complete UI package migration for OwlLayer AI while preserving existing
consumer imports. `packages/ui` becomes the canonical public `@owllayer/ui`
package. `packages/ui-legacy` publishes a temporary public `@domos/ui`
compatibility shim that re-exports the canonical root, `./dashboard`, and
`./devtools` surfaces without duplicating the UI runtime.

Existing consumers continue using `@domos/ui`, `@domos/ui/dashboard`, and
`@domos/ui/devtools` in this issue. The shim provides that continuity; consumer
migration is deliberately separate work.

## Source inventory

The implementation covers the following package, workspace, release, and
documentation artifacts:

- `packages/ui/package.json` — canonical `@owllayer/ui` identity, metadata,
  dependencies, and root, dashboard, and DevTools export map;
- `packages/ui/src/index.ts`, `packages/ui/src/dashboard/index.ts`, and
  `packages/ui/src/devtools/index.ts` — canonical public source entry points;
- migrated dependency imports within `packages/ui` source, preserving public APIs and
  runtime behavior;
- `packages/ui/esbuild.config.mjs` and `packages/ui/tsconfig.json` — canonical ESM
  bundle and declaration build configuration;
- `packages/ui-legacy/package.json` — public `@domos/ui` identity, dependency on
  `@owllayer/ui`, and compatibility export map;
- `packages/ui-legacy/src/index.ts`, `packages/ui-legacy/src/dashboard.ts`, and
  `packages/ui-legacy/src/devtools.ts` — thin direct re-exports of the canonical
  root, dashboard, and DevTools surfaces;
- `packages/ui-legacy/tsconfig.json` and package build configuration — legacy ESM and
  declaration outputs;
- `pnpm-lock.yaml` — canonical package rename, shim dependency, and affected
  workspace resolutions;
- `scripts/release/verify-release-scope.mjs` — public-package allowlist containing
  both `@owllayer/ui` and `@domos/ui` while restricting releases to `packages/`;
- one Changeset covering the canonical package and temporary compatibility shim;
- `packages/ui/README.md` and `packages/ui-legacy/README.md` — canonical installation
  and legacy migration guidance.

## Approved compatibility decision

- `@owllayer/ui` is the canonical public UI package and the installation target for
  new integrations.
- `@domos/ui` is a temporary public compatibility package during the documented
  migration period.
- The compatibility package depends on and re-exports `@owllayer/ui`.
- The compatibility package preserves the root, `./dashboard`, and `./devtools`
  entry points.
- Existing packages and applications keep their current `@domos/ui` imports in this
  issue.
- The compatibility package does not copy or independently implement the UI runtime.

## Implementation scope

- Rename the canonical package in `packages/ui` to `@owllayer/ui` and update only the
  package source, manifest, build/type configuration, README, lockfile, release scope,
  and Changeset work required by that migration.
- Publish `packages/ui-legacy` as the temporary `@domos/ui` shim, with direct
  re-exports for the root, `./dashboard`, and `./devtools` surfaces.
- Update the package READMEs so new integrations install the canonical package and
  existing integrations understand that legacy imports remain compatible temporarily.
- Update the lockfile and release-scope allowlist only as required for these two public
  UI packages.
- Add exactly one Changeset that describes the canonical package release and legacy
  compatibility release.

## Explicitly forbidden scope

- Do not change existing consumer source code, package manifests, tests, or demo
  aliases that import or resolve `@domos/ui`.
- Do not change the documentation site or existing consumer documentation; those
  changes belong to #42 and future consumer migration issues.
- Do not change UI runtime behavior, AITP or ADTP protocol behavior, or public API
  semantics.
- Do not perform audio migration work or work owned by
  [#49](https://github.com/borisbob91/domos/issues/49).
- Do not rename unrelated packages, publish applications or plugins, or change private
  package status.
- Do not manually edit `CHANGELOG.md` files or generate changelog text outside the one
  required Changeset.

## Compatibility and release constraints

- Existing consumers must continue to resolve `@domos/ui`, `@domos/ui/dashboard`, and
  `@domos/ui/devtools` during the compatibility period.
- New integrations should install `@owllayer/ui`; existing integrations may retain
  legacy imports until a separately documented migration and removal decision.
- The legacy shim must re-export, not copy, the canonical implementation.
- The canonical and legacy packages must preserve the same observable UI behavior for
  the root, dashboard, and DevTools surfaces.
- Package manifests and packed tarballs must use publishable dependency ranges and
  must not contain unresolved `workspace:*` references.
- Only public packages under `packages/` are eligible for release. Applications,
  plugins, documentation workspaces, and private packages are not publication targets.
- Public prose must use the OwlLayer AI product name and remain in English. It must
  not contain personal paths, private URLs, credentials, tokens, session data, or
  other secrets.

## Acceptance criteria

- [ ] `packages/ui` publishes as `@owllayer/ui` with root, dashboard, and DevTools
  exports.
- [ ] `packages/ui-legacy` publishes as `@domos/ui` and directly re-exports the
  canonical root, dashboard, and DevTools surfaces.
- [ ] The canonical and legacy package manifests, source imports, and build/type
  configuration are internally consistent.
- [ ] `pnpm-lock.yaml` reflects the canonical package and shim dependency graph.
- [ ] The release-scope allowlist accepts both public UI packages and rejects
  publication outside `packages/`.
- [ ] Exactly one Changeset covers the canonical package and legacy shim releases.
- [ ] Both package READMEs describe the approved canonical and compatibility paths.
- [ ] No existing consumer source, manifest, documentation-site file, runtime,
  protocol, audio, or manual changelog change is introduced.

## Required validation

Run the complete validation sequence after implementation:

1. Install against the updated lockfile with the repository's frozen-lockfile
   procedure.
2. Run lint and build for `@owllayer/ui` and `@domos/ui`.
3. Verify the canonical package emits ESM bundles and declarations for the root,
   dashboard, and DevTools entry points.
4. Verify the legacy package emits ESM modules and declarations for the root,
   dashboard, and DevTools re-export entry points.
5. Execute ESM import checks for all six public paths:
   `@owllayer/ui`, `@owllayer/ui/dashboard`, `@owllayer/ui/devtools`,
   `@domos/ui`, `@domos/ui/dashboard`, and `@domos/ui/devtools`.
6. Compile a TypeScript consumer check for the canonical and legacy root and subpath
   imports.
7. Pack both packages and inspect their tarballs: package names, files, export maps,
   declarations, README files, and dependency ranges must be correct; no packed
   manifest may retain `workspace:*`.
8. Install the packed tarballs outside the monorepo and repeat the ESM and type checks.
9. Run the release-scope verification and confirm the single Changeset is valid for
   the two public UI packages.
10. Record only sanitized public validation evidence in GitHub #18.

## Closure conditions

Close #18 only when every acceptance criterion and validation gate above passes, the
canonical tarball is `@owllayer/ui`, the legacy tarball is a functioning
`@domos/ui` compatibility shim, and existing consumer imports remain unchanged.

The issue is not complete if builds pass but tarball, ESM, type, lockfile,
release-scope, Changeset, or compatibility checks remain unverified.
