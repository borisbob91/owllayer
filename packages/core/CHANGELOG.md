# @owllayer/core

## 0.5.0

### Minor Changes

- 3a3a4bc: New shared `HitlLabels` type for the texts of approval UIs, used by all framework SDKs (#90).

  - Fields, all optional: `title`, `message`, `approve`, `deny`, `deniedMessage` and `toolLabels` (display name per tool).

- 64281fc: `OwlLayerClient` now keeps its tools in a single `ToolRegistry` instead of scattered internal state (#152).

  - New `ToolRegistry` API: `onChange`, `lastChangedAt`, `replaceAll`, `maxTools`, `setMaxTools`, `global` and `plugin` fields on a registered tool, and global tools are kept when `removeByComponent` runs.
  - New `ToolLimitError`.
  - Tool limit: no limit before the handshake, then the server's `maxActiveTools` (30 by default). Extra registrations are refused: `registerTool` returns `false`, a `tool.registry.limit` event fires, and `onError` is called.
  - `HANDSHAKE_ACK` can carry an optional `maxActiveTools` (protocol version unchanged).
  - Tool arguments are validated against the tool's Zod schema before the approval request is sent — invalid arguments never reach an approval, and the handler receives the parsed values. `callTool` validates the same way. `RegisteredTool` now has a `schema` field.

- dd0bdd7: Provider-neutral streaming speech contracts and live session history (#109).

  - New, additive `packages/core/src/voice/streaming.ts`: `StreamingSTTService`/`StreamingTTSService` with `openTurnStream()`/`openSpeechStream()`, independent from the existing batch `STTService`/`TTSService` (a streaming-only provider never fakes a batch `transcribe()`/`synthesize()`), plus `STTTurnEvent`, `SpeechStreamState`, and the runtime guards `isStreamingSTTService`/`isStreamingTTSService`.
  - `LiveSessionConfig` gains two optional fields: `conversationHistory` (prior messages, supplied on session creation and re-creation) and `onToolCallCancelled` (ids of provider-cancelled tool calls). Purely additive — every existing `STTService`, `TTSService`, `LiveAdapter`, and `LiveSession` implementation compiles and behaves unchanged.
  - Exported from the package root (`@owllayer/core`).

- 5585c15: The agent can now use the tools of a new page right after navigating to it (#76).

  - Tools registered while the agent is busy (for example by a page mounted during a tool call) are now sent to the server.
  - After a tool that navigates, `OwlLayerClient` waits for the new page to register its tools (up to 500 ms) before returning the tool result.
  - `LLMAdapter.handleToolResult` accepts an optional third argument: the tools currently available.

- 21f1410: New `watchRouteChanges(client)` helper: sends the current page to the agent when the app changes page without a full reload (#118).

  - Detects router navigations (`history.pushState`, `replaceState`) and the browser back and forward buttons.
  - Sends an update only when the path changes; query string and hash changes are ignored.
  - Returns a cleanup function that restores `history`. Does nothing during server-side rendering.
  - Used by the Vue, Svelte, Angular and Browser SDKs; React already had the same behavior.

- 5a215ef: The voice widget no longer waits in silence when the microphone does not start.

  - `@owllayer/core`: `createMicrophoneSource()` connects the microphone at 16 kHz when the browser accepts it, and otherwise at the device rate with `downsamplePcm()` (Firefox and older Safari refuse a 16 kHz context); `getMicrophoneErrorKind()` tells a refused permission from a missing device. New labels `micPermission` and `micUnavailable`.
  - `@owllayer/react`: `useVoiceMode` uses them, exposes `micError`, and `startRecording()` resolves to `true` when recording (`false` on failure) instead of only logging the error.
  - React, Vue and Svelte widgets: a refused or missing microphone is shown in voice mode (red orb, reason under it, short status in the header); the microphone button asks again. Opening directly in voice mode still falls back to text when `fallbackToText` is set.

- 6e62051: Redesigned chat and voice widget, shared by React, Vue and Svelte, with the conversation kept between text and voice.

  - `@owllayer/core`: new stylesheet for the `call`, `chat` and `travel` presets (compact call card in voice mode, conversation panel in text mode, launcher, empty state, typing indicator, voice visualizer for listening, thinking, speaking and error, reduced motion, small screens). Each preset has its own palette (`PRESET_THEMES`), overridden by `theme`. New `WidgetLabels` keys (`switchToText`, `switchToVoice`, `close`, `muteMic`, `unmuteMic`, `emptyTitle`, `emptyText`, `linesWaitingTitle`, `linesWaitingText`, `linesBusyTitle`, `linesBusyText`); default status labels in sentence case. New `transcript` system event kind and `transcript.delta` client event.
  - `@owllayer/react`, `@owllayer/vue`, `@owllayer/svelte`: the widget uses the shared markup: header with agent state, mode switch and close button, voice controls (mute, hang up, switch to text), last transcript lines in voice mode, the same conversation in both modes. Labels replace the texts that were hard-coded in French. The microphone level drives the visualizer in every preset. `travel` opens bottom left only when no `position` is given. Svelte now scopes the widget styles under `.owllayer-widget-root`.
  - `@owllayer/server`: voice transcriptions are sent to the client (`SYSTEM_EVENT` `transcript`) and stored as one history message per spoken turn, so the conversation continues in text mode.
  - `@owllayer/adapter-google`: a Gemini Live session starts with the conversation the server passes (`conversationHistory`), so switching from text to voice keeps the context.
  - `end_call` in every SDK: the declaration is shared in `@owllayer/core` (`END_CALL_TOOL`); React, Vue and Svelte register it while the panel is open and close the panel once the agent has finished speaking (`END_CALL_TIMING`), instead of cutting its last words. Vue and Svelte did not register it before.
  - `@owllayer/ui`: DevTools `placement` option (`bottom-left` by default, away from chat widgets); `useDevTools({ placement })` in React.

### Patch Changes

- 6da45e1: The client now sends one context update per page change instead of one per tool (#105).

  - Tools and context changes made in the same render are grouped into a single `CONTEXT_UPDATE`, sent right after the render with the final state. A navigation that mounted 5 tools sent 7 messages; it now sends 1.
  - The server does less work per navigation: one tool list update, one `tools_effective` reply, and one tool update for OpenAI Realtime voice sessions.
  - The `tool.registry.synced` event and the `onToolsSync` callback fire once per group of changes, with the same final tool list.
  - `syncToolsWithServer()` still sends immediately.

- ba6bc1b: Shared DevTools fixes, used by the React demo instead of `PluginDevPanel`.

  - `@owllayer/react`: `useDevTools()` reads the context of the latest render. The panel showed the agent state, session id and tool surface of the first render (`disconnected`, no session).
  - `@owllayer/core`: `installPlugin()` records the names of the UI components declared in `plugin.ui.components` (`PluginMeta.components`), so the DevTools of every SDK show them.
  - `@owllayer/ui`: the plugin inspector counts the components recorded by `installPlugin()`.

## 0.4.0

### Minor Changes

- dc67452: Restore core i18n infrastructure with locale resolution, language packs, and message interpolation

### Patch Changes

- d5b4ecf: Exclure les source maps (`.map`) des tarballs npm publies via le champ `files`, et verifier l'absence de `.map` dans `verify-packages`.

## 0.3.0

### Minor Changes

- 1ee6cff: Complete the Core and UI naming migration as part of the final pre-publication OwlLayer cutover.

## 0.2.0

### Minor Changes

- c5a7134: Add the canonical `@owllayer/core/media/audio` subpath and keep
  `@owllayer/audio` as a compatibility shim for the migrated audio helpers.
- 17d76b3: Make `@owllayer/core` the canonical public core package and keep `@owllayer/core`
  as a temporary compatibility bridge that re-exports it. The canonical package
  adds the AITP public aliases while preserving the existing ADTP exports,
  message behavior, and wire compatibility.
