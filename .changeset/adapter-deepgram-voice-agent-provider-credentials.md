---
"@owllayer/adapter-deepgram": minor
---

`DeepgramVoiceAgentAdapter` settings: revised Voice Agent `think`/`speak` provider credential policy (research R6, revised).

- `DEEPGRAM_THINK_PROVIDERS` and `DEEPGRAM_SPEAK_PROVIDERS` are now closed catalogs mapping each provider to a `DeepgramProviderCredentialPolicy` (`deepgramManaged`, `providerCredential: 'none' | 'optional' | 'required'`, `credentialKind?: 'api-key' | 'aws'`) instead of a plain id list — both cases are now supported explicitly: Deepgram-managed providers (`open_ai`, `anthropic`, `google`, and now `nvidia`, catalog model `nemotron-3-nano-30B-A3B`) accept an optional provider credential, and third-party providers routed through the integrator's own deployment (`groq`, `aws_bedrock` for `think`; `open_ai`, `eleven_labs`, `cartesia`, `aws_polly` for `speak`) require one.
- `think.provider` and `speak.provider` are closed Zod enums (an unlisted value fails `deepgramVoiceAgentSettingsSchema.safeParse` itself, translated to `UNSUPPORTED_PROVIDER`); added `think.endpointUrl` and `speak.provider`/`speak.model`/`speak.endpointUrl` (all `https://`-only when set, required for any non-Deepgram-managed provider).
- New `validateDeepgramVoiceAgentOptions(options)` validates a full `DeepgramVoiceAgentOptions` (settings + optional `thinkProviderCredential`/`speakProviderCredential`, typed `DeepgramProviderCredential`) against this policy and throws the new non-retryable `PROVIDER_CREDENTIAL_REQUIRED` code when a required credential is missing, or `INVALID_SETTINGS` when one is supplied for a `'none'` policy or of the wrong kind. Credentials are never part of `DeepgramVoiceAgentSettings` and never appear in a thrown error message.
- Fixed `DeepgramAuraVoice` to stay a true literal union derived from `DEEPGRAM_AURA_VOICES_BY_LANGUAGE` (was silently widened to `string`), and the `speak.voice`/language coherence check to only apply to the Deepgram-managed speak provider.
