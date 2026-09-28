# Local issue: tool registry, approval dialog isolation, two documentation sites

**GitHub issue**: none yet (local analysis, findings F-11, F-12 and F-13)
**Status**: To decide — no code changed
**Domains**: `core`, `vue` / `svelte` / `angular`, documentation

Found while aligning the README and the VitePress documentation with the code
(27/09/2026). Each item below gives the evidence, the risk, and what should be
done. None of them blocks a release.

---

## F-11 — The client and the browser SDK do not use `ToolRegistry`

**Severity**: Major (duplicated tool logic, server failure above 30 tools) — **Type**: refactor to plan

### Evidence

- `packages/core/src/tools/registry.ts` defines `ToolRegistry` (`add`, `remove`,
  `removeByComponent`, `diff`, `flush`, a `maxTools` limit from
  `DEFAULTS.MAX_ACTIVE_TOOLS`). It is exported by `@owllayer/core` and covered by
  `packages/core/tests/registry.test.ts`.
- `OwlLayerClient` does not use it. It keeps its own `Map` of tools
  (`registerTool`, `unregisterTool`, `unregisterToolsByComponent` in
  `packages/core/src/client/OwlLayerClient.ts`) and sends the full list in each
  `CONTEXT_UPDATE`.
- The server uses it: `SessionManager` creates one `ToolRegistry` per session
  and, on each `CONTEXT_UPDATE`, calls `clear()` then `add()` for every tool.
- The browser SDK keeps two more maps of tool definitions
  (`BrowserOwlLayer`, `BrowserOwlLayerCore`).
