---
"@owllayer/adapter-google": patch
---

Gemini Live sessions keep the tools they were opened with; following the page tools is opt-in (#175).

- Gemini Live reads its tools only when the connection opens, and a session resumed with a `sessionResumption` handle keeps its original tools.
- New option `reconnectOnToolsChange` (default `false`). When it is on, the session implements `updateTools()`: when the tool list changes, it opens a new connection with the new tools at the end of the current turn (no model answer, user turn or tool call in progress) and replays the transcript history (last 40 turns) with `sendClientContent`. Audio, text and tool responses sent during the reconnection go to the new connection. If the reconnection fails, the session closes and reports the error through `onError`.
- When it is off, the session has no `updateTools()`: navigation never cuts the voice. The conversation passed at opening (`conversationHistory`, text then voice) is still replayed.
