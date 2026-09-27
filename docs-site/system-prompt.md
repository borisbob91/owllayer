# System Prompt Configuration

`OwlLayerServer` supports two system prompt formats: a **raw string** (backward compatible) or a **structured object** `SystemPromptConfig` that compiles automatically.

---

## Usage

### Classic String (always supported)

```ts
const server = new OwlLayerServer({
  llm: new GoogleAdapter({
    systemPrompt: 'You are a shopping assistant...',
  }),
});
```

### Structured Config

```ts
import { type SystemPromptConfig } from '@owllayer/core';

const prompt: SystemPromptConfig = {
  name: 'Alex',
  language: 'en',
  role: 'You are Alex, an expert shopping assistant for our e-commerce store.',
  personality: 'Friendly, professional, and concise.',
  capabilities: [
    'Search products in the catalog',
    'Add/remove items from the cart',
    'Answer product questions',
    'Guide the user through their purchase journey',
  ],
  rules: [
    'Never invent a product that does not exist',
    'Always confirm before critical actions (payment, deletion)',
    'Respond in the user language',
    'Do not share prices if unavailable',
  ],
  context: () => `Date: ${new Date().toLocaleDateString('en-US')}`,
  toolInstructions: 'Use available tools to manipulate the interface.',
  responseFormat: 'Short responses (2-3 sentences max). Use tools when possible.',
  sections: {
    'TONE': 'Professional but approachable. No technical jargon.',
    'RESTRICTIONS': [
      'Never mention that you are an AI',
      'Do not suggest competitor products',
    ],
  },
};

const server = new OwlLayerServer({
  llm: new GoogleAdapter({
    systemPrompt: prompt,
  }),
});
```

---

## Interface

```ts
interface SystemPromptConfig {
  name?: string;              // Agent name ("Alex")
  language?: string;          // Language ("fr", "en")
  role: string;               // Primary role (required)
  personality?: string;       // Tone and personality
  capabilities?: string[];    // List of capabilities
  rules?: string[];           // Strict rules
  context?: string | (() => string); // Dynamic context
  toolInstructions?: string;  // Instructions for tool usage
  responseFormat?: string;    // Expected response format
  sections?: Record<string, string | string[]>; // Custom sections
}
```

---

## Compilation

The `SystemPromptConfig` is automatically compiled into a structured string:

```
[CONTEXT]
Language: en
Date: 07/13/2026

[NAME]
Your name is Alex.

[ROLE]
You are Alex, an expert shopping assistant...

[PERSONALITY]
Friendly, professional, and concise...

[CAPABILITIES]
- Search products in the catalog
- Add/remove items from the cart
...

[RULES]
- Never invent a product that does not exist
...

[TOOLS]
Use available tools...

[FORMAT]
Short responses (2-3 sentences max)...

[TONE]
Professional but approachable...

[RESTRICTIONS]
- Never mention that you are an AI
- Do not suggest competitor products
```

---

## Type Union

The type `SystemPrompt = string | SystemPromptConfig` is accepted wherever a system prompt is expected:

```ts
// Both formats work
new GoogleAdapter({ systemPrompt: 'You are an assistant...' });
new GoogleAdapter({ systemPrompt: { role: 'You are an assistant...' } });
```

---

## Utility Functions

```ts
import { compileSystemPrompt, resolveSystemPrompt } from '@owllayer/core';

// Compile a config to string
const str = compileSystemPrompt(config);

// Resolve a SystemPrompt (string or config) to string
const result = resolveSystemPrompt(prompt); // works with both types
```
