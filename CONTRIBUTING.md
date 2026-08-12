# Contributing to DomOS

[Version française](./CONTRIBUTING_FR.md)

Thank you for helping improve DomOS. We value small, reviewed changes that preserve API compatibility and package boundaries.

## Before you start

- Read the [Code of Conduct](./CODE_OF_CONDUCT.md) and [Security Policy](./SECURITY.md). Do not report vulnerabilities in public issues.
- Search existing issues before opening a new one.
- Open a bug report or feature request before starting non-trivial work.
- Keep a pull request focused on one domain: Core, Server/adapters, one SDK, UI, or infrastructure.

## Issue-driven workflow

GitHub Issues are the canonical record for work status, scope, ownership, discussion, and acceptance. The local `issues/` directory contains supporting technical canvases; it does not replace GitHub Issues.

Public issues must contain only the product context, scope, dependencies, decisions, acceptance criteria, and useful validation evidence. Never copy authentication output, tokens, session identifiers, personal workstation paths, private URLs, or unnecessary account details into an issue. Use roles or neutral labels when an identity is not required for ownership or review.

1. Search open and closed issues before creating a new one.
2. Use the bug or feature template and describe one concrete outcome per issue.
3. Include context, scope and out-of-scope items, affected packages, acceptance criteria, and the expected validation.
4. For complex work, add `issues/issue_<github-number>_<slug>.md` and link it from the GitHub issue. Use the same GitHub issue number in both places.
5. Create a linked branch named `issue-<number>-<short-description>` and keep its changes inside the approved scope.
6. Reference `#<number>` in commits and the pull request. Use `Closes #<number>` in the PR body when merging the PR should close the issue.

Maintainers can manage this workflow with GitHub CLI:

```bash
gh issue list --state open
gh issue view 14
gh issue create --template bug_report.yml
gh issue develop 14 --name issue-14-short-description --checkout
gh pr create --web
```

Never open a public issue for a vulnerability; follow the [Security Policy](./SECURITY.md) instead.

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

- Explain the problem and link the related issue with `Closes #<number>` or `Refs #<number>`.
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
