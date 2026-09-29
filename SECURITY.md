# Security Policy

## Supported Versions

OwlLayer AI is under active development. Security fixes are applied to the latest
release on the `master` branch.

## Reporting a Vulnerability

If you discover a security vulnerability, **please do not open a public issue.**

Instead, report it privately using GitHub's [private vulnerability reporting](https://github.com/borisbob91/owllayer/security/advisories/new) so we can address it before disclosure.

Please include:

- A description of the vulnerability and its impact
- Steps to reproduce
- Affected package(s) and version(s)
- Any suggested mitigation, if known

We aim to acknowledge reports within 72 hours and will keep you updated as we
investigate and resolve the issue.

## Security Model Notes

The OwlLayer AI Runtime is designed with security boundaries in mind:

- **The agent never accesses the DOM directly.** It only invokes tools your
  application explicitly declares.
- **HITL enforcement** (`high` / `critical` risk levels) requires user approval
  before sensitive actions execute. HITL protects the user from actions decided
  by the model (for example after a prompt injection); it does not protect
  against a malicious browser, which controls its own actions. Keep business
  checks on the server for sensitive server actions, and always declare `risk`
  on server tools.
- **Secrets stay server-side.** LLM and provider API keys (including LiveKit)
  are never exposed to the browser bundle. Clients receive only short-lived,
  scoped tokens.
- **Server-side controls** include API key authentication, allowed origins
  (globally and per API key), server tools scoped per API key, approvals and
  tool results accepted only from the session that received the request,
  message size and rate limits, and validation of server tool arguments.
- **Plugins**: `untrusted` server plugin handlers run in a separate process with
  the Node permission model (no filesystem or child process access unless
  declared). Network is not restricted yet, and the plugin module itself runs
  in the server process: only install plugins you trust or have reviewed.
- **Protocol:** AITP is the public name for the Agent-to-Interface
  Transfer Protocol. It defines message semantics, ordering, transport guarantees,
  HITL rules, and wire behavior.
- **Public issue hygiene:** never publish account identities, local
  authentication state, tokens, sessions, workstation paths, private URLs, or
  private operational details in an issue or security discussion.

When building on OwlLayer AI, always assign realistic `risk` levels to your tools and
never place trusted business logic solely in tool descriptions.
