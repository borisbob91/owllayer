# @owllayer/adapter-anthropic

## 0.4.0

### Minor Changes

- 88fa853: Typed catalog for Claude models, deprecated models and warnings (#164), aligned on `@owllayer/adapter-deepgram`.

  - New exports: `ANTHROPIC_MODELS` (current lineup and legacy-available Claude models), `ANTHROPIC_DEFAULT_MODEL`, `ANTHROPIC_LANGUAGES`, `isKnownAnthropicModel`, `anthropicSupportsLanguage`, `ANTHROPIC_DEPRECATED_MODELS`, `getAnthropicDeprecatedModel`, `ANTHROPIC_CATALOG_VERIFIED_AT`.
  - `AnthropicAdapterOptions.model` widens from `string` to a catalog id or any string; every value accepted before this change is still accepted. `ANTHROPIC_DEFAULT_MODEL` stays `claude-sonnet-5` (confirmed Active, not deprecated).
  - Constructing `AnthropicAdapter` with a deprecated or retired model (constant or free string) now logs one warning naming the replacement; the configured value is still used.
  - `getCapabilities()` is now built from the exported catalog instead of an inline list (adds `claude-fable-5-1`, `claude-fable-5`, `claude-opus-5-5`, `claude-opus-4-8`, `claude-opus-4-7`, `claude-opus-4-6`, `claude-opus-4-5`, `claude-sonnet-5-5`, `claude-sonnet-4-6`, `claude-sonnet-4-5` alongside the previously listed `claude-sonnet-5`, `claude-opus-5`, `claude-haiku-4-5`).

- 0e59a5a: Tools now work with `AnthropicAdapter`: Claude receives each tool result and can call the next tool (#96).

  - Tool results are sent back to Claude instead of being shown to the user as raw JSON.
  - Tool parameters are converted to the JSON Schema format required by the Claude API.
  - One tool call is handled per turn.
  - The default model is now `claude-sonnet-5`. The model list offers `claude-sonnet-5`, `claude-opus-5` and `claude-haiku-4-5`.

### Patch Changes

- Updated dependencies [6da45e1]
- Updated dependencies [3a3a4bc]
- Updated dependencies [64281fc]
- Updated dependencies [dd0bdd7]
- Updated dependencies [5585c15]
- Updated dependencies [21f1410]
- Updated dependencies [ba6bc1b]
- Updated dependencies [5a215ef]
- Updated dependencies [6e62051]
  - @owllayer/core@0.5.0

## 0.3.0

### Minor Changes

- d48199c: Restore i18n support for Anthropic adapter with complete translation catalog integration

### Patch Changes

- d5b4ecf: Exclure les source maps (`.map`) des tarballs npm publies via le champ `files`, et verifier l'absence de `.map` dans `verify-packages`.
- Updated dependencies [d5b4ecf]
- Updated dependencies [dc67452]
  - @owllayer/core@0.4.0

## 0.2.0

### Minor Changes

- 6a9a96b: Migrate adapters to the canonical `@owllayer/*` naming as part of the final pre-publication cutover.

### Patch Changes

- Updated dependencies [1ee6cff]
  - @owllayer/core@0.3.0

## 0.1.1

### Patch Changes

- Updated dependencies [17d76b3]
  - @owllayer/core@0.1.1
