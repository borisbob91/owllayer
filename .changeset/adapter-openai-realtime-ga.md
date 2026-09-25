---
"@owllayer/adapter-openai": minor
---

Migrate `OpenAILiveAdapter` to the Realtime GA interface (default model `gpt-realtime`), resample 16 kHz client audio to the 24 kHz PCM required by the API, and implement `interrupt()`, `updateTools()` and push-to-talk `endAudioTurn()`. Skip `temperature` for reasoning models, keep one tool call per turn, tolerate malformed tool arguments, support `gpt-4o-mini-tts` (`instructions`) and `gpt-4o-transcribe` models, and export typed model and voice lists (#77).
