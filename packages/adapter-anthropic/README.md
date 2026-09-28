# @owllayer/adapter-anthropic

Anthropic Claude provider adapter for **OwlLayer AI**. Connect Claude models (Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus) to the OwlLayer server and Agentic UI pipeline.

---

## Features

- **Claude Models Integration**: Full support for Claude 3.5 Sonnet, Claude 3.5 Haiku, and Claude 3 Opus via `@anthropic-ai/sdk`.
- **Native Tool Use**: Automatic conversion of OwlLayer tool schemas to Anthropic tools format.
- **System Prompts & Extended Thinking**: Seamless passing of system context and constraints to Claude.

---

## Installation

```bash
# pnpm
pnpm add @owllayer/adapter-anthropic @owllayer/server @owllayer/core

# npm
npm install @owllayer/adapter-anthropic @owllayer/server @owllayer/core

# yarn
yarn add @owllayer/adapter-anthropic @owllayer/server @owllayer/core
```

---

## Usage

```ts
import { OwlLayerServer } from '@owllayer/server';
import { AnthropicAdapter, ANTHROPIC_DEFAULT_MODEL } from '@owllayer/adapter-anthropic';

const server = new OwlLayerServer({
  llm: new AnthropicAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: ANTHROPIC_DEFAULT_MODEL,
    systemPrompt: 'You are an intelligent agent embedded in the application.',
    maxTokens: 4096,
  }),
  port: 3001,
});

server.listen(() => {
  console.log('OwlLayer Server ready on ws://localhost:3001');
});
```

---

## Model catalog

This package exports a typed catalog of Claude models so you can configure `AnthropicAdapter` from an autocompleted constant instead of copying a long identifier. Any string is still accepted (unlisted identifiers are sent to the provider unchanged); the constants are recommended.

- `ANTHROPIC_MODELS` (`AnthropicModel`): the current lineup and every legacy-available Claude model, each with its readable name and role.
- `ANTHROPIC_DEFAULT_MODEL`: `'claude-sonnet-5'`, unchanged while it stays Active on Anthropic's model-status page.
- `ANTHROPIC_LANGUAGES`: `['multilingual']` — Anthropic does not publish a language code list; `anthropicSupportsLanguage(id, language)` always reports every language as supported.
- `isKnownAnthropicModel(id)`: reports whether an identifier is listed, without ever throwing.
- `ANTHROPIC_DEPRECATED_MODELS` / `getAnthropicDeprecatedModel(id)`: models Anthropic has deprecated or retired. Constructing `AnthropicAdapter` with one of them — as a constant or as a free string — logs one warning naming the replacement; the configured value is still used.
- `ANTHROPIC_CATALOG_VERIFIED_AT`: the date the catalog was last checked against Anthropic's official documentation.

---

## Configuration Options

### `AnthropicAdapterOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `process.env.ANTHROPIC_API_KEY` | Anthropic API key. |
| `model` | `AnthropicModel` | `ANTHROPIC_DEFAULT_MODEL` | Claude model identifier (catalog constant or free string). |
| `systemPrompt` | `string` | `undefined` | System prompt defining agent persona and rules. |
| `maxTokens` | `number` | `4096` | Maximum output tokens per request. |
| `temperature` | `number` | `undefined` | Sampling temperature. |

---

## License

MIT © OwlLayer
