import Anthropic from '@anthropic-ai/sdk';
import { createLogger, generateId, type SystemPrompt } from '@domos/core';
import { BaseLLMAdapter } from '@domos/server';
import type { LLMRequest, LLMResponse, LLMAdapterCapabilities } from '@domos/server';

const log = createLogger('DomOS:AnthropicAdapter');

export interface AnthropicAdapterOptions {
  apiKey: string;
  model?: string;
  systemPrompt?: SystemPrompt;
}

export class AnthropicAdapter extends BaseLLMAdapter {
  readonly name = 'anthropic-claude';
  private client: Anthropic;
  private model: string;

  constructor(options: AnthropicAdapterOptions) {
    super(options.systemPrompt);
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model || 'claude-sonnet-4-20250514';
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const systemPrompt = this.buildSystemPrompt(request);

    // Convertir messages DomOS → format Anthropic
    const messages = request.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: msg.content,
    }));

    // Convertir tools DomOS → format Anthropic
    const tools = request.tools.map(tool => ({
      name: tool.name,
      description: tool.description || '',
      input_schema: (tool.parameters || { type: 'object', properties: {} }) as Anthropic.Tool['input_schema'],
    }));

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        ...(tools.length > 0 ? { tools } : {}),
      });

      return this.parseResponse(response);
    } catch (err) {
      log.error('Anthropic API error:', String(err));
      throw err;
    }
  }

  async handleToolResult(callId: string, result: unknown): Promise<LLMResponse> {
    // Anthropic gère les tool results via la conversation :
    // Le serveur DomOS reconstruit les messages avec le tool_result
    // Cette méthode est un fallback — dans la pratique, DomOSServer
    // reconstitue la conversation complète et rappelle chat()
    return { text: JSON.stringify(result) };
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
        result.toolCalls.push({
          callId: block.id || `call_${generateId().slice(0, 8)}`,
          name: block.name,
          args: (block.input as Record<string, unknown>) || {},
        });
      }
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
