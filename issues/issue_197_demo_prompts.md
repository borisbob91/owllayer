# GitHub issue #197: Demo server, one system prompt per demo app

**GitHub issue**: https://github.com/borisbob91/owllayer/issues/197
**Status**: implemented on branch `issue-197-demo-prompts`
**Domain**: demo server (`apps/demo-server`)

## Problem

The demo server serves five client apps with their own API keys, but only the Vue admin and the Svelte travel apps had their own system prompt. The React shop, the Angular marketplace and the vanilla browser shop shared the generic prompt, written for the React shop. No prompt told the assistant to open the page it talks about or to recap each step.

## Changes

| App | Key (`.env`) | Prompt (`src/i18n/messages.ts`) | Before |
|---|---|---|---|
| React shop | `OWLLAYER_API_KEY` | `shopPrompt` (new) | generic prompt |
| Vue admin | `OWLLAYER_ADMIN_API_KEY` | `adminPrompt` (rewritten) | own prompt |
| Svelte travel | `OWLLAYER_TRAVEL_API_KEY` | `travelPrompt` (rewritten) | own prompt |
| Angular marketplace | `OWLLAYER_ANGULAR_API_KEY` and `pk_angular_demo` | `marketplacePrompt` (new) | generic prompt |
| Vanilla browser shop | `OWLLAYER_BROWSER_API_KEY` | `browserShopPrompt` (new) | generic prompt |

- Every prompt starts with the same rules (`SHARED_RULES`, English and French):
  - show what the assistant talks about by opening the page that shows it;
  - act with the tools instead of describing, never pretend an action is done;
  - read prices, stock, totals and lists from the page context or a tool;
  - recap each step and suggest the next one;
  - go to the right page when something is not available on the current one;
  - let the user confirm sensitive actions on screen;
  - short sentences in voice.
- Each app prompt then gives its role and how to guide the user through the app (which page to show at each step, what to recap). The prompts name no tool and no route: the model already receives the tool declarations and the navigation routes.
- `systemPrompt` and `livePrompt` keep only the shared rules; they serve keys without a dedicated prompt.
- The startup banner lists the prompt attached to each key.
- No prompt contains data that changes per user or page: data comes from the page context or the tools.

## Notes

- The vanilla browser demo connects with `pk_demo_local` unless `VITE_OWLLAYER_API_KEY` is set. To get the browser shop prompt, start it with `VITE_OWLLAYER_API_KEY=pk_browser_demo` (changing its default is a separate change in `apps/demo-browser`).
- The previous shop prompt listed promotion tools (`apply_promo_code`, `get_current_promotions`, `get_flash_sale`) that the demo server does not install (`@owllayer-plugins/demo-promotions` is a dependency but is never installed). The new prompts name no tool.
- In voice, the prompt of the key is used once #196 is merged; before that, streamed voice uses the generic live prompt.

## Verification

- `pnpm --filter @owllayer/demo-server build` passes.
- Started `dist/servers/google.js` with the five keys: each key is registered with its prompt and the banner lists them.
