<!--
Sync Impact Report
- Version change: 1.0.0 -> 1.1.0 (MINOR: materially expanded release scope)
- Modified principles:
  - V. Public Package Release Integrity -> release scope grows from 12 to 13
    retained public packages with `@owllayer/adapter-deepgram` (epic #36);
    adding any further public package now requires a constitution amendment,
    a release-scope allowlist update and a one-time npm bootstrap
- Added sections: none
- Removed sections: none
- Templates updated:
  - ✅ .specify/templates/plan-template.md
  - ✅ .specify/templates/spec-template.md
  - ✅ .specify/templates/tasks-template.md
  - ✅ private release runbook (maintainer-only, not tracked)
- Follow-up TODOs:
  - Epic #36 DG-0 must create `packages/adapter-deepgram` and add it to
    `scripts/release/verify-release-scope.mjs` in the same change (the guard
    rejects listed packages that do not exist yet)
  - Epic #36 must drop "separate public Deepgram package" from its out-of-scope list

Previous report (1.0.0):
- Version change: unratified template -> 1.0.0
- Principles I-V ratified; release scope -> 12 retained packages after
  standalone audio retirement
- Follow-up TODOs:
  - GitHub #30 must align executable release allowlists after audio consumers migrate
-->
# OwlLayer AI Engineering Constitution

## Core Principles

### I. Canonical Brand and Protocol Continuity
OwlLayer AI MUST be used as the canonical public brand in new specifications,
plans, task lists, release material, and public-facing artifacts. AITP MUST be
used as the protocol name. This terminology change MUST preserve the current
wire behavior unless an issue explicitly approves a versioned protocol change,
compatibility analysis, and migration plan. Terminology work MUST NOT silently
change message schemas, sequencing, error behavior, or runtime semantics.

Rationale: a single public vocabulary prevents brand and protocol drift while
protecting deployed integrations from an accidental rename-driven break.

### II. Issue-First, Domain-Bounded Delivery
Every non-trivial implementation MUST reference a GitHub Issue that defines the
objective, scope, out-of-scope items, affected domain or public package,
acceptance criteria, and expected validation. One issue and one pull request
MUST cover one domain or one public package. Work spanning another domain or
package is permitted only when the issue documents the required dependency and
its approved execution order. Unrelated refactors, renames, formatting, and
cleanup MUST remain outside the change.

Rationale: narrow, traceable delivery keeps reviews reliable and prevents
cross-package changes from hiding unapproved behavior.

### III. Contract and Security Preservation
Existing contracts, public APIs, package ownership, security boundaries, and
HITL rules MUST be preserved by default. Every plan MUST analyze compatibility
and security impact before implementation. A change that alters a public
contract, AITP behavior, authentication or authorization, secret handling,
approval policy, or package ownership MUST be explicitly required by its issue
and accompanied by migration and validation evidence. Sensitive actions MUST
remain behind realistic risk classification and required human approval.

Rationale: OwlLayer AI connects agents to application-owned capabilities, so
contract and policy regressions can create both ecosystem breakage and unsafe
execution paths.

### IV. Evidence-Driven Validation
Plans and task lists MUST name concrete validation commands, affected targets,
and expected evidence. Completion MUST be supported by actual results from the
relevant lint, tests, builds, contract checks, integration scenarios, or manual
gates; assumed success is not evidence. Failed, skipped, unavailable, or timed
out validations MUST be reported accurately. Every delivery MUST finish with a
scope review and `git diff --check`.

Rationale: reproducible evidence makes acceptance decisions auditable and
prevents incomplete work from being reported as complete.

### V. Public Package Release Integrity
Functional changes to a public package MUST include behavior-appropriate tests,
documentation for user-visible behavior, tarball validation, and a Changeset.
Plans and tasks MUST identify each affected public package and preserve package
boundaries. npm publication MUST remain limited to the 13 retained public packages under
`packages/`: the 12 already published packages plus `@owllayer/adapter-deepgram`,
which enters the executable release scope in the same change that creates its
workspace. Applications, plugins, planning artifacts, and private packages
MUST NOT enter the publication set. Adding a public package MUST go through a
constitution amendment, the release-scope allowlist, and a documented one-time
npm bootstrap before automated publication. Release-scope validation MUST run
whenever publication behavior or package metadata is affected.

Rationale: package consumers need independently versioned, inspectable, and
correctly scoped artifacts rather than repository-wide accidental releases.

## Public Information Hygiene and Technical Constraints

Public issues, specifications, plans, task lists, review notes, and generated
artifacts MUST exclude credentials, authentication output, session identifiers,
personal filesystem paths, private URLs, and unnecessary account details.
Examples and evidence MUST use repository-relative paths, sanitized identifiers,
and redacted logs. Security vulnerabilities MUST follow the private reporting
process in `SECURITY.md` and MUST NOT be disclosed through public issues.

OwlLayer AI remains a strict TypeScript monorepo managed with pnpm and
Turborepo. Shared types MUST come from their owning package, SDK packages MUST
NOT import across framework boundaries, and existing package ownership MUST be
respected. AITP and public API changes require explicit compatibility treatment;
documentation-only terminology changes do not authorize runtime changes.

## Development Workflow and Quality Gates

1. Start from the referenced GitHub Issue and record scope, out-of-scope items,
   affected domain or packages, compatibility impact, security/HITL impact, and
   validation evidence expected.
2. Sequence required cross-domain or cross-package dependencies explicitly;
   complete and validate the owning dependency before its consumer.
3. Keep specifications technology-aware but outcome-focused, with independently
   testable scenarios and measurable acceptance criteria.
4. Keep plans grounded in real repository paths and existing architecture.
   Unverified assumptions MUST be labeled and resolved before implementation.
5. Generate tasks in dependency order with exact file paths, package boundaries,
   applicable tests, documentation, tarball, Changeset, and review work.
6. Before completion, perform separate scope/contract and security/information-
   hygiene reviews, resolve valid findings, rerun affected validation, and record
   final evidence.
7. End with a changed-file review and `git diff --check`. Commits, pushes, and
   publication require their normal explicit authorization and release gates.

## Governance

This constitution governs OwlLayer AI engineering work and supersedes lower-
level guidance when a conflict exists. `AGENTS.md`, `CONTRIBUTING.md`,
`SECURITY.md`, and package-specific documentation remain operational guidance
where they do not conflict with this constitution.

Amendments MUST be proposed through a scoped GitHub Issue, include the reason
and impact, update dependent Spec Kit templates in the same change, and receive
maintainer approval. Constitution versions follow semantic versioning:

- MAJOR for removing or incompatibly redefining a principle or governance rule.
- MINOR for adding a principle, mandatory gate, or materially expanded policy.
- PATCH for non-semantic clarification, wording, or typo corrections.

Every specification, plan, task list, implementation review, and pull request
MUST verify applicable constitutional gates. Any exception MUST be documented in
the governing issue and plan with rationale, risk, affected scope, migration or
rollback treatment, and explicit approval. Reviewers MUST reject undocumented
exceptions and claims unsupported by validation evidence.

**Version**: 1.1.0 | **Ratified**: 2026-08-11 | **Last Amended**: 2026-09-26
