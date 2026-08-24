# GitHub Issue #28: Server Runtime canonical package migration and compatibility shim

**GitHub issue**: [#28 — Migrate `@owllayer/server` to `@owllayer/server`](https://github.com/borisbob91/owllayer/issues/28)
**Parent**: [#14 — Migrate OwlLayer to OwlLayer AI](https://github.com/borisbob91/owllayer/issues/14)
**Status**: Technical canvas for #28 implementation

## Objective

Deliver the complete Server Runtime package migration for OwlLayer AI while preserving existing
consumer imports. `packages/server` becomes the canonical public `@owllayer/server`
package. `packages/server-legacy` publishes a temporary public `@owllayer/server`
compatibility shim that re-exports the canonical root and `./adapters/express` surfaces.

## Approved compatibility decision

- `@owllayer/server` is the canonical public Server Runtime package and the installation target for
  new integrations.
- `@owllayer/server` is a temporary public compatibility package during the documented
  migration period.
- The compatibility package depends on and re-exports `@owllayer/server`.
- Existing packages and applications keep their current `@owllayer/server` imports in this issue.

## Implementation scope

- Rename the canonical package in `packages/server` to `@owllayer/server`.
- Update internal imports within `packages/server/src` from `@owllayer/core` to `@owllayer/core` and `@owllayer/ui` to `@owllayer/ui`.
- Create `packages/server-legacy` publishing `@owllayer/server` shim re-exporting `@owllayer/server`.
- Update package README files, build configurations, and release scope script.

## Acceptance criteria

- [ ] `packages/server` publishes as `@owllayer/server`.
- [ ] `packages/server-legacy` publishes as `@owllayer/server` and directly re-exports canonical entry points.
- [ ] `pnpm --filter @owllayer/server build` passes.
- [ ] `pnpm --filter @owllayer/server build` passes.
