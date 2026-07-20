# Security Policy

## Supported Versions

DomOS is under active development. Security fixes are applied to the latest
release on the `master` branch.

## Reporting a Vulnerability

If you discover a security vulnerability, **please do not open a public issue.**

Instead, report it privately using GitHub's [private vulnerability reporting](https://github.com/borisbob91/domos/security/advisories/new) so we can address it before disclosure.

Please include:

- A description of the vulnerability and its impact
- Steps to reproduce
- Affected package(s) and version(s)
- Any suggested mitigation, if known

We aim to acknowledge reports within 72 hours and will keep you updated as we
investigate and resolve the issue.

## Security Model Notes

DomOS is designed with security boundaries in mind:

- **The agent never accesses the DOM directly.** It only invokes tools your
  application explicitly declares.
- **HITL enforcement** (`high` / `critical` risk levels) requires user approval
  before sensitive actions execute. Approval UI is rendered in a closed Shadow
  DOM to prevent programmatic clicks.
- **Secrets stay server-side.** LLM and provider API keys (including LiveKit)
  are never exposed to the browser bundle. Clients receive only short-lived,
  scoped tokens.
- **Server-side controls** include API key authentication, session ownership
  checks, CORS allowlists, and rate limiting.

When building on DomOS, always assign realistic `risk` levels to your tools and
never place trusted business logic solely in tool descriptions.