- The batching of `CONTEXT_UPDATE` messages (#105) was built on the client's own
  map, not on `ToolRegistry`.

### Consequences

- The rules about tools (replacement, global protection, component ownership,
  what is sent to the server) live in two or three places.
- The limit (`MAX_ACTIVE_TOOLS`, 30) only exists on the server. The client
  accepts any number of tools; with 31, `add()` throws while the server copies
  the list, the session keeps a partial list, and the developer is not told.
- The diff logic (`flush()`) is unused: every `CONTEXT_UPDATE` carries the whole
  tool list (changing that would change AITP behavior).
- The documentation and the diagrams said "ToolRegistry" for the client
  registry, which points readers to a class the runtime does not use. The new
  diagrams say "Tool registry" (the concept), not the class name.

### What should be done

Recommended: option 1, one registry for the client, the browser SDK and the
server. A specification is in preparation (single tool registry).

1. **Use it everywhere**: make `OwlLayerClient` and the browser SDK store
   their tools in a `ToolRegistry`. Keep the `global` protection of
   `unregisterToolsByComponent` (the class does not know `global` today, so add
   it or filter in the client). Decide what happens when `maxTools` is reached
   (throw, as today in the class, or warn and ignore). Add client tests for the
   limit and for global tools.
2. **Keep it as a standalone helper**: mark it in the API reference as a helper
   for custom runtimes, not the registry used by `OwlLayerClient`.
3. **Deprecate it** in a minor release, then remove it in the next major. Direct
   removal would break the public API of `@owllayer/core`.

---

## F-12 — Approval dialog isolation differs between SDKs

**Severity**: Small to medium (security by design) — **Type**: UI + docs

### Evidence

| SDK | Approval UI | Rendering |
|---|---|---|
| React | `hitl.ApprovalModal.tsx`, `hitl.ApprovalBanner.tsx` | `ShadowContainer`, closed Shadow DOM (`attachShadow({ mode: 'closed' })`) |
| Browser | `HitlOverlay.tsx` | closed Shadow DOM |
| Vue | `hitl.ApprovalModal.vue`, `hitl.ApprovalBanner.vue` | light DOM |
| Svelte | `hitl.ApprovalModal.svelte`, `hitl.ApprovalBanner.svelte` | light DOM |
| Angular | `OwlLayerApprovalModalComponent` | light DOM (no Shadow DOM encapsulation) |

Documentation mismatch: `docs-site/headless-shadow-dom.md` (line 61) says the
widget renders inside `#shadow-root (open)`, while the browser widget attaches
`mode: 'closed'` (`packages/browser/src/ui/OwlLayerChatWidget.tsx`).

The README and Core Concepts now state the closed Shadow DOM for React and
browser only, which is true today.

### Risk

In Vue, Svelte and Angular, page scripts and page CSS can reach the approval
buttons. Concrete cases:

- a third-party script on the page can click "Approve" or hide the dialog;
- if the application exposes a tool whose click target comes from the model's
  arguments (for example a generic "click element" tool), the agent could click
  the approval button of its own pending call;
- global CSS of the host application can make the dialog unreadable.

### What should be done

1. **UI**: render the approval dialog of Vue, Svelte and Angular in a closed
   Shadow DOM, like React:
   - Vue: mount the dialog in a host element with `attachShadow({ mode: 'closed' })`
     and inject the styles from `generateWidgetStyles(theme, preset, ':host')`;
   - Svelte: same approach with a host element and a mounted component;
   - Angular: a host element with a closed shadow root (Angular's
     `ViewEncapsulation.ShadowDom` uses an open root, so it is not enough on its
     own).
   Keep keyboard focus management and accessibility (focus trap, `role="dialog"`,
   `aria-modal`) inside the shadow root.
2. **Tests**: one test per SDK checking that the dialog host has no reachable
   `shadowRoot` from the page (`host.shadowRoot === null` with a closed root) and
   that approving through the dialog still resolves the call.
3. **Docs**: in `headless-shadow-dom.md`, replace "open" by "closed" for the
   browser widget, and add a short table of the isolation per SDK until item 1
   is done. When item 1 is done, update the README (section 9) and Core Concepts
   (HITL) to say "every SDK".

Follow the Light DOM styling rule of `AGENTS.md`: Vue and Svelte currently use
`.owllayer-widget-root` as the style context; moving the dialog to a shadow root
means using `:host` for that dialog only.

---

## F-13 — Two documentation sites in the repository

**Severity**: Question (maintenance cost) — **Type**: repository structure

### Evidence

- `docs-site/` (VitePress) is the published site: `pages-docs.yml` builds it,
  `docs-publish.yml` copies it to `docs/published`, and it is listed in
  `pnpm-workspace.yaml`.
- `apps/docs-site/` (Astro Starlight) is a second site with 79 tracked files:
  its own `core-concepts.mdx`, `aitp-protocol.mdx`, `HITL_SECURITY.mdx`, server
  pages, and a committed `.astro/` cache. It was still updated on 26/09/2026
  (Astro 7.3 upgrade, #146).
- `AGENTS.md` (line 39) describes `apps/docs-site` as the documentation site.
- The illustrations of `apps/docs-site/src/assets/docs` are now also available,
  in English, in `assets/docs/` (README) and `docs-site/public/diagrams/`
  (VitePress). The Astro copies are unchanged.

### Risk

Two sources of truth drift apart: the Astro pages still contain French text,
the former "tool-lifecycle" page, and wording that the VitePress site has
corrected (AITP messages, five concepts). Contributors and agents following
`AGENTS.md` edit the wrong site.

### What should be done

1. **Decide** which site is the source of truth. VitePress is the one published.
2. If the Astro site is abandoned:
   - move anything it has that VitePress lacks (check the server pages, the
     widget page, the about page) into `docs-site/`;
   - remove `apps/docs-site/` in one commit;
   - update `AGENTS.md` (structure block and any mention of Astro / Starlight);
   - drop the Astro dependency updates from Dependabot or Renovate if configured.
3. If it is kept (for example as a future site), say so in `AGENTS.md`, stop
   tracking `apps/docs-site/.astro/` (add it to `.gitignore`), and mark which
   pages are authoritative.
