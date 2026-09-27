# GitHub issue #135: Fix vulnerable production dependencies reported by Snyk

**GitHub issue**: https://github.com/borisbob91/owllayer/issues/135 (epic)
**Sub-issues**: #136 to #148, one per package
**Status**: fixed on branch `issue-135-security-dependency-updates`, one commit per sub-issue
**Domain**: dependencies only (manifests, lockfile, Dockerfiles), plus two small config changes required by major upgrades

## Summary

Snyk flags most manifests of the monorepo. `pnpm audit --prod` on `master`
(bdb013d) gives the same picture for production dependencies:

| | Critical | High | Moderate | Low |
|---|---|---|---|---|
| Before | 3 | 74 | 80 | 6 |
| After | 0 | 0 | 1 | 0 |

The remaining moderate finding is `esbuild` 0.21.5, pinned by the root
`pnpm.overrides` (see Out of scope).

## Findings and fixes per package

| Sub-issue | Package | Main findings | Fix |
|---|---|---|---|
| #136 | `packages/server` | `tar` 6 (critical) via `bcrypt` 5 → `node-pre-gyp`; `hono`, `fast-uri`, `mysql2`, `deepmerge-ts`… via the Prisma CLI; `ws` | `bcrypt` 6, Prisma 7.10, `ws` ^8.22, two root overrides for versions the Prisma CLI pins exactly |
| #137 | `packages/adapter-google` | `protobufjs` 7.5.4 (critical) via `@google/genai` | `@google/genai` ^1.52, lockfile refresh (`protobufjs` 7.6.6) |
| #138 | `packages/adapter-livekit` | `sharp` 0.34, OpenTelemetry 1.x / 2.2 via `@livekit/agents` 1.5 | `@livekit/agents` + plugin 1.9.0, `@livekit/rtc-node` 0.13.35 |
| #139 | `packages/adapter-openai` | `ws` 8.19 | `ws` ^8.22 |
| #140 | `packages/adapter-anthropic` | `form-data` 4.0.5 | lockfile refresh (4.0.6) |
| #141 | `apps/demo-angular` | 13 Angular advisories, 9 with no 19.x fix | Angular 20.3.32 (demo, and SDK devDependencies) |
| #142 | `apps/demo-vue` | `postcss` 8.5.6, `nanoid` 3.3.11 via Vue | lockfile refresh |
| #143 | `apps/demo-svelte` | `svelte` 5.53, `devalue` 5.6 | `svelte` ^5.57.1 |
| #144 | `apps/demo-react` | React Router 6 (2 advisories with no 6.x fix) | React Router 7.18 |
| #145 | `apps/dashboard` | React Router 6, `lodash` via `recharts` | React Router 7.18 (`lodash` fixed by #136) |
| #146 | `apps/docs-site` | `astro` 5 (critical RCE, XSS, SSRF), `sharp` 0.33 | Astro 7.3, Starlight 0.42, `sharp` 0.35 |
| #147 | `docs-site/Dockerfile` | `node:20-alpine` (Node 20 end of life) | `node:22-alpine` |
| #148 | `apps/demo-server/Dockerfile` | `node:20-alpine` | `node:22-alpine` |

`apps/demo-server`, `apps/demo-server-livekit` and `plugins/demo-promotions`
have no vulnerable dependency of their own: their npm findings come from
`@owllayer/server` and the adapters, and disappear with #136 to #140.

## Decisions

- **One lockfile, shared entries.** pnpm keeps one entry per version, so a
  refresh fixes every package that uses it. Each shared dependency was
  refreshed in the commit of the package it belongs to most directly
  (`lodash` and `fast-uri` in #136, `ws` in #139, `form-data` in #140).
- **Prisma CLI pins.** `prisma` 7.10 pins `mysql2` 3.15.3 and
  `@prisma/config` pins `deepmerge-ts` 7.1.5. Root overrides
  (`prisma>mysql2`, `@prisma/config>deepmerge-ts`) move them to patched
  versions; `prisma validate` and `prisma generate` still work. The CLI is
  an optional peer of `@prisma/client`, so apps that install
  `@owllayer/server` do not get it.
- **`@livekit/agents` 1.9.0, not 1.9.1.** 1.9.0 already brings `sharp`
  0.35.4 and OpenTelemetry 2.8; 1.9.1 also requires `@livekit/rtc-node` 1.x.
- **Angular 20, not 19.2.25.** Nine advisories affect every 19.x release.
  `packages/angular` devDependencies move too, so the demo loads a single
  `@angular/core`; the SDK peer range (`>=19.0.0`) does not change.
- **Vue kept at its current version in the demo.** Bumping `vue` in
  `apps/demo-vue` alone creates a second copy of the Vue types and breaks
  `vue-tsc` on `app.use(OwlLayerPlugin)`. The fix only refreshes `postcss`
  and `nanoid`, which Vue already accepts.
- **Node 22 in Dockerfiles.** Every CI workflow runs Node 22 (supported
  until April 2027), so the native modules are known to install there.

## Code changes required by major upgrades

- `apps/demo-react/src/main.tsx`: remove the v6 `future` flags of
  `BrowserRouter` (default behavior in v7, the prop no longer exists).
- `apps/docs-site/astro.config.mjs`: `social` uses the array syntax
  required since Starlight 0.33.

## Verification

- `pnpm install --frozen-lockfile`, `pnpm build:packages`,
  `pnpm test:packages`.
- Demo builds: Angular, Vue, Svelte, React, dashboard, docs sites
  (Astro builds the same 99 pages).
- Chromium smoke tests (`vite preview` / `astro preview`): demo-angular,
  demo-react (`/`, `/cart`), dashboard, docs-site render with no new error.
- Docker is not available in this environment: the images were not built.

## Out of scope

- **Development-only dependencies** (`vitest` critical, `vite`, `tsup`,
  `jsdom`…): only used on developer machines and in CI.
- **Root `esbuild` override** (`0.21.5`): keeps GHSA-67mh-4wv8-2f99
  (moderate) in every tree, including the Astro build. Removing it needs
  its original reason to be checked first.
- `packages/angular` `mountDevTools` imports `@owllayer/ui/devtools` with a
  path built at runtime, which fails in the production build of
  demo-angular (seen during the smoke test, unrelated to Angular 20).
