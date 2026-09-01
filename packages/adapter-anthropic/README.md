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
import { AnthropicAdapter } from '@owllayer/adapter-anthropic';

const server = new OwlLayerServer({
  llm: new AnthropicAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-3-5-sonnet-20241022',
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

## Configuration Options

### `AnthropicAdapterOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `process.env.ANTHROPIC_API_KEY` | Anthropic API key. |
| `model` | `string` | `'claude-3-5-sonnet-20241022'` | Claude model identifier. |
| `systemPrompt` | `string` | `undefined` | System prompt defining agent persona and rules. |
| `maxTokens` | `number` | `4096` | Maximum output tokens per request. |
| `temperature` | `number` | `undefined` | Sampling temperature. |

---

## License

MIT © OwlLayer
