# Contributing to DomOS

[Version française](./CONTRIBUTING_FR.md)

Thank you for helping improve DomOS. We value small, reviewed changes that preserve API compatibility and package boundaries.

## Before you start

- Read the [Code of Conduct](./CODE_OF_CONDUCT.md) and [Security Policy](./SECURITY.md). Do not report vulnerabilities in public issues.
- Search existing issues before opening a new one.
- Open a bug report or feature request before starting non-trivial work.
- Keep a pull request focused on one domain: Core, Server/adapters, one SDK, UI, or infrastructure.

## Development

Use Node.js 22 and pnpm 9.

```bash
pnpm install --frozen-lockfile
pnpm lint:packages
pnpm test:packages
pnpm build:packages
```

Run the relevant package commands while developing:

```bash
pnpm --filter @domos/core test
pnpm --filter @domos/react build
```

## Pull requests

- Explain the problem and link the related issue.
- List the packages and public APIs affected.
- Include tests for behavior changes and update documentation when users are affected.
- Do not include unrelated refactors, renames, formatting changes, or generated files.
- Ensure CI passes before requesting review.

## Package releases

Functional changes to a public `@domos/*` package require a Changeset. Documentation-only, test-only, and release-infrastructure changes do not.

```bash
pnpm changeset
```

Select every public package affected by the change. Changesets creates independent versions, updates internal dependency ranges, and generates package changelogs. See [Releasing packages](./docs/RELEASING.md).

## Scope

Only public packages in `packages/` are published to npm. Apps, plugins, documentation, `@domos/shopify`, and `@domos/woocommerce` are not published by the release workflow.
