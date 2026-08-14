# @domos/core

Temporary compatibility package for existing DomOS consumers.

## Migration

New integrations should install the canonical package:

```bash
pnpm add @owllayer/core
```

Existing integrations may keep using `@domos/core` during the migration:

```bash
pnpm add @domos/core
```

This package is a compatibility shim only. It depends on and re-exports
`@owllayer/core`; it does not duplicate the protocol or runtime implementation.
The existing ADTP public names and behavior therefore remain available through
the unchanged `@domos/core` import.

AITP is the canonical public terminology. `@owllayer/core` exposes the
additive `AITP_VERSION`, `AITPMessage`, and `AITPMessageMeta` aliases while
continuing to expose `ADTP_VERSION`, `ADTPMessage`, and `ADTPMessageMeta`.
