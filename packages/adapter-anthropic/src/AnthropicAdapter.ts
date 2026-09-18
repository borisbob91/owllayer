import Anthropic from '@anthropic-ai/sdk';
import { createLogger, EventEmitter, generateId, type SystemPrompt } from '@owllayer/core';
import { BaseLLMAdapter } from '@owllayer/core';
import type {
  LLMRequest,
  LLMResponse,
  LLMAdapterCapabilities,
  ToolDeclaration,
} from '@owllayer/core';
import type {
  AnthropicAdapterAnyEventListener,
  AnthropicAdapterEventListener,
  AnthropicAdapterEventMap,
  AnthropicAdapterEventType,
} from './events.js';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = (globalThis as any).setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer !== undefined) (globalThis as any).clearTimeout(timer);
  });
}

const log = createLogger('OwlLayer:AnthropicAdapter');

export interface AnthropicAdapterOptions {
  apiKey: string;
  model?: string;
  systemPrompt?: SystemPrompt;
  timeout?: number;
}

export class AnthropicAdapter extends BaseLLMAdapter {
  readonly name = 'anthropic-claude';
  private client: Anthropic;
  private model: string;
  private timeout: number;
  private events = new EventEmitter<AnthropicAdapterEventMap>();

  constructor(options: AnthropicAdapterOptions) {
    super(options.systemPrompt);
    this.client = new Anthropic({
      apiKey: options.apiKey,
      timeout: options.timeout ?? 30000,
    });
    this.model = options.model || 'claude-sonnet-4-20250514';
    this.timeout = options.timeout ?? 30000;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const systemPrompt = this.buildSystemPrompt(request);

    // Convertir messages OwlLayer → format Anthropic
    const messages = request.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: msg.content,
    }));

    // Convertir tools OwlLayer → format Anthropic
    const tools = request.tools.map(tool => ({
      name: tool.name,
      description: tool.description || '',
      input_schema: (tool.parameters || { type: 'object', properties: {} }) as Anthropic.Tool['input_schema'],
    }));

    try {
      const response = await withTimeout(
        this.client.messages.create({
          model: this.model,
          max_tokens: 4096,
          system: systemPrompt,
          messages,
          ...(tools.length > 0 ? { tools } : {}),
        }),
        this.timeout,
        `Anthropic API request timed out after ${this.timeout / 1000}s for model ${this.model}`
      );

      return this.parseResponse(response);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error('Anthropic API error:', error);
      this.events.emit('chat.error', {
        error: err instanceof Error ? err : new Error(error),
        message: error,
        model: this.model,
      });
      throw err;
    }
  }

  async handleToolResult(callId: string, result: unknown, tools?: ToolDeclaration[]): Promise<LLMResponse> {
    // Anthropic gère les tool results via la conversation :
    // Le serveur OwlLayer reconstruit les messages avec le tool_result
    // Cette méthode est un fallback — dans la pratique, OwlLayerServer
    // reconstitue la conversation complète et rappelle chat()
    return { text: JSON.stringify(result) };
  }

  onEvent<TType extends AnthropicAdapterEventType>(
    type: TType,
    listener: AnthropicAdapterEventListener<TType>
  ): () => void {
    return this.events.on(type, listener);
  }

  offEvent<TType extends AnthropicAdapterEventType>(
    type: TType,
    listener: AnthropicAdapterEventListener<TType>
  ): void {
    this.events.off(type, listener);
  }

  onAnyEvent(listener: AnthropicAdapterAnyEventListener): () => void {
    return this.events.onAny(listener);
  }

  offAnyEvent(listener: AnthropicAdapterAnyEventListener): void {
    this.events.offAny(listener);
  }

  getCapabilities(): LLMAdapterCapabilities {
    return {
      provider: 'anthropic',
      providerName: 'Anthropic Claude',
      currentModel: this.model,
      models: [
        { id: 'claude-sonnet-4-20250514',  name: 'Claude Sonnet 4',   supportsAudio: false, supportsTools: true, description: 'Meilleur rapport qualité/prix' },
        { id: 'claude-opus-4-20250514',    name: 'Claude Opus 4',     supportsAudio: false, supportsTools: true, description: 'Flagship, raisonnement complexe' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku',  supportsAudio: false, supportsTools: true, description: 'Ultra-rapide, économique' },
      ],
    };
  }

  private parseResponse(response: Anthropic.Message): LLMResponse {
    const result: LLMResponse = {};

    for (const block of response.content) {
      if (block.type === 'text') {
        result.text = (result.text || '') + block.text;
      }
      if (block.type === 'tool_use') {
        if (!result.toolCalls) result.toolCalls = [];
        const toolCall = {
          callId: block.id || `call_${generateId().slice(0, 8)}`,
          name: block.name,
          args: (block.input as Record<string, unknown>) || {},
        };
        result.toolCalls.push(toolCall);
        this.events.emit('chat.tool.call', {
          toolCall,
          model: this.model,
        });
      }
    }

    if (result.text) {
      this.events.emit('chat.response.text', {
        text: result.text,
        model: this.model,
      });
    }

    if (response.usage) {
      result.usage = {
        inputTokens: response.usage.input_tokens || 0,
        outputTokens: response.usage.output_tokens || 0,
      };
    }

    return result;
  }
}
