import OpenAI from "openai";
import {
  createLogger,
  generateId,
  BaseLLMAdapter,
  EventEmitter,
  type SystemPrompt,
  type LLMRequest,
  type LLMResponse,
  type LLMAdapterCapabilities,
} from "@owllayer/core";
import type {
  OpenAIAdapterAnyEventListener,
  OpenAIAdapterEventListener,
  OpenAIAdapterEventMap,
  OpenAIAdapterEventType,
} from "./events.js";
import { toOpenAITools } from "./toolConverter.js";

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMsg: string,
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

const log = createLogger("OwlLayer:OpenAI");

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

  /** Timeout en ms pour les requêtes (défaut: 30000ms) */
  timeout?: number;

  /** Langue par défaut de l'application ('en' ou 'fr', défaut: 'en') */
  language?: "en" | "fr";
}

/**
 * OpenAIAdapter - Adaptateur LLM texte pour OpenAI GPT.
 *
 * Utilise l'API Chat Completions avec function calling.
 *
 * @example
 * ```ts
 * import { OpenAIAdapter } from '@owllayer/adapter-openai';
 *
 * const adapter = new OpenAIAdapter({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   model: 'gpt-4o',
 *   systemPrompt: 'Tu es un assistant shopping.',
 * });
 * ```
 */
export class OpenAIAdapter extends BaseLLMAdapter {
  readonly name = "openai-gpt";
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private timeout: number;
  private language: "en" | "fr" = "en";
  private events = new EventEmitter<OpenAIAdapterEventMap>();
  private pendingToolContext = new Map<
    string,
    {
      toolName: string;
      args: Record<string, unknown>;
      messages: OpenAI.Chat.ChatCompletionMessageParam[];
      systemPrompt: string;
      reasoningContent?: string;
    }
  >();

  constructor(options: OpenAIAdapterOptions) {
    super(options.systemPrompt);
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseURL,
      timeout: options.timeout ?? 30000,
    });
    this.model = options.model || "gpt-4o";
    this.temperature = options.temperature ?? 0.7;
    this.timeout = options.timeout ?? 30000;
    this.language = options.language || "en";
  }

  setLanguage(lang: "en" | "fr"): void {
    this.language = lang;
  }

  getLanguage(): "en" | "fr" {
    return this.language;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const systemPrompt = this.buildSystemPrompt(request);

    // Convertir les messages OwlLayer → OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...this.convertMessages(request.messages),
    ];

    // Convertir les tools
    const tools =
      request.tools.length > 0 ? toOpenAITools(request.tools) : undefined;

    try {
      const response = await withTimeout(
        this.client.chat.completions.create({
          model: this.model,
          messages,
          tools: tools as any,
          temperature: this.temperature,
        }),
        this.timeout,
        `OpenAI API request timed out after ${this.timeout / 1000}s for model ${
          this.model
        }`,
      );

      return this.parseResponse(response, messages, systemPrompt);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error("OpenAI API error:", error);
      this.events.emit("chat.error", {
        error: err instanceof Error ? err : new Error(error),
        message: error,
        model: this.model,
      });
      throw err;
    }
  }

  async handleToolResult(
    callId: string,
    result: unknown,
  ): Promise<LLMResponse> {
    const context = this.pendingToolContext.get(callId);
    if (!context) {
      return { text: JSON.stringify(result) };
    }

    this.pendingToolContext.delete(callId);

    try {
      // Reconstuire la conversation avec le tool call + le resultat.
      // DeepSeek thinking mode exige de renvoyer reasoning_content exact lors du tool result.
      const assistantToolMessage: OpenAI.Chat.ChatCompletionMessageParam & {
        reasoning_content?: string;
        content: string;
      } = {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: callId,
            type: "function",
            function: {
              name: context.toolName,
              arguments: JSON.stringify(context.args),
            },
          },
        ],
      };

      if (context.reasoningContent) {
        assistantToolMessage.reasoning_content = context.reasoningContent;
      }

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        ...context.messages,
        assistantToolMessage,
        {
          role: "tool",
          tool_call_id: callId,
          content: typeof result === "string" ? result : JSON.stringify(result),
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
      log.error("OpenAI tool result error:", error);
      this.events.emit("chat.error", {
        error: err instanceof Error ? err : new Error(error),
        message: error,
        model: this.model,
      });
      return {
        text:
          this.language === "fr"
            ? "Désolé, une erreur est survenue lors du traitement."
            : "Sorry, an error occurred while processing the request.",
      };
    }
  }

  onEvent<TType extends OpenAIAdapterEventType>(
    type: TType,
    listener: OpenAIAdapterEventListener<TType>,
  ): () => void {
    return this.events.on(type, listener);
  }

  offEvent<TType extends OpenAIAdapterEventType>(
    type: TType,
    listener: OpenAIAdapterEventListener<TType>,
  ): void {
    this.events.off(type, listener);
  }

  onAnyEvent(listener: OpenAIAdapterAnyEventListener): () => void {
    return this.events.onAny(listener);
  }

  offAnyEvent(listener: OpenAIAdapterAnyEventListener): void {
    this.events.offAny(listener);
  }

  private convertMessages(
    messages: { role: string; content: string }[],
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    return messages.map((msg) => ({
      role: (msg.role === "assistant" ? "assistant" : "user") as
        | "assistant"
        | "user",
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
      return { text: "" };
    }

    const result: LLMResponse = {};

    // Extraire le texte
    if (choice.message.content) {
      result.text = choice.message.content;
      this.events.emit("chat.response.text", {
        text: choice.message.content,
        model: this.model,
      });
    }

    // Extraire les tool calls
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      result.toolCalls = choice.message.tool_calls.map((tc) => {
        const callId = tc.id || `call_${generateId().slice(0, 8)}`;
        const args = tc.function.arguments
          ? JSON.parse(tc.function.arguments)
          : {};

        // Stocker le contexte pour handleToolResult
        const reasoningContent =
          (
            choice.message as OpenAI.Chat.ChatCompletionMessage & {
              reasoning_content?: string | null;
            }
          ).reasoning_content ?? undefined;

        this.pendingToolContext.set(callId, {
          toolName: tc.function.name,
          args,
          messages,
          systemPrompt,
          reasoningContent,
        });

        const toolCall = {
          callId,
          name: tc.function.name,
          args,
        };
        this.events.emit("chat.tool.call", {
          toolCall,
          model: this.model,
        });
        return toolCall;
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

  getCapabilities(): LLMAdapterCapabilities {
    return {
      provider: "openai",
      providerName: "OpenAI",
      currentModel: this.model,
      models: [
        {
          id: "gpt-4o",
          name: "GPT-4o",
          supportsAudio: false,
          supportsTools: true,
          description: "Flagship multimodal",
        },
        {
          id: "gpt-4o-mini",
          name: "GPT-4o Mini",
          supportsAudio: false,
          supportsTools: true,
          description: "Rapide et économique",
        },
        {
          id: "gpt-4-turbo",
          name: "GPT-4 Turbo",
          supportsAudio: false,
          supportsTools: true,
          description: "Vision + 128k context",
        },
        {
          id: "o1",
          name: "o1",
          supportsAudio: false,
          supportsTools: true,
          description: "Raisonnement avancé",
        },
        {
          id: "o3-mini",
          name: "o3-mini",
          supportsAudio: false,
          supportsTools: true,
          description: "Raisonnement économique",
        },
      ],
    };
  }
}
