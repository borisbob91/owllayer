---
"@owllayer/react": patch
"@owllayer/core": patch
"@owllayer/ui": patch
---

Shared DevTools fixes, used by the React demo instead of `PluginDevPanel`.

- `@owllayer/react`: `useDevTools()` reads the context of the latest render. The panel showed the agent state, session id and tool surface of the first render (`disconnected`, no session).
- `@owllayer/core`: `installPlugin()` records the names of the UI components declared in `plugin.ui.components` (`PluginMeta.components`), so the DevTools of every SDK show them.
- `@owllayer/ui`: the plugin inspector counts the components recorded by `installPlugin()`.
