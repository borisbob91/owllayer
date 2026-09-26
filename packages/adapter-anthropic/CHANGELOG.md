# @owllayer/adapter-anthropic

## 0.4.0

### Minor Changes

- 0e59a5a: Tools now work with `AnthropicAdapter`: Claude receives each tool result and can call the next tool (#96).

  - Tool results are sent back to Claude instead of being shown to the user as raw JSON.
  - Tool parameters are converted to the JSON Schema format required by the Claude API.
  - One tool call is handled per turn.
  - The default model is now `claude-sonnet-5`. The model list offers `claude-sonnet-5`, `claude-opus-5` and `claude-haiku-4-5`.

### Patch Changes

- Updated dependencies [6da45e1]
- Updated dependencies [3a3a4bc]
- Updated dependencies [5585c15]
- Updated dependencies [21f1410]
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
