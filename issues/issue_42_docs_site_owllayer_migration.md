# GitHub Issue #42: Migrate the VitePress site to OwlLayer AI

**GitHub issue**: [#42](https://github.com/borisbob91/domos/issues/42)
**Parent**: [#14](https://github.com/borisbob91/domos/issues/14)
**Dependency**: [#15](https://github.com/borisbob91/domos/issues/15), merged

## Narrow objective

Migrate the private VitePress documentation experience from legacy DomOS public
presentation to the canonical OwlLayer AI terminology. Preserve executable
examples, legacy API names, current package imports, and the ADTP wire contract
through their documented compatibility period.

## Source inventory

- `docs-site/.vitepress/config.mts` controls public metadata, navigation, and
  the site footer.
- `docs-site/index.md`, introduction, concepts, architecture, and protocol
  pages define the landing and core public terminology.
- The remaining VitePress guide pages describe SDKs, tools, security, LiveKit,
  deployment, and integrations using the same public vocabulary.

## Allowed scope

- Update public prose, headings, frontmatter, navigation labels, metadata, and
  footer branding in `docs-site/`.
- Use **OwlLayer AI**, **Agentic UI SDK**, **OwlLayer AI Runtime**, and **AITP
  — Agent-to-Interface Transfer Protocol** consistently in public prose.
- Preserve `/adtp-protocol` as the compatibility URL and describe ADTP as
  legacy terminology where relevant.
- Keep current executable `@domos/*` examples, DomOS API names, ADTP wire
  identifiers, and protocol literals accurate until their dedicated migrations
  are merged.
- Add this English local technical canvas.

## Forbidden scope

- Package manifests, package names, source APIs, runtime identifiers, or
  protocol semantics.
- Deployment configuration, assets, publishing, or documentation-site hosting.
- Renaming the existing protocol page URL without a separately approved
  redirect implementation.
- Repository-wide terminology replacement or historical-document rewrites.

## Compatibility and security constraints

This is a documentation-only change. It must not alter AITP or ADTP message
semantics, transport ordering, HITL behavior, permissions, credentials, or
current package installation instructions. No secrets, personal paths, or
operational details belong in the public issue or site content.

## Expected validation

- `pnpm --filter docs-site build` passes.
- Internal navigation and Markdown links resolve.
- A targeted terminology scan confirms public branding while preserving current
  executable `@domos/*` and DomOS API examples.
- `git diff --check` passes.

## Closure conditions

- The site uses OwlLayer AI terminology consistently in public prose.
- AITP is documented as the canonical terminology without changing the ADTP
  compatibility contract.
- Existing protocol URLs and executable examples remain valid.
- The VitePress production build succeeds, and the change remains documentation
  only within issue #42.
