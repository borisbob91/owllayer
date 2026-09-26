import Anthropic from '@anthropic-ai/sdk';
import { createLogger, EventEmitter, generateId, type SystemPrompt } from '@owllayer/core';
import { BaseLLMAdapter } from '@owllayer/core';
import type { LLMRequest, LLMResponse, LLMAdapterCapabilities, ToolDeclaration } from '@owllayer/core';
import type {
  AnthropicAdapterAnyEventListener,
  AnthropicAdapterEventListener,
  AnthropicAdapterEventMap,
  AnthropicAdapterEventType,
} from './events.js';
import { toAnthropicTools } from './toolConverter.js';

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
  private pendingToolContext = new Map<
    string,
    {
      messages: Anthropic.MessageParam[];
      assistantContent: Array<Anthropic.TextBlockParam | Anthropic.ToolUseBlockParam>;
      systemPrompt: string;
    }
  >();

  constructor(options: AnthropicAdapterOptions) {
    super(options.systemPrompt);
    this.client = new Anthropic({
      apiKey: options.apiKey,
      timeout: options.timeout ?? 30000,
    });
    this.model = options.model || 'claude-sonnet-5';
    this.timeout = options.timeout ?? 30000;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const systemPrompt = this.buildSystemPrompt(request);

    // Convertir messages OwlLayer → format Anthropic
    const messages: Anthropic.MessageParam[] = request.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: msg.content,
    }));

    try {
      return await this.createMessage(messages, systemPrompt, request.tools);
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
    const context = this.pendingToolContext.get(callId);
    if (!context) {
      return { text: JSON.stringify(result) };
    }

    this.pendingToolContext.delete(callId);

    // Le tool_result doit suivre immediatement le message assistant qui contient le tool_use
    const toolResult: Anthropic.ToolResultBlockParam = {
      type: 'tool_result',
      tool_use_id: callId,
      content: typeof result === 'string' ? result : JSON.stringify(result),
    };
    // Echec cote client ({ status: 'error' }) ou serveur ({ error }) : Claude doit le savoir
    const outcome = result as { status?: unknown; error?: unknown } | null;
    if (outcome?.status === 'error' || (outcome?.status === undefined && typeof outcome?.error === 'string')) {
      toolResult.is_error = true;
    }

    const messages: Anthropic.MessageParam[] = [
      ...context.messages,
      { role: 'assistant', content: context.assistantContent },
      { role: 'user', content: [toolResult] },
    ];

    try {
      return await this.createMessage(messages, context.systemPrompt, tools ?? []);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error('Anthropic tool result error:', error);
      this.events.emit('chat.error', {
        error: err instanceof Error ? err : new Error(error),
        message: error,
        model: this.model,
      });
      throw err;
    }
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
        { id: 'claude-sonnet-5',   name: 'Claude Sonnet 5',   supportsAudio: false, supportsTools: true, description: 'Meilleur rapport qualité/prix' },
        { id: 'claude-opus-5',     name: 'Claude Opus 5',     supportsAudio: false, supportsTools: true, description: 'Flagship, raisonnement complexe' },
        { id: 'claude-haiku-4-5',  name: 'Claude Haiku 4.5',  supportsAudio: false, supportsTools: true, description: 'Ultra-rapide, économique' },
      ],
    };
  }

  private async createMessage(
    messages: Anthropic.MessageParam[],
    systemPrompt: string,
    tools: ToolDeclaration[]
  ): Promise<LLMResponse> {
    const response = await withTimeout(
      this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        // Un seul tool par tour : le serveur reprend chaque appel via handleToolResult
        // et l'API exige un tool_result pour chaque tool_use du message precedent
        ...(tools.length > 0
          ? { tools: toAnthropicTools(tools), tool_choice: { type: 'auto' as const, disable_parallel_tool_use: true } }
          : {}),
      }),
      this.timeout,
      `Anthropic API request timed out after ${this.timeout / 1000}s for model ${this.model}`
    );

    return this.parseResponse(response, messages, systemPrompt);
  }

  private parseResponse(
    response: Anthropic.Message,
    messages: Anthropic.MessageParam[],
    systemPrompt: string
  ): LLMResponse {
    const result: LLMResponse = {};
    const assistantContent: Array<Anthropic.TextBlockParam | Anthropic.ToolUseBlockParam> = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        result.text = (result.text || '') + block.text;
        // L'API refuse les blocs text vides dans l'historique rejoue
        if (block.text) assistantContent.push({ type: 'text', text: block.text });
      }
      if (block.type === 'tool_use') {
        // Garde si le modele emet malgre tout plusieurs tool_use : les suivants sont ignores
        // et retires de l'historique, il les re-emettra apres ce resultat
        if (result.toolCalls) {
          log.warn(`Plusieurs tool_use recus, seul "${result.toolCalls[0].name}" est traite ce tour`);
          continue;
        }
        const toolCall = {
          callId: block.id || `call_${generateId().slice(0, 8)}`,
          name: block.name,
          args: (block.input as Record<string, unknown>) || {},
        };
        result.toolCalls = [toolCall];
        assistantContent.push({ type: 'tool_use', id: toolCall.callId, name: block.name, input: block.input });
        this.events.emit('chat.tool.call', {
          toolCall,
          model: this.model,
        });
      }
    }

    if (result.toolCalls) {
      this.pendingToolContext.set(result.toolCalls[0].callId, { messages, assistantContent, systemPrompt });
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
