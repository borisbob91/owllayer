---
"@owllayer/server": patch
---

Fixed: voice sessions now use the system prompt of the client app's API key, like text requests (#196).

- Streamed voice (`AUDIO_STREAM`) opened the live session with the live adapter prompt only; the prompt set for the key (`setPromptOverride` or the agent store) now comes first.
- Audio sent as a user message to a live adapter fell back to the text LLM prompt when the key had none; it now falls back to the live adapter prompt.
- Order on every voice path: key prompt, then live adapter prompt, then the default. Text and hybrid requests are unchanged.
