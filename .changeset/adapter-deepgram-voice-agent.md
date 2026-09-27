---
"@owllayer/adapter-deepgram": minor
---

`DeepgramVoiceAgentAdapter`: Deepgram Voice Agent realtime mode (#113).

- New `DeepgramVoiceAgentAdapter` implementing the core `LiveAdapter` contract (`wss://agent.deepgram.com/v1/agent/converse`); `createSession()` resolves once Deepgram applies the settings and rejects, releasing the connection, when the handshake fails or times out.
- The `Settings` message carries the audio formats, the session language, the listening model (Flux for English, Nova-3 otherwise), the reasoning provider, the system prompt, the OwlLayer tools as functions without any `endpoint` (`defer_until_eot` for `high` and `critical` tools), the voice, the greeting, and the last `limits.maxHistoryMessages` messages of `conversationHistory`.
- Third-party provider credentials (`groq`, `aws_bedrock`, and non-Deepgram voices; optional own key for managed providers) are sent only inside `Settings`, as the documented endpoint header or as AWS credentials.
- Function calls become OwlLayer tool calls, answered once with `FunctionCallResponse`; the interim pending-approval answer is held until the final result; `FunctionCallCancelled` is reported through `onToolCallCancelled`; invalid JSON arguments are answered with an error and never executed.
- Barge-in drops in-flight agent audio until the agent speaks again; `UpdateThink` updates are sent one at a time; `KeepAlive` is sent only while the session is active.
- No internal reconnection: an unexpected close or a provider error is reported once through `onError` and releases everything; warnings are `agent.warning` events.
- `think.endpointUrl` is now required for `aws_bedrock`, as documented by Deepgram.
