import OpenAI from 'openai';
import {
  createLogger,
  generateId,
  type SystemPrompt,
} from '@domos/core';
import { BaseLLMAdapter } from '@domos/server';
import type { LLMRequest, LLMResponse } from '@domos/server';
import { toOpenAITools } from './toolConverter.js';

const log = createLogger('DomOS:OpenAI');

export interface OpenAIAdapterOptions {
  /** Modele OpenAI (defaut: 'gpt-4o') */
  model?: string;

  /** Cle API OpenAI */
  apiKey: string;

  /** System prompt (string ou SystemPromptConfig) */
  systemPrompt?: SystemPrompt;

  /** Temperature (defaut: 0.7) */
  temperature?: number;

  /** Base URL custom (pour Azure OpenAI, proxies, etc.) */
  baseURL?: string;
}

/**
 * OpenAIAdapter - Adaptateur LLM texte pour OpenAI GPT.
 *
 * Utilise l'API Chat Completions avec function calling.
 *
 * @example
 * ```ts
 * import { OpenAIAdapter } from '@domos/adapter-openai';
 *
 * const adapter = new OpenAIAdapter({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   model: 'gpt-4o',
 *   systemPrompt: 'Tu es un assistant shopping.',
 * });
 * ```
 */
export class OpenAIAdapter extends BaseLLMAdapter {
  readonly name = 'openai-gpt';
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private pendingToolContext = new Map<string, {
    toolName: string;
    args: Record<string, unknown>;
    messages: OpenAI.Chat.ChatCompletionMessageParam[];
    systemPrompt: string;
  }>();

  constructor(options: OpenAIAdapterOptions) {
    super(options.systemPrompt);
    this.client = new OpenAI({
      apiKey: options.apiKey,
      ...(options.baseURL ? { baseURL: options.baseURL } : {}),
    });
    this.model = options.model || 'gpt-4o';
    this.temperature = options.temperature ?? 0.7;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const systemPrompt = this.buildSystemPrompt(request);

    // Convertir les messages DomOS → OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...this.convertMessages(request.messages),
    ];

    // Convertir les tools
    const tools = request.tools.length > 0
      ? toOpenAITools(request.tools)
      : undefined;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        tools: tools as any,
        temperature: this.temperature,
      });

      return this.parseResponse(response, messages, systemPrompt);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error('OpenAI API error:', error);
      throw err;
    }
  }

  async handleToolResult(callId: string, result: unknown): Promise<LLMResponse> {
    const context = this.pendingToolContext.get(callId);
    if (!context) {
      return { text: JSON.stringify(result) };
    }

    this.pendingToolContext.delete(callId);

    try {
      // Reconstuire la conversation avec le tool call + le resultat
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        ...context.messages,
        {
          role: 'assistant',
          tool_calls: [{
            id: callId,
            type: 'function',
            function: {
              name: context.toolName,
              arguments: JSON.stringify(context.args),
            },
          }],
        },
        {
          role: 'tool',
          tool_call_id: callId,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        },
      ];

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: this.temperature,
      });

      return this.parseResponse(response, messages, context.systemPrompt);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error('OpenAI tool result error:', error);
      return { text: 'Desole, une erreur est survenue.' };
    }
  }

  private convertMessages(messages: { role: string; content: string }[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    return messages.map((msg) => ({
      role: (msg.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: msg.content,
    }));
  }

  private parseResponse(
    response: OpenAI.Chat.ChatCompletion,
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    systemPrompt: string,
  ): LLMResponse {
    const choice = response.choices?.[0];
    if (!choice) {
      return { text: '' };
    }

    const result: LLMResponse = {};

    // Extraire le texte
    if (choice.message.content) {
      result.text = choice.message.content;
    }

    // Extraire les tool calls
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      result.toolCalls = choice.message.tool_calls.map((tc) => {
        const callId = tc.id || `call_${generateId().slice(0, 8)}`;
        const args = tc.function.arguments
          ? JSON.parse(tc.function.arguments)
          : {};

        // Stocker le contexte pour handleToolResult
        this.pendingToolContext.set(callId, {
          toolName: tc.function.name,
          args,
          messages,
          systemPrompt,
        });

        return {
          callId,
          name: tc.function.name,
          args,
        };
      });
    }

    // Token usage
    if (response.usage) {
      result.usage = {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
      };
    }

    return result;
  }
}
