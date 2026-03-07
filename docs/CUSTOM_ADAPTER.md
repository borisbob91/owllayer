# Creer un Adaptateur LLM Custom

DomOS utilise un pattern Adapter pour supporter differents LLMs. Ce guide explique comment creer votre propre adaptateur.

## Interface LLMAdapter

```ts
interface LLMAdapter {
  /** Prompt systeme pour le LLM */
  systemPrompt?: string;

  /** Envoyer un message et recevoir une reponse */
  chat(request: LLMRequest): Promise<LLMResponse>;

  /** Envoyer le resultat d'un tool pour obtenir la reponse finale */
  handleToolResult?(callId: string, result: unknown): Promise<LLMResponse | null>;
}
```

## Types

```ts
interface LLMRequest {
  messages: ChatMessage[];           // Historique de conversation
  tools?: ToolDeclaration[];         // Tools disponibles (client + serveur)
  context?: Record<string, unknown>; // Shadow Context
  systemPrompt?: string;
}

interface LLMResponse {
  text?: string;                     // Reponse textuelle
  toolCalls?: LLMToolCall[];         // Appels de tools demandes
}

interface LLMToolCall {
  callId: string;
  name: string;
  args: Record<string, unknown>;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
}
```

## Exemple : Adaptateur OpenAI

```ts
import { BaseLLMAdapter, type LLMRequest, type LLMResponse } from '@domos/server';
import OpenAI from 'openai';

export class OpenAIAdapter extends BaseLLMAdapter {
  private client: OpenAI;
  private model: string;

  constructor(options: { apiKey: string; model?: string; systemPrompt?: string }) {
    super();
    this.client = new OpenAI({ apiKey: options.apiKey });
    this.model = options.model || 'gpt-4o';
    this.systemPrompt = options.systemPrompt;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    // Construire les messages
    const messages = this.buildMessages(request);

    // Convertir les tools DomOS en format OpenAI
    const tools = request.tools?.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters || { type: 'object', properties: {} },
      },
    }));

    // Appeler l'API
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      tools: tools?.length ? tools : undefined,
    });

    const choice = response.choices[0];

    // Extraire les tool calls
    const toolCalls = choice.message.tool_calls?.map(tc => ({
      callId: tc.id,
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments),
    }));

    return {
      text: choice.message.content || undefined,
      toolCalls,
    };
  }

  private buildMessages(request: LLMRequest) {
    const messages: any[] = [];

    // System prompt avec contexte
    const systemContent = this.buildSystemPrompt(request.context);
    if (systemContent) {
      messages.push({ role: 'system', content: systemContent });
    }

    // Historique
    for (const msg of request.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }

    return messages;
  }
}
```

## Exemple : Adaptateur Anthropic (Claude)

```ts
import { BaseLLMAdapter, type LLMRequest, type LLMResponse } from '@domos/server';
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicAdapter extends BaseLLMAdapter {
  private client: Anthropic;
  private model: string;

  constructor(options: { apiKey: string; model?: string; systemPrompt?: string }) {
    super();
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model || 'claude-sonnet-4-5-20250929';
    this.systemPrompt = options.systemPrompt;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const system = this.buildSystemPrompt(request.context);

    // Convertir les tools
    const tools = request.tools?.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters || { type: 'object', properties: {} },
    }));

    // Filtrer les messages (Anthropic n'accepte pas 'system' dans messages)
    const messages = request.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: system || undefined,
      messages,
      tools: tools?.length ? tools : undefined,
    });

    // Extraire texte et tool calls
    let text = '';
    const toolCalls: LLMResponse['toolCalls'] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        text += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          callId: block.id,
          name: block.name,
          args: block.input as Record<string, unknown>,
        });
      }
    }

    return {
      text: text || undefined,
      toolCalls: toolCalls.length ? toolCalls : undefined,
    };
  }
}
```

## Utilisation

```ts
import { DomOSServer } from '@domos/server';
import { OpenAIAdapter } from './OpenAIAdapter';

const server = new DomOSServer({
  llm: new OpenAIAdapter({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o',
    systemPrompt: 'Tu es un assistant...',
  }),
  port: 3000,
});
```

## BaseLLMAdapter

La classe abstraite `BaseLLMAdapter` fournit des helpers :

```ts
abstract class BaseLLMAdapter implements LLMAdapter {
  systemPrompt?: string;

  // Formate le contexte en texte pour le system prompt
  protected formatContext(context?: Record<string, unknown>): string;

  // Construit le system prompt complet (prompt + contexte)
  protected buildSystemPrompt(context?: Record<string, unknown>): string;
}
```

Votre adaptateur doit uniquement implementer `chat()`. Le `buildSystemPrompt()` est fourni et injecte automatiquement le Shadow Context dans le prompt.
