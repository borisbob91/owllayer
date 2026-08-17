# Releasing OwlLayer AI packages

OwlLayer AI has a canonical cohort of 12 retained packages in `packages/`.
During the migration, `@domos/core` and `@domos/ui` are additionally
published as temporary compatibility shims. The standalone `@domos/audio`
workspace was never published and is retired; maintained audio helpers live at
`@owllayer/core/media/audio`.

Applications, plugins, documentation sites, `shopify`, `woocommerce`, and
every workspace marked `private: true` are never published.

This procedure is tracked by [GitHub issue #14](https://github.com/borisbob91/domos/issues/14).

## Canonical vocabulary during the transition

The public product name is **OwlLayer AI**. Use **Agentic UI SDK** for the
developer-facing integrations and **OwlLayer AI Runtime** for the shared
execution layer.

The target protocol name is **AITP — Agent-to-Interface Transfer Protocol**.
The current implementation still exports `ADTP_VERSION`, `ADTPMessage` and
`ADTPTransport`, while applications still import from `@domos/*`. AITP is
therefore a canonical documentation term in this phase, not a second wire
protocol or an already available replacement export. See the [AITP compatibility
specification](./ADTP_PROTOCOL.md) and the [OwlLayer AI migration guide](./OWLLAYER_AI_MIGRATION.md).

## Documentation-only transition rules

The documentation work for issue #15 does not publish a package and does not
start the namespace or runtime migration. In particular, it:

- does not change a manifest, source API, import, export, runtime identifier or
  protocol literal;
- keeps executable examples on the currently installed `@domos/*` packages and
  `ADTP_*` identifiers;
- does not require a Changeset, because documentation-only changes are excluded
  from the package release cohort;
- treats `@owllayer/*`, AITP exports and renamed source paths as future targets
  that require their own implementation and validation gates.

The publication scope distinguishes the 12 retained canonical packages from
the two temporary public compatibility shims. Applications, documentation,
plugins, private workspaces and local planning material remain outside that
scope.

## Current readiness

The npm organization [`@owllayer`](https://www.npmjs.com/settings/owllayer/packages) exists, but publication is **not ready yet**:

- the canonical migration is incomplete: `@owllayer/core` and
  `@owllayer/ui` are canonical, while the remaining ten canonical packages
  retain their current `@domos/*` names;
- the temporary `@domos/core` and `@domos/ui` compatibility shims remain
  in the release scope during their documented migration windows;
- their `repository.url` still points to `borisbob91/domos`;
- the GitHub repository is still private and named `domos`;
- the GitHub environment `npm-production` does not exist;
- the repository variable `NPM_TRUSTED_PUBLISHING_READY` does not exist;
- the release workflow does not explicitly install npm 11.5.1 or later;
- the 12 `@owllayer/*` package pages do not exist, so their Trusted Publishers cannot be configured yet.

Do not enable automatic publishing until every readiness gate in this document is complete.

## Release model

The release is driven by Changesets on `master`, not by a Git tag:

1. A functional package PR contains a Changeset.
2. After the PR is merged into `master`, `release.yml` creates or updates the version PR.
3. The version PR updates versions, internal dependency ranges, `SDK_VERSION`, and package changelogs.
4. Merging the version PR triggers `release.yml` again.
5. When no Changeset remains and `NPM_TRUSTED_PUBLISHING_READY=true`, the workflow waits for approval on `npm-production`, then publishes every unpublished version.

Git tags and GitHub Releases may be generated after npm publication, but they are not the authority that starts this release flow.

## Phase 1 — Secure the npm organization

In the [`owllayer` npm settings](https://www.npmjs.com/settings/owllayer/packages):

1. Confirm that the maintainer account is an organization owner.
2. Enable 2FA on the owner account.
3. Enable organization-wide 2FA enforcement after confirming that every member has configured 2FA.
4. Review the automatically created `developers` team. Keep write access only for maintainers who publish or manage packages.
5. Do not create long-lived automation tokens.

The npm organization grants the `@owllayer` namespace. Creating the organization does not create package pages automatically.

## Phase 2 — Complete the namespace migration

Before the first publication, merge a dedicated migration PR that:

1. Keeps maintained audio utilities under `@owllayer/core/media/audio`,
   retires the unpublished standalone audio workspace, and completes the
   migration of the 12 retained canonical packages from `@domos/*` to
   `@owllayer/*`.
2. Updates internal imports and dependency ranges.
3. Keeps `shopify` and `woocommerce` private.
4. Updates Changesets, the release scope guard, package metadata, badges, documentation, and the lockfile.
5. Ensures every public manifest contains `publishConfig.access: "public"`.
6. Ensures no packed tarball contains `workspace:*`, tests, secrets, or internal source files.
7. Updates every package `repository.url` to the exact final GitHub repository URL.

Decide and apply the final GitHub repository name before configuring npm Trusted Publishing. All package metadata and npm publisher fields must use that exact canonical repository.

### Public package mapping

| Current package | OwlLayer AI package |
|---|---|
| `@domos/core` | `@owllayer/core` |
| `@domos/ui` | `@owllayer/ui` |
| `@domos/browser` | `@owllayer/browser` |
| `@domos/react` | `@owllayer/react` |
| `@domos/vue` | `@owllayer/vue` |
| `@domos/svelte` | `@owllayer/svelte` |
| `@domos/angular` | `@owllayer/angular` |
| `@domos/server` | `@owllayer/server` |
| `@domos/adapter-openai` | `@owllayer/adapter-openai` |
| `@domos/adapter-google` | `@owllayer/adapter-google` |
| `@domos/adapter-anthropic` | `@owllayer/adapter-anthropic` |
| `@domos/adapter-livekit` | `@owllayer/adapter-livekit` |

## Phase 3 — Prepare GitHub for OIDC

### Release workflow requirements

npm Trusted Publishing currently requires Node 22.14.0 or later and npm 11.5.1 or later. The publish job must:

- run on a GitHub-hosted runner;
- use Node 22.14.0 or later;
- install npm 11.5.1 or later explicitly;
- keep `permissions.contents: read` and `permissions.id-token: write`;
- publish without `NODE_AUTH_TOKEN` or an npm secret;
- reference the `npm-production` environment.

The current workflow already uses a GitHub-hosted runner, `id-token: write`, and the correct environment name. It still needs an explicit npm CLI upgrade before OIDC is enabled.

### GitHub environment

In **Repository → Settings → Environments**:

1. Create `npm-production`.
2. Add a required reviewer for publication approval.
3. Restrict deployment to the protected `master` branch.
4. If there is only one maintainer, do not enable “prevent self-review”; otherwise no one may be able to approve the release.
5. Do not store an npm publish token in this environment.

Required-reviewer availability depends on the GitHub plan and repository visibility. The repository is currently private; verify that the selected plan supports the desired environment protection, or make the repository public before the release.

### Public repository requirement

Trusted Publishing can authenticate a publish from a private repository, but npm provenance is not generated for private repositories. Because provenance is part of OwlLayer AI's release requirements, the canonical GitHub repository must be public before the final OIDC release.

## Phase 4 — Bootstrap the 12 package pages

npm Trusted Publishers are configured from each package's settings. Therefore, each `@owllayer/*` package must exist before OIDC can be attached.

### Authenticate and verify locally

Use a maintainer account with 2FA:

```bash
npm login --auth-type=web
npm whoami
```

Never paste a token into the repository, a committed `.npmrc`, a GitHub issue, or a workflow log.

### Run all release gates

From the repository root, after the OwlLayer AI migration PR is merged:

```bash
pnpm install --frozen-lockfile
node scripts/release/verify-release-scope.mjs
pnpm build:packages
pnpm lint:packages
pnpm test:packages
pnpm verify:packages
```

Inspect the generated tarballs and confirm that the package names, public files, exports, types, dependency ranges, repository URL, license, and `0.1.0` versions are correct.

### Perform the one-time bootstrap

Use one of these controlled methods:

1. **Direct bootstrap:** create a short-lived granular npm token restricted to the `@owllayer` organization, with write access and bypass 2FA enabled, publish the coherent `0.1.0` cohort, then revoke the token immediately after OIDC succeeds.
2. **Staged bootstrap:** run `npm stage publish` from each prepared package, inspect every staged package, then approve each stage with 2FA on npmjs.com.

Publish or approve in dependency order:

1. `core`, then `audio`;
2. `ui`, `browser`, and the four adapters;
3. React, Vue, Svelte, Angular, and Server.

Do not use the normal automatic release workflow for this bootstrap while Trusted Publishers are incomplete. Do not publish only a partial subset under mismatched versions.

## Phase 5 — Configure all 12 Trusted Publishers

After the package pages exist, repeat these steps for **every** package from the organization package list:

1. Open the package.
2. Open **Settings → Trusted publishing**.
3. Select **GitHub Actions**.
4. Fill the fields with the final canonical values:

| npm field | Required value after repository rename |
|---|---|
| Organization or user | `borisbob91` |
| Repository | `owllayer` |
| Workflow filename | `release.yml` |
| Environment name | `npm-production` |
| Allowed actions | `npm publish` |

Enter only `release.yml`, not `.github/workflows/release.yml`. Field matching is case-sensitive, and npm does not validate the configuration when it is saved.

The npm organization name `owllayer` and the GitHub owner `borisbob91` are intentionally different fields. If the GitHub repository is transferred to an organization later, every Trusted Publisher must be updated.

After the first successful OIDC publication, open **Settings → Publishing access** for each package and select **Require two-factor authentication and disallow tokens**. Then revoke the bootstrap token.

## Phase 6 — Enable automatic publication

Only after all 12 Trusted Publishers are configured and checked:

1. Add the repository variable:

   ```bash
   gh variable set NPM_TRUSTED_PUBLISHING_READY --body true
   ```

2. Merge a normal package PR containing a Changeset.
3. Review and merge the automatic version PR.
4. Open the Actions run and approve the `npm-production` deployment.
5. Confirm that the publish job uses OIDC and no npm token.

Do not set the readiness variable early: after a version PR merge, it is the final switch that authorizes the publish job.

## Phase 7 — Verify the registry release

Check all 12 packages on npm. At minimum:

```bash
npm view @owllayer/core version dist-tags --json
npm view @owllayer/react version dist-tags --json
npm view @owllayer/server version dist-tags --json
```

From a temporary directory outside the monorepo, install from the registry and verify ESM plus types:

```bash
npm init -y
npm install @owllayer/core @owllayer/react @owllayer/server
```

For every package, verify:

- visibility is public;
- the expected version and `latest` dist-tag are present;
- the provenance badge points to the canonical GitHub workflow;
- internal dependencies resolve to `@owllayer/*` registry versions;
- README, license, repository, homepage, exports, and types are correct;
- rerunning the workflow does not republish an existing immutable version.

For a faulty release, publish a patch or deprecate the bad version. Never attempt to overwrite an npm version.

## Normal release flow after bootstrap

1. Add a Changeset for every functional public-package change:

   ```bash
   pnpm changeset
   ```

2. Merge the feature or fix PR into `master`.
3. Review and merge `chore(release): version packages`.
4. Approve the `npm-production` deployment.
5. Verify npm versions, provenance, changelogs, and registry installation.

Packages use independent versions. `core` synchronizes its exported
`SDK_VERSION` during the version PR. The current core export `ADTP_VERSION`
remains the only protocol version constant available to applications and stays
at `1.0.0` until an approved implementation migration adds a canonical AITP
alias.

## Protocol compatibility and deprecation gate

The protocol rename is released separately from the npm namespace migration.
Until an implementation PR adds and validates canonical AITP aliases, the
current core export `ADTP_VERSION` remains the only version constant available
to applications and remains `1.0.0`.

An approved protocol migration must preserve, before any old name is retired:

- the JSON envelope and every existing message literal;
- payload fields, directions, ordering and the strict handshake version check;
- WebSocket and ordered WebRTC transport behavior;
- tool completion, HITL approval and security boundaries;
- current `@domos/*` imports and the ADTP exports for the full compatibility
  window.

The old names may be removed only in a deliberately announced breaking release
after compatibility tests, migration documentation, registry verification and
an explicit deprecation decision. A documentation PR must never imply that
such a removal has already happened.

## Official references

- [npm: Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
- [npm: Creating and publishing scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)
- [npm: Requiring 2FA for publishing](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/)
- [npm: Organization 2FA enforcement](https://docs.npmjs.com/requiring-two-factor-authentication-in-your-organization/)
- [GitHub: Deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
