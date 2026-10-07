---
"@owllayer/adapter-google": patch
---

Gemini Live sessions follow the tools of the current page with the default model (#175).

- Gemini Live reads its tools only when the connection opens. Verified on the live API: `gemini-2.5-flash-native-audio-preview-12-2025` takes a new tool list when the session is resumed with its handle, while `gemini-3.8-live` keeps the tools of the opening.
- With the default model, `GoogleLiveAdapter` sessions implement `updateTools()`: at the end of the current turn (no model answer, user turn or tool call in progress), the session resumes with its last handle and the new tools. Google keeps the conversation, so nothing is replayed. Without a handle yet, it falls back to a new connection with the replayed transcript (last 40 turns).
- New exports: `GOOGLE_LIVE_TOOL_RESUME_MODELS` and `supportsLiveToolResume(model)`.
- New option `reconnectOnToolsChange` (default `false`) for the other Live models (Gemini 3.x): a new connection opens with the new tools and the transcript history is replayed with `sendClientContent`. When it is off, those sessions have no `updateTools()` and keep the tools they were opened with.
- The reconnection waits until the previous connection is closed, and a connection that closes before opening no longer blocks the audio, text and tool responses waiting for it: the session closes and reports it through `onClose`. Error logs show the error message instead of `[object Object]`.
- The conversation passed at opening (`conversationHistory`, text then voice) is replayed for every model.
