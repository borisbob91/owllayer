# Release process

This page explains how OwlLayer AI packages are versioned and published, and what contributors
need to do. Publication itself is performed by maintainers through a protected workflow.

## Published scope

- Only public packages under `packages/` are published to npm, under the `@owllayer` scope.
- The release scope is limited to **13 retained public packages**: `core`, `ui`, `browser`,
  `server`, `react`, `vue`, `svelte`, `angular`, `adapter-openai`, `adapter-google`,
  `adapter-anthropic`, `adapter-livekit`, and `adapter-deepgram` (which joins when its workspace
  is created).
- Applications, plugins, documentation sites, `@owllayer/shopify`, `@owllayer/woocommerce`, and
  every workspace marked `"private": true` are never published.
- `node scripts/release/verify-release-scope.mjs` enforces this scope in CI.

## What contributors do

1. Add a Changeset for every functional change to a public package:

   ```bash
   pnpm changeset
   ```

   Select every affected public package and describe the change as a release note.
   Documentation-only, test-only, and release-infrastructure changes do not need one.
2. Make sure the affected packages build, lint, and test locally:

   ```bash
   pnpm build:packages
   pnpm lint:packages
   pnpm test:packages
   pnpm verify:packages
   ```

3. Open the pull request. CI checks the release scope, the presence of Changesets, and the package
   tarballs.

## Release model

Releases are driven by Changesets on `master`, not by Git tags:

1. A functional pull request contains a Changeset.
2. After merge, the release workflow opens or updates the version pull request.
3. The version pull request updates versions, internal dependency ranges, `SDK_VERSION` in core,
   and package changelogs.
4. After the version pull request is merged, maintainers trigger and approve the publication
   workflow. Packages are published with npm Trusted Publishing (OIDC); no long-lived npm token
   is used.

Packages use independent versions. A published version is immutable: a faulty release is fixed
by a new patch version or deprecated, never overwritten.

## Documentation publication

The documentation is edited in `docs-site/` on every branch and on `master`, but the public site
changes only with a release:

1. Publishing a GitHub release runs `.github/workflows/docs-publish.yml`, which copies `docs-site/`
   from the released tag to the `docs/published` branch.
2. The documentation server deploys `docs/published`; GitHub Pages is built from the released tag
   by `.github/workflows/pages-docs.yml`.
3. To publish documentation without a release (for example a correction), run the
   `Publish documentation` workflow manually with the tag, branch, or commit to publish.

Merging to `master` never changes the public documentation by itself.

## Adding a new public package

A new public package requires, in this order:

1. An approved amendment of the engineering constitution that adds the package to the release
   scope.
2. A pull request that creates `packages/<name>` **and** adds it to the release-scope allowlist
   in `scripts/release/verify-release-scope.mjs` (the check rejects a listed package that does not
   exist yet).
3. A manifest aligned with the other packages: `publishConfig.access: "public"`, canonical
   `repository.url` with `directory`, `files: ["dist"]`, MIT license.
4. A one-time registry setup performed by maintainers before the first automated publication.

## Protocol compatibility

The AITP version constant exported by `@owllayer/core` stays at `1.0.0` until an approved
implementation change. Any protocol change must preserve, for the whole compatibility window, the
JSON envelope and message literals, payload fields and ordering, transport behavior, tool
completion, HITL approval, and security boundaries. Old names are removed only in an announced
breaking release after compatibility tests and migration documentation.
