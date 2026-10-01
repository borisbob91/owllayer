---
"@owllayer/adapter-google": patch
---

Gemini Live sessions now follow the tools of the current page (#175).

- `GoogleLiveAdapter` sessions implement `updateTools()`. The server already calls it after each `CONTEXT_UPDATE`; before this change the call was skipped and the session kept the tools of the page where voice started, so the agent could not use the tools of the pages it navigated to (checkout form, order confirmation).
- Gemini Live reads its tools only when the connection opens, and a session resumed with a `sessionResumption` handle keeps its original tools. When the tool list changes, the session opens a new connection with the new tools at the end of the current turn (no model answer, user turn or tool call in progress) and replays the transcript history (last 40 turns) with `sendClientContent`, so the conversation continues.
- Audio, text and tool responses sent during the reconnection go to the new connection. If the reconnection fails, the session closes and reports the error through `onError`, and the server opens a new session on the next audio.
