# @owllayer/adapter-openai

## 0.4.0

### Minor Changes

- 9c02041: The OpenAI adapters now work with the current OpenAI API, including the Realtime GA voice interface (#77).

  - Realtime voice uses the GA interface. The default model is `gpt-realtime-1.5`, and `reasoningEffort` defaults to `low` on `gpt-realtime-2*` models.
  - Microphone audio is resampled from 16 kHz to the 24 kHz the API expects. Before, it was played 1.5x too fast, which hurt voice detection and transcription.
  - New Realtime methods: `interrupt()` (barge-in), `updateTools()` (tools of the new page after a navigation) and `endAudioTurn()` (push-to-talk).
  - Realtime tool results are sent as JSON objects. Plain strings are wrapped as `{ response_text }`.
  - Text chat: `temperature` is no longer sent to reasoning models unless you set it, one tool call is handled per turn, and malformed tool arguments no longer break the turn.
  - `gpt-4o-mini-tts` (with `instructions`) and `gpt-4o-transcribe` models are supported.
  - Typed lists of models and voices are exported.

- 9c02041: Add an optional thinking mode toggle for DeepSeek-compatible chat APIs.

### Patch Changes

- Updated dependencies [6da45e1]
- Updated dependencies [3a3a4bc]
- Updated dependencies [5585c15]
- Updated dependencies [21f1410]
  - @owllayer/core@0.5.0

## 0.3.0

### Minor Changes

- dc67452: Restore i18n support for OpenAI adapter with complete translation catalog integration

### Patch Changes

- d5b4ecf: Exclure les source maps (`.map`) des tarballs npm publies via le champ `files`, et verifier l'absence de `.map` dans `verify-packages`.
- Updated dependencies [d5b4ecf]
- Updated dependencies [dc67452]
  - @owllayer/core@0.4.0

## 0.2.0

### Minor Changes

- 6a9a96b: Migrate adapters to the canonical `@owllayer/*` naming as part of the final pre-publication cutover.

### Patch Changes

- Updated dependencies [1ee6cff]
  - @owllayer/core@0.3.0

## 0.1.1

### Patch Changes

- Updated dependencies [17d76b3]
  - @owllayer/core@0.1.1
