# @owllayer/vue

## 0.4.0

### Minor Changes

- a149154: The texts of the built-in approval modal and banner can now be customized (#91).

  - New optional `hitl.labels` option of `OwlLayerPlugin`: `title`, `message`, `approve`, `deny`, `deniedMessage` and `toolLabels` (display name per tool, shown in the banner).
  - Without configuration, the current texts are unchanged. The HITL policy message stays displayed unless `message` is set.
  - `useApproval()` returns the configured labels for custom approval UIs.

- 93a13e0: The agent now knows the current page after a Vue Router navigation (#119).

  - `OwlLayerPlugin` sends the new page to the server when the path changes, even if the page tools stay the same.
  - It stops listening when the app is unmounted.

- 6e62051: Redesigned chat and voice widget, shared by React, Vue and Svelte, with the conversation kept between text and voice.

  - `@owllayer/core`: new stylesheet for the `call`, `chat` and `travel` presets (compact call card in voice mode, conversation panel in text mode, launcher, empty state, typing indicator, voice visualizer for listening, thinking, speaking and error, reduced motion, small screens). Each preset has its own palette (`PRESET_THEMES`), overridden by `theme`. New `WidgetLabels` keys (`switchToText`, `switchToVoice`, `close`, `muteMic`, `unmuteMic`, `emptyTitle`, `emptyText`, `linesWaitingTitle`, `linesWaitingText`, `linesBusyTitle`, `linesBusyText`); default status labels in sentence case. New `transcript` system event kind and `transcript.delta` client event.
  - `@owllayer/react`, `@owllayer/vue`, `@owllayer/svelte`: the widget uses the shared markup: header with agent state, mode switch and close button, voice controls (mute, hang up, switch to text), last transcript lines in voice mode, the same conversation in both modes. Labels replace the texts that were hard-coded in French. The microphone level drives the visualizer in every preset. `travel` opens bottom left only when no `position` is given. Svelte now scopes the widget styles under `.owllayer-widget-root`.
  - `@owllayer/server`: voice transcriptions are sent to the client (`SYSTEM_EVENT` `transcript`) and stored as one history message per spoken turn, so the conversation continues in text mode.
  - `@owllayer/adapter-google`: a Gemini Live session starts with the conversation the server passes (`conversationHistory`), so switching from text to voice keeps the context.
  - `end_call` in every SDK: the declaration is shared in `@owllayer/core` (`END_CALL_TOOL`); React, Vue and Svelte register it while the panel is open and close the panel once the agent has finished speaking (`END_CALL_TIMING`), instead of cutting its last words. Vue and Svelte did not register it before.
  - `@owllayer/ui`: DevTools `placement` option (`bottom-left` by default, away from chat widgets); `useDevTools({ placement })` in React.

### Patch Changes

- c6fde63: Deepgram Voice Agent: the agent's voice reaches the client again.

  - `@owllayer/adapter-deepgram`: after a barge-in (`UserStartedSpeaking`), the session dropped agent audio until `AgentStartedSpeaking`, which the current Voice Agent API no longer sends, so every reply was silent. The output gate now reopens once the user turn is understood (final `ConversationText` from the user, `AgentThinking` or `EndOfTurn`); `AgentStartedSpeaking` is still handled.
  - Widgets (React, Vue, Svelte): in voice mode the agent's text comes from its transcription only, so a reply is no longer shown twice or replaced sentence by sentence.

- 64281fc: Tool arguments are now validated by the client before the approval request, in every SDK (#152).

  - `useAgentTool` (React, Vue), `agentTool` (Svelte), the resolvers (`useAgentToolResolver` in React and Vue, `agentToolResolver` in Svelte, `registerToolResolver` in Angular) and Angular `registerTool` pass their schema to the client. The SDKs no longer validate arguments in their own wrapper, so there is one validation path.
  - An invalid call now fails with `Validation args "<name>": <issue>`. Resolvers used `Validation failed for "<name>"`, and Svelte `agentTool`, `navigateTool` and `uiStateTool` used the bare issue message.
  - A resolver no longer calls its handler or its hooks (`onBeforeCall`, `onBeforeAnyCall`, `onError`, `onErrorAnyCall`) for an invalid call. Errors thrown by the handler still reach `onError` and `onErrorAnyCall`.
  - Angular: a tool registered with a `schema` (service `registerTool`, `owllayerTool` directive, tool button, `registerNavigationTool`, `registerViewStateTool`) now has its arguments validated. Before, the schema only described the parameters.
  - Svelte: `navigateTool` and `uiStateTool` accept a `global` option, as in Angular. `navigate` is global by default and stays registered when its node is removed; `ui_state` is local by default.

- 5a215ef: The voice widget no longer waits in silence when the microphone does not start.

  - `@owllayer/core`: `createMicrophoneSource()` connects the microphone at 16 kHz when the browser accepts it, and otherwise at the device rate with `downsamplePcm()` (Firefox and older Safari refuse a 16 kHz context); `getMicrophoneErrorKind()` tells a refused permission from a missing device. New labels `micPermission` and `micUnavailable`.
  - `@owllayer/react`: `useVoiceMode` uses them, exposes `micError`, and `startRecording()` resolves to `true` when recording (`false` on failure) instead of only logging the error.
  - React, Vue and Svelte widgets: a refused or missing microphone is shown in voice mode (red orb, reason under it, short status in the header); the microphone button asks again. Opening directly in voice mode still falls back to text when `fallbackToText` is set.

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

## 0.3.0

### Minor Changes

- dc67452: Restore i18n support in Vue SDK with composable bindings and reactive locale switching

### Patch Changes

- d5b4ecf: Exclure les source maps (`.map`) des tarballs npm publies via le champ `files`, et verifier l'absence de `.map` dans `verify-packages`.
- Updated dependencies [d5b4ecf]
- Updated dependencies [dc67452]
  - @owllayer/core@0.4.0

## 0.2.0

### Minor Changes

- 6a9a96b: Migrate framework SDK packages to canonical `@owllayer/*` naming as part of the final pre-publication cutover.

### Patch Changes

- Updated dependencies [1ee6cff]
  - @owllayer/core@0.3.0

## 0.1.2

### Patch Changes

- Updated dependencies [17d76b3]
  - @owllayer/core@0.1.1

## 0.1.1

### Patch Changes

- a8ad67a: Use browser-safe ESM imports in CRUD resolver helpers so declaration builds and runtime calls do not depend on CommonJS `require`. Normalize plugin worker errors safely when the runtime reports a non-`Error` value.
