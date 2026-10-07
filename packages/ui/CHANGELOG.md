# @owllayer/ui

## 0.5.0

### Minor Changes

- 6e62051: Redesigned chat and voice widget, shared by React, Vue and Svelte, with the conversation kept between text and voice.

  - `@owllayer/core`: new stylesheet for the `call`, `chat` and `travel` presets (compact call card in voice mode, conversation panel in text mode, launcher, empty state, typing indicator, voice visualizer for listening, thinking, speaking and error, reduced motion, small screens). Each preset has its own palette (`PRESET_THEMES`), overridden by `theme`. New `WidgetLabels` keys (`switchToText`, `switchToVoice`, `close`, `muteMic`, `unmuteMic`, `emptyTitle`, `emptyText`, `linesWaitingTitle`, `linesWaitingText`, `linesBusyTitle`, `linesBusyText`); default status labels in sentence case. New `transcript` system event kind and `transcript.delta` client event.
  - `@owllayer/react`, `@owllayer/vue`, `@owllayer/svelte`: the widget uses the shared markup: header with agent state, mode switch and close button, voice controls (mute, hang up, switch to text), last transcript lines in voice mode, the same conversation in both modes. Labels replace the texts that were hard-coded in French. The microphone level drives the visualizer in every preset. `travel` opens bottom left only when no `position` is given. Svelte now scopes the widget styles under `.owllayer-widget-root`.
  - `@owllayer/server`: voice transcriptions are sent to the client (`SYSTEM_EVENT` `transcript`) and stored as one history message per spoken turn, so the conversation continues in text mode.
  - `@owllayer/adapter-google`: a Gemini Live session starts with the conversation the server passes (`conversationHistory`), so switching from text to voice keeps the context.
  - `end_call` in every SDK: the declaration is shared in `@owllayer/core` (`END_CALL_TOOL`); React, Vue and Svelte register it while the panel is open and close the panel once the agent has finished speaking (`END_CALL_TIMING`), instead of cutting its last words. Vue and Svelte did not register it before.
  - `@owllayer/ui`: DevTools `placement` option (`bottom-left` by default, away from chat widgets); `useDevTools({ placement })` in React.

### Patch Changes

- ba6bc1b: Shared DevTools fixes, used by the React demo instead of `PluginDevPanel`.

  - `@owllayer/react`: `useDevTools()` reads the context of the latest render. The panel showed the agent state, session id and tool surface of the first render (`disconnected`, no session).
  - `@owllayer/core`: `installPlugin()` records the names of the UI components declared in `plugin.ui.components` (`PluginMeta.components`), so the DevTools of every SDK show them.
  - `@owllayer/ui`: the plugin inspector counts the components recorded by `installPlugin()`.

- Updated dependencies [6da45e1]
- Updated dependencies [3a3a4bc]
- Updated dependencies [64281fc]
- Updated dependencies [dd0bdd7]
- Updated dependencies [5585c15]
- Updated dependencies [21f1410]
- Updated dependencies [ba6bc1b]
- Updated dependencies [5a215ef]
- Updated dependencies [6e62051]
  - @owllayer/core@0.5.0

## 0.4.0

### Minor Changes

- 396b74c: Restore i18n support in UI dashboard with multi-language translations and locale switching

### Patch Changes

- d5b4ecf: Exclure les source maps (`.map`) des tarballs npm publies via le champ `files`, et verifier l'absence de `.map` dans `verify-packages`.
- Updated dependencies [d5b4ecf]
- Updated dependencies [dc67452]
  - @owllayer/core@0.4.0

## 0.3.0

### Minor Changes

- 1ee6cff: Complete the Core and UI naming migration as part of the final pre-publication OwlLayer cutover.

### Patch Changes

- Updated dependencies [1ee6cff]
  - @owllayer/core@0.3.0

## 0.2.0

### Minor Changes

- 7f0bb7f: The canonical UI package is now published as `@owllayer/ui`. The new `@owllayer/ui` package is a compatibility shim that re-exports the root, dashboard, and devtools surfaces so existing imports continue to work while consumers migrate.

## 0.1.1

### Patch Changes

- Updated dependencies [17d76b3]
  - @owllayer/core@0.1.1
