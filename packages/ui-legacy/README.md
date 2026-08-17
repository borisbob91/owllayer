# @domos/ui

`@domos/ui` is a temporary public compatibility package for existing OwlLayer AI
Agentic UI SDK integrations.

New integrations should install the canonical package:

```bash
pnpm add @owllayer/ui
```

Existing integrations can retain their current imports during the migration period:

- `@domos/ui`
- `@domos/ui/dashboard`
- `@domos/ui/devtools`

This package depends on and re-exports `@owllayer/ui`, including its root,
`./dashboard`, and `./devtools` public surfaces. It is a compatibility shim and does
not duplicate the canonical UI runtime.
