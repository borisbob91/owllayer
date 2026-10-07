---
"@owllayer/adapter-openai": minor
---

The OpenAI adapters now work with the current OpenAI API, including the Realtime GA voice interface (#77).

- Realtime voice uses the GA interface. The default model is `gpt-realtime-1.5`, and `reasoningEffort` defaults to `low` on `gpt-realtime-2*` models.
- Microphone audio is resampled from 16 kHz to the 24 kHz the API expects. Before, it was played 1.5x too fast, which hurt voice detection and transcription.
- New Realtime methods: `interrupt()` (barge-in), `updateTools()` (tools of the new page after a navigation) and `endAudioTurn()` (push-to-talk).
- Realtime tool results are sent as JSON objects. Plain strings are wrapped as `{ response_text }`.
- Text chat: `temperature` is no longer sent to reasoning models unless you set it, one tool call is handled per turn, and malformed tool arguments no longer break the turn.
- `gpt-4o-mini-tts` (with `instructions`) and `gpt-4o-transcribe` models are supported.
- Typed lists of models and voices are exported.
