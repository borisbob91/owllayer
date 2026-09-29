---
"@owllayer/adapter-anthropic": minor
---

Typed catalog for Claude models, deprecated models and warnings (#164), aligned on `@owllayer/adapter-deepgram`.

- New exports: `ANTHROPIC_MODELS` (current lineup and legacy-available Claude models), `ANTHROPIC_DEFAULT_MODEL`, `ANTHROPIC_LANGUAGES`, `isKnownAnthropicModel`, `anthropicSupportsLanguage`, `ANTHROPIC_DEPRECATED_MODELS`, `getAnthropicDeprecatedModel`, `ANTHROPIC_CATALOG_VERIFIED_AT`.
- `AnthropicAdapterOptions.model` widens from `string` to a catalog id or any string; every value accepted before this change is still accepted. `ANTHROPIC_DEFAULT_MODEL` stays `claude-sonnet-5` (confirmed Active, not deprecated).
- Constructing `AnthropicAdapter` with a deprecated or retired model (constant or free string) now logs one warning naming the replacement; the configured value is still used.
- `getCapabilities()` is now built from the exported catalog instead of an inline list (adds `claude-fable-5-1`, `claude-fable-5`, `claude-opus-5-5`, `claude-opus-4-8`, `claude-opus-4-7`, `claude-opus-4-6`, `claude-opus-4-5`, `claude-sonnet-5-5`, `claude-sonnet-4-6`, `claude-sonnet-4-5` alongside the previously listed `claude-sonnet-5`, `claude-opus-5`, `claude-haiku-4-5`).
