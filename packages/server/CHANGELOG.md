# @owllayer/server

## 0.4.0

### Minor Changes

- 4255b24: Security: weak admin passwords are rejected in production, and server tool arguments are validated before the handler runs (#172).

  - The admin password must have at least 12 characters and must not be a well-known value. With `NODE_ENV=production`, a weak password stops the server from starting; otherwise it logs a warning.
  - LLM arguments are checked against the server tool's declared `parameters` (types, `required`, `enum`); invalid arguments never reach the handler.
  - A server tool registered without `risk` logs a warning, since it runs without human approval. The default stays `'none'` for now.

- f06a38f: Security: the server now bounds message sizes and rates, and runs one LLM turn at a time per session (#170).

  - WebSocket messages are capped at 4 MB (`limits.maxMessageBytes`) and HTTP request bodies at 64 KB (413 above).
  - Text inputs are capped at 8,000 characters, client tools per context update at `maxActiveTools` (30 by default; `limits.maxClientTools` can raise it but not lower it below `maxActiveTools`) and context data at 64 KB (`limits`).
  - New `rateLimit` option: 100 messages per second and 20 user messages per minute per connection by default; `userInputsPerMinutePerKey` caps all connections of an API key (off by default, set it to cap your LLM cost).
  - A user message received while the assistant is still answering is rejected with a clear error instead of starting a parallel turn. Long hybrid audio recordings may need a higher `maxMessageBytes`.

- 02cdfc8: Security: server tools, plugins and API keys can now be scoped per client app (#171).

  - New `apiKeys` option on server tools and at plugin installation: the tool is only offered to, and only runs for, those API keys. Without it, a tool stays available to every key.
  - New `allowedOrigins` per API key (`server.addApiKey(key, { allowedOrigins })`, admin API, SQLite and MongoDB stores): connections from another origin, or without an `Origin` header, are rejected.
  - Session ids are full UUIDs.

- 11f9fed: Provider-neutral streaming voice pipeline, live tool-call cancellation, and voice-mode validation (#112).

  - New `StreamingPipelineLiveAdapter` (`packages/server/src/voice/`): a `LiveAdapter` composite over any `StreamingSTTService` + `LLMAdapter` + `StreamingTTSService` from `@owllayer/core`. Plugs into the existing `live` option with no AITP change — turn-based state machine (speculative replies held until confirmed, sequential tool calls up to `maxToolCallsPerTurn`, prompt barge-in), and transparent STT stream re-opening when a provider without a keepalive closes its stream during a silence.
  - `OwlLayerServer` now passes `conversationHistory` when creating or re-creating a live session, and tracks tool calls cancelled by the live provider (`onToolCallCancelled`): the matching pending server approval is withdrawn, no response is ever sent to the provider for that call, and a late `TOOL_RESULT` is dropped.
  - New `validateVoiceRuntimeDefinition()` (exported): a pure, provider-neutral check for a voice configuration (`VOICE_MODE_CONFLICT`, `VOICE_PIPELINE_INCOMPLETE`, `VOICE_REALTIME_INCOMPLETE`).
  - When both `live` and `stt`/`tts` are configured, `live` keeps its existing precedence; the server now logs exactly one warning about it instead of staying silent. No breaking change: the constructor's existing behavior is unchanged.

- 01740c6: New opt-in `toolGuidance` option: the agent adapts how it uses each tool to its risk level (#80).

  - Each tool sent to the LLM gets a tag based on its HITL risk: `[PROACTIVE]` (none), `[PREAMBLE]` (low), `[SCREEN CONFIRMATION]` (high and critical).
  - A "Tool Behavior" section (English or French) explaining these tags is added to the system prompt, in text, hybrid and live modes.
  - Disabled by default.

- 64281fc: New `maxActiveTools` option (default 30, must be a positive integer, validated at server start) and it is now announced in `HANDSHAKE_ACK` (#152).

  - A `CONTEXT_UPDATE` that would push the tool count above the limit keeps the previous tool list — no partial session — while URL, title, and context still update, and a `SYSTEM_EVENT` of kind `error` is sent back.
  - Restored sessions keep the server's configured limit.

- de657a8: The agent can now chain tools without a new user message, for example navigate to checkout and then fill the address (#76).

  - After a tool result, the LLM receives the tools currently available, including those of a page it just opened.
  - Up to 5 tool calls can follow each other in one turn.
  - The Google adapter uses these current tools in its follow-up request.

- 6e62051: Redesigned chat and voice widget, shared by React, Vue and Svelte, with the conversation kept between text and voice.

  - `@owllayer/core`: new stylesheet for the `call`, `chat` and `travel` presets (compact call card in voice mode, conversation panel in text mode, launcher, empty state, typing indicator, voice visualizer for listening, thinking, speaking and error, reduced motion, small screens). Each preset has its own palette (`PRESET_THEMES`), overridden by `theme`. New `WidgetLabels` keys (`switchToText`, `switchToVoice`, `close`, `muteMic`, `unmuteMic`, `emptyTitle`, `emptyText`, `linesWaitingTitle`, `linesWaitingText`, `linesBusyTitle`, `linesBusyText`); default status labels in sentence case. New `transcript` system event kind and `transcript.delta` client event.
  - `@owllayer/react`, `@owllayer/vue`, `@owllayer/svelte`: the widget uses the shared markup: header with agent state, mode switch and close button, voice controls (mute, hang up, switch to text), last transcript lines in voice mode, the same conversation in both modes. Labels replace the texts that were hard-coded in French. The microphone level drives the visualizer in every preset. `travel` opens bottom left only when no `position` is given. Svelte now scopes the widget styles under `.owllayer-widget-root`.
  - `@owllayer/server`: voice transcriptions are sent to the client (`SYSTEM_EVENT` `transcript`) and stored as one history message per spoken turn, so the conversation continues in text mode.
  - `@owllayer/adapter-google`: a Gemini Live session starts with the conversation the server passes (`conversationHistory`), so switching from text to voice keeps the context.
  - `end_call` in every SDK: the declaration is shared in `@owllayer/core` (`END_CALL_TOOL`); React, Vue and Svelte register it while the panel is open and close the panel once the agent has finished speaking (`END_CALL_TIMING`), instead of cutting its last words. Vue and Svelte did not register it before.
  - `@owllayer/ui`: DevTools `placement` option (`bottom-left` by default, away from chat widgets); `useDevTools({ placement })` in React.

### Patch Changes

- a83cc31: Fixed: high and critical client tools now show the approval UI when a live voice session is active (#72).

  - The tool call is always forwarded to the browser, so the approval modal or banner appears.
  - The live voice provider receives a single response, with its own call id.

- caa63fb: A live session that reports an error is now closed when the server drops it, so the provider connection, its timers and its billing stop instead of running until the provider times out.
- ada3baf: Security: approvals and tool results are now accepted only from the session that received the request, and `untrusted` plugins are really confined (#169).

  - An approval response, a tool result or an approval timeout extension from another session or connection is ignored. Tool call ids are full UUIDs, and pending approvals are purged when their session closes.
  - `untrusted` plugin tool handlers run in a separate Node.js process with the Node permission model: no filesystem, child process, worker or native addon access unless declared in the plugin capabilities. Network is not restricted yet, and the plugin module and its `setup()` still run in the server process.
  - WebRTC signaling ignores connection ids sent by the client, caps the request body at 64 KB and checks the origin and API key before creating a peer connection.

- b1585a0: Fixed: the admin dashboard counts a page view only when the URL changes (#129).

  - Opening a modal, switching a tab or updating the context on the same page no longer adds a page view to the session history.
  - The tools sent to the agent are unchanged: components still register their tools when they mount, with or without a URL change.

- b6f28f1: Security: the server no longer installs dependencies with known vulnerabilities (#136).

  - `bcrypt` 6: prebuilt binaries, no more `@mapbox/node-pre-gyp` and its vulnerable `tar` (critical). Same API, Node.js 18 or later.
  - Prisma 7.10 (`@prisma/client`, `@prisma/adapter-pg`, `prisma` CLI).
  - `ws` 8.22 minimum.

- 3e9db5e: Fixed: after the user approves a high or critical server tool, the result now goes back to the model that called it (#128).

  - Typed request while voice mode is on: the text agent now receives the result and answers. Before, the result was sent to the voice provider with an id it did not know, and the user got no answer.
  - Voice request, voice session closed before the approval: the action still runs, but its result is no longer shown to the user as raw JSON.

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
  - @owllayer/ui@0.5.0

## 0.3.0

### Minor Changes

- dc67452: Restore i18n support in server runtime with locale negotiation and middleware integration

### Patch Changes

- d5b4ecf: Exclure les source maps (`.map`) des tarballs npm publies via le champ `files`, et verifier l'absence de `.map` dans `verify-packages`.
- Updated dependencies [d5b4ecf]
- Updated dependencies [dc67452]
- Updated dependencies [396b74c]
  - @owllayer/core@0.4.0
  - @owllayer/ui@0.4.0

## 0.2.0

### Minor Changes

- 6a9a96b: Migrate the Server package to canonical `@owllayer/server` naming as part of the final pre-publication cutover.

### Patch Changes

- Updated dependencies [1ee6cff]
  - @owllayer/core@0.3.0
  - @owllayer/ui@0.3.0

## 0.1.3

### Patch Changes

- Updated dependencies [7f0bb7f]
  - @owllayer/ui@0.1.2

## 0.1.2

### Patch Changes

- Updated dependencies [17d76b3]
  - @owllayer/core@0.1.1
  - @owllayer/ui@0.1.1

## 0.1.1

### Patch Changes

- a8ad67a: Use browser-safe ESM imports in CRUD resolver helpers so declaration builds and runtime calls do not depend on CommonJS `require`. Normalize plugin worker errors safely when the runtime reports a non-`Error` value.
