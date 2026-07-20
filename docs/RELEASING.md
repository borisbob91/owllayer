# Releasing DomOS packages

DomOS publishes only the public packages in `packages/`. Applications, plugins, documentation sites, and packages marked `private: true` are never published.

## Normal release flow

1. Add a Changeset for every public package change.

   ```bash
   pnpm changeset
   ```

2. Merge the change into `master`. The release workflow opens or updates the version pull request.
3. Review and merge the version pull request. Changesets updates package versions, internal dependencies, and package `CHANGELOG.md` files.
4. The release workflow runs package quality gates and publishes all unpublished versions through npm Trusted Publishing.

Packages use independent versions. `@domos/core` also synchronizes its exported `SDK_VERSION` during the version pull request; `ADTP_VERSION` remains a protocol version.

## First publication and trusted publishing

Before the first automated release:

1. Confirm that the `@domos` scope belongs to the release maintainer.
2. If npm requires a package to exist before its trusted publisher can be configured, publish the initial `0.1.0` packages with a short-lived granular token, in dependency order: core/audio, runtime/adapters, SDKs/server.
3. In npm package settings, configure GitHub Actions Trusted Publishing for every public package with:
   - owner: `borisbob91`;
   - repository: `domos`;
   - workflow: `.github/workflows/release.yml`.
4. Create the GitHub environment `npm-production` and require maintainer approval.
5. Set the repository variable `NPM_TRUSTED_PUBLISHING_READY` to `true`, then revoke the bootstrap token. Until this variable is enabled, the workflow creates version PRs but cannot publish.

For the bootstrap publication only, run `pnpm release` locally with the short-lived granular token available to npm. Do not store that token in GitHub Actions secrets.

Trusted Publishing uses GitHub OIDC and automatically creates npm provenance for public packages published from the public repository.

## Verification and recovery

The release workflow runs lint, tests, builds, tarball inspection, and package manifest verification before publishing. A failed release must be fixed with a new version: npm versions are immutable.

For a faulty public release, publish a patch or deprecate the bad version with npm. Do not attempt to overwrite it.
