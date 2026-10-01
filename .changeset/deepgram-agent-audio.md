---
"@owllayer/adapter-deepgram": patch
"@owllayer/react": patch
"@owllayer/vue": patch
"@owllayer/svelte": patch
---

Deepgram Voice Agent: the agent's voice reaches the client again.

- `@owllayer/adapter-deepgram`: after a barge-in (`UserStartedSpeaking`), the session dropped agent audio until `AgentStartedSpeaking`, which the current Voice Agent API no longer sends, so every reply was silent. The output gate now reopens once the user turn is understood (final `ConversationText` from the user, `AgentThinking` or `EndOfTurn`); `AgentStartedSpeaking` is still handled.
- Widgets (React, Vue, Svelte): in voice mode the agent's text comes from its transcription only, so a reply is no longer shown twice or replaced sentence by sentence.
