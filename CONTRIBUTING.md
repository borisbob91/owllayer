# Contributing to OwlLayer AI

[Version française](./CONTRIBUTING_FR.md)

Thank you for helping improve OwlLayer AI. It is an Agentic UI SDK whose execution layer is the OwlLayer AI Runtime. We value small, reviewed changes that preserve API compatibility and package boundaries.

## Public terminology and compatibility

- Use **OwlLayer AI** as the public product name. Do not use “OwlLayer” alone in product prose.
- Use **Agentic UI SDK** for developer-facing integrations and framework SDKs.
- Use **OwlLayer AI Runtime** when referring to the shared execution layer or server runtime.
- Use **AITP** for the Agent-to-Interface Transfer Protocol. **ADTP** is the legacy name and remains a valid compatibility alias during the migration period.
- Keep current examples and runtime identifiers unchanged: `@domos/*` imports, `DomOS*` classes, existing WebSocket paths, and current API names are still the supported surface in this repository.
- The compatibility period ends only after the corresponding migration work is delivered and a removal is announced in the migration and release documentation. Do not remove or silently rename a legacy identifier in a documentation-only change.

## Before you start

- Read the [Code of Conduct](./CODE_OF_CONDUCT.md) and [Security Policy](./SECURITY.md). Do not report vulnerabilities in public issues.
- Search existing issues before opening a new one.
- Open a bug report or feature request before starting non-trivial work.
- Keep a pull request focused on one domain: Core, Server/adapters, one SDK, UI, or infrastructure.

## Issue-driven workflow

GitHub Issues are the public source of truth for work status, scope, ownership, discussion, decisions, acceptance, and closure. The public roadmap, domain epics, and focused implementation issues belong on GitHub. Detailed plans and private sprints remain local; the `issues/` and `features/` directories may contain supporting technical canvases, but they do not replace GitHub Issues or become a second public tracker.

Public issues must contain only the product context, scope, dependencies, decisions, acceptance criteria, and useful validation evidence. Never publish identifiers, authentication output, tokens, session data, personal workstation paths, private URLs, private operational recipes or details, or unnecessary account information. Use roles or neutral labels when an identity is not required for ownership or review.

### Public hierarchy and decomposition

Keep these levels distinct:

`public roadmap → domain epic → focused implementation issue → one branch and one pull request per issue`

Use GitHub sub-issues to decompose an epic. Every sub-issue must state its dependencies, in-scope and out-of-scope work, acceptance criteria, expected validation, and condition for closure. Each focused implementation issue has one branch and one pull request; a pull request may contain multiple coherent commits as long as they remain within that issue's scope.

1. Search open and closed issues before creating a new one.
2. Use the bug or feature template and describe one concrete outcome per issue.
3. Include context, scope and out-of-scope items, affected packages, acceptance criteria, and the expected validation.
4. For complex work, add `issues/issue_<github-number>_<slug>.md` and link it from the GitHub issue. Use the same GitHub issue number in both places.
5. Create one linked branch per implementation issue, named `issue-<number>-<short-description>`, and keep its changes inside the approved scope.
6. Link the commits and pull request to the implementation issue with `#<number>`. Use `Closes #<number>` only when that pull request fully delivers the implementation issue and all of its acceptance, validation, and closure criteria are met. Use `Refs #<number>` for a parent epic or partial work.

Maintainers can manage this workflow with GitHub CLI:

```bash
gh issue list --state all
gh issue view <issue-number>
gh issue create --template bug_report.yml
gh issue create --template feature_request.yml
gh issue develop <issue-number> --name issue-<issue-number>-<short-description> --checkout
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

- Explain the problem and link the implementation issue. Use `Closes #<number>` only when the pull request fully delivers that implementation issue; use `Refs #<number>` for a parent epic or partial work.
- Keep one pull request per implementation issue. Multiple coherent commits are allowed within that pull request.
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

Only public packages in `packages/` are published to npm. Apps, plugins, documentation, `@domos/shopify`, and `@domos/woocommerce` are not published by the release workflow. Future `@owllayer/*` package names belong to the migration plan; current contributions must keep using the package names that exist in this checkout.
