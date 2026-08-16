# Server Setup & Orchestration

The `@domos/server` package provides the server integration for OwlLayer. It orchestrates active AI sessions, handles LLM translation adapters, and executes safety validations.

The current protocol name is **AITP** (*Agent-to-Interface Transfer Protocol*). **ADTP** remains the legacy compatibility name for the existing wire contract and runtime identifiers used by the current server setup.

---

## Installation

```bash
pnpm add @domos/server @domos/core @domos/adapter-google
```

---

## 1. Quick Server Configuration

Set up a WebSocket server using the Google Gemini adapter:

```typescript
import { DomOSServer } from '@domos/server';
import { GoogleAdapter } from '@domos/adapter-google';

const server = new DomOSServer({
  llm: new GoogleAdapter({
    model: 'gemini-2.0-flash',
    apiKey: process.env.GOOGLE_API_KEY,
    systemPrompt: 'You are a shopping assistant helping customers in the store.'
  }),
  port: 4001,
  path: '/domos'
});

// Configure valid api keys
server.addApiKey('pk_demo_local');

// Register a server-side tool (e.g. connecting to external APIs, databases)
server.tool('check_inventory', async ({ productId }) => {
  const stock = await db.getStock(productId);
  return { productId, available: stock > 0, quantity: stock };
});

server.listen(() => {
  console.log('DomOS WebSocket Server listening on ws://localhost:4001/domos');
});
```

---

## 2. Server Configuration Parameters

Provide configuration settings through `DomOSServerOptions`:

| Option | Type | Default | Purpose |
|---|---|---|---|
| `llm` | `LLMAdapter` | *Required* | LLM integration controller class. |
| `server` | `HttpServer` | `undefined` | Attach to an existing Express/Fastify HTTP server instance instead of spawning a new one. |
| `port` | `number` | `3000` | Network port to listen on. |
| `path` | `string` | `'/domos'` | WebSocket mount path. |
| `toolTimeout` | `number` | `30000` | Time in milliseconds before tool execution resolves as failed. |
| `maxConversationMessages`| `number` | `100` | History size buffer limit per active session. |
| `maxConnections` | `number` | `undefined` | Cap of active connections allowed. |
| `virtualLines` | `object` | `undefined` | Concurrency control configurations. |

### Concurrency Management (`virtualLines`)
You can cap concurrent connections based on API key constraints:
```typescript
virtualLines: {
  lines: [
    { apiKey: 'pk_demo_local', count: 5, ttlMs: 3600000 } // max 5 concurrent lines
  ]
}
```

---

## 3. Creating Custom LLM Adapters

If you want to use a provider that doesn't have an official SDK package (e.g. Anthropic, Mistral, Llama, Ollama), extend the `BaseLLMAdapter` class:

```typescript
import { BaseLLMAdapter, type LLMRequest, type LLMResponse } from '@domos/server';

export class CustomLLMAdapter extends BaseLLMAdapter {
  constructor(private config: { apiKey: string }) {
    super();
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const rawResponse = await callMyModelAPI({
      apiKey: this.config.apiKey,
      prompt: request.systemPrompt,
      conversation: request.messages,
      availableFunctions: request.tools
    });

    return {
      text: rawResponse.choices[0].message.content,
      toolCalls: rawResponse.choices[0].message.tool_calls?.map(tc => ({
        callId: tc.id,
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments)
      }))
    };
  }
}
```

---

## 4. Structured System Prompts (`SystemPromptConfig`)

`DomOSServer` supports both a classic raw string prompt and a structured `SystemPromptConfig` object. The structured prompt compiles automatically to structure-enforced formats, ensuring predictable model guidance.

### Structured Prompt Configuration Example
```typescript
import { type SystemPromptConfig } from '@domos/core';
import { GoogleAdapter } from '@domos/adapter-google';

const systemPrompt: SystemPromptConfig = {
  name: 'Alex',
  language: 'en',
  role: 'You are Alex, an expert shopping assistant for our e-commerce storefront.',
  personality: 'Friendly, helpful, and highly concise. Use customer first-names.',
  capabilities: [
    'Retrieve products from catalog inventories',
    'Add/remove items in the shopping cart'
  ],
  rules: [
    'Never hallucinate features or stock inventories',
    'Ask for approval before clearing cart items (high-risk)',
  ],
  context: () => `Store Date: ${new Date().toLocaleDateString('en-US')}`,
  toolInstructions: 'Choose available tools dynamically to assist the user query.',
  responseFormat: 'Keep messages short (1-2 sentences). Ask follow-up questions.'
};

const server = new DomOSServer({
  llm: new GoogleAdapter({
    apiKey: process.env.GOOGLE_API_KEY,
    systemPrompt // Compiles dynamically on init
  })
});
```

You can use the helper utilities directly if you need to resolve or check compiles:
```typescript
import { compileSystemPrompt, resolveSystemPrompt } from '@domos/core';

// Compile a config object into a formatted string
const rawStringPrompt = compileSystemPrompt(systemPromptConfig);

// Resolve either a string or a config object safely
const finalPrompt = resolveSystemPrompt(anyPromptType);
```

---

## 5. Persistent Agent Memory Configuration

By default, agent session states persist in memory (`MemoryStore`). You can configure file-based `SQLite` or database `MongoDB` persistence directly on the server options.

```typescript
const server = new DomOSServer({
  llm: llmAdapter,
  agentMemory: {
    provider: 'sqlite',
    sqlitePath: './data/domos-memory.db',
    journalMode: 'WAL' // WAL (Write-Ahead Logging) or DELETE
  }
});
```

For more details, see the [Agent Memory Guide](/agent-memory).

