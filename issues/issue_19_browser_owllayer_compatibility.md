# GitHub Issue #19: Browser SDK canonical package migration and compatibility shim

**GitHub issue**: [#19 — Migrate `@owllayer/browser` to `@owllayer/browser`](https://github.com/borisbob91/owllayer/issues/19)
**Parent**: [#14 — Migrate OwlLayer to OwlLayer AI](https://github.com/borisbob91/owllayer/issues/14)
**Status**: Technical canvas for #19 implementation

## Objective

Deliver the complete Browser SDK package migration for OwlLayer AI while preserving existing
consumer imports. `packages/browser` becomes the canonical public `@owllayer/browser`
package. `packages/browser-legacy` publishes a temporary public `@owllayer/browser`
compatibility shim that re-exports the canonical root, `./cdn`, and `./core` surfaces.

## Approved compatibility decision

- `@owllayer/browser` is the canonical public Browser SDK package and the installation target for
  new integrations.
- `@owllayer/browser` is a temporary public compatibility package during the documented
  migration period.
- The compatibility package depends on and re-exports `@owllayer/browser`.
- Existing packages and applications keep their current `@owllayer/browser` imports in this issue.

## Implementation scope

- Rename the canonical package in `packages/browser` to `@owllayer/browser`.
- Update internal imports within `packages/browser/src` from `@owllayer/core` to `@owllayer/core` and `@owllayer/ui` to `@owllayer/ui`.
- Create `packages/browser-legacy` publishing `@owllayer/browser` shim re-exporting `@owllayer/browser`.
- Update package README files and build configurations.

## Acceptance criteria

- [ ] `packages/browser` publishes as `@owllayer/browser`.
- [ ] `packages/browser-legacy` publishes as `@owllayer/browser` and directly re-exports canonical entry points.
- [ ] `pnpm --filter @owllayer/browser build` passes.
- [ ] `pnpm --filter @owllayer/browser build` passes.
