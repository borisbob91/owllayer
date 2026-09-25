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
  type ToolDeclaration,
} from "@owllayer/core";
import type {
  OpenAIAdapterAnyEventListener,
  OpenAIAdapterEventListener,
  OpenAIAdapterEventMap,
  OpenAIAdapterEventType,
} from "./events.js";
import { toOpenAITools } from "./toolConverter.js";
import {
  OPENAI_CHAT_MODELS,
  isOpenAIReasoningModel,
  type OpenAIChatModel,
} from "./models.js";

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

const DEEPSEEK_DSML_TOOL_CALLS_RE =
  /<｜｜DSML｜｜tool_calls>([\s\S]*?)<\/｜｜DSML｜｜tool_calls>/u;
const DEEPSEEK_DSML_INVOKE_RE =
  /<｜｜DSML｜｜invoke\s+name="([^"]+)"\s*>([\s\S]*?)<\/｜｜DSML｜｜invoke>/gu;
const DEEPSEEK_DSML_PARAMETER_RE =
  /<｜｜DSML｜｜parameter\s+name="([^"]+)"\s*>([\s\S]*?)<\/｜｜DSML｜｜parameter>/gu;

export interface OpenAIAdapterOptions {
  /** Modele OpenAI (defaut: 'gpt-4o') */
  model?: OpenAIChatModel;

  /** Cle API OpenAI */
  apiKey: string;

  /** System prompt (string ou SystemPromptConfig) */
  systemPrompt?: SystemPrompt;

  /**
   * Temperature (defaut: 0.7). Non envoyee aux modeles de raisonnement
   * (o-series, GPT-5+) sauf si elle est fournie explicitement.
   */
  temperature?: number;

  /** Base URL custom (pour Azure OpenAI, proxies, etc.) */
  baseURL?: string;

  /** Timeout en ms pour les requêtes (défaut: 30000ms) */
  timeout?: number;

  /** Langue par défaut de l'application ('en' ou 'fr', défaut: 'en') */
  language?: "en" | "fr";

  /** Active ou désactive le mode thinking des APIs compatibles DeepSeek */
  thinking?: boolean;
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
  private temperatureExplicit: boolean;
  private isOfficialOpenAI: boolean;
  private timeout: number;
  private language: "en" | "fr" = "en";
  private thinking?: boolean;
  private events = new EventEmitter<OpenAIAdapterEventMap>();
  private pendingToolContext = new Map<
    string,
    {
      toolName: string;
      args: Record<string, unknown>;
      messages: OpenAI.Chat.ChatCompletionMessageParam[];
      systemPrompt: string;
      reasoningContent?: string;
      content?: string;
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
    this.temperatureExplicit = options.temperature !== undefined;
    this.isOfficialOpenAI = !options.baseURL;
    this.timeout = options.timeout ?? 30000;
    this.language = options.language || "en";
    this.thinking = options.thinking;
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
          ...this.getSamplingOptions(),
          ...this.getToolCallOptions(tools !== undefined),
          ...this.getReasoningOptions(),
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
    tools?: ToolDeclaration[],
  ): Promise<LLMResponse> {
    const context = this.pendingToolContext.get(callId);
    if (!context) {
      return { text: JSON.stringify(result) };
    }

    this.pendingToolContext.delete(callId);

    try {
      // Reconstuire la conversation avec le tool call + le resultat.
      // DeepSeek thinking mode exige de renvoyer reasoning_content exact lors du tool result.
      const assistantToolMessage: any = {
        role: "assistant",
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

      // Toujours une chaine : DeepSeek (thinking) exige le champ, OpenAI l'accepte vide.
      assistantToolMessage.content = context.content ?? "";

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

      const hasTools = Boolean(tools && tools.length > 0);
      const response = await withTimeout(
        this.client.chat.completions.create({
          model: this.model,
          messages,
          tools: hasTools ? toOpenAITools(tools!) as any : undefined,
          ...this.getSamplingOptions(),
          ...this.getToolCallOptions(hasTools),
          ...this.getReasoningOptions(),
        }),
        this.timeout,
        `OpenAI API request timed out after ${this.timeout / 1000}s for model ${
          this.model
        }`,
      );

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

  private getSamplingOptions(): { temperature?: number } {
    if (isOpenAIReasoningModel(this.model) && !this.temperatureExplicit) {
      return {};
    }
    return { temperature: this.temperature };
  }

  /**
   * Un seul tool call par tour : le serveur reprend chaque appel via
   * handleToolResult depuis le meme historique, des appels paralleles
   * divergeraient. Parametre OpenAI uniquement (fournisseurs compatibles exclus).
   */
  private getToolCallOptions(hasTools: boolean): { parallel_tool_calls?: false } {
    if (!hasTools || !this.isOfficialOpenAI) {
      return {};
    }
    return { parallel_tool_calls: false };
  }

  private getReasoningOptions(): {
    extra_body?: { thinking: { type: "enabled" | "disabled" } };
  } {
    if (this.thinking === undefined) {
      return {};
    }

    return {
      extra_body: {
        thinking: {
          type: this.thinking ? "enabled" : "disabled",
        },
      },
    };
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
    const messageContent = choice.message.content ?? "";
    const dsmlToolCalls = this.parseDeepSeekDsmlToolCalls(messageContent);

    // Extraire le texte
    const textContent = dsmlToolCalls
      ? messageContent.replace(dsmlToolCalls.source, "").trim()
      : messageContent;
    if (textContent) {
      result.text = textContent;
      this.events.emit("chat.response.text", {
        text: textContent,
        model: this.model,
      });
    }

    // Extraire les tool calls
    const openAiToolCalls = choice.message.tool_calls ?? [];
    if (openAiToolCalls.length > 0 || dsmlToolCalls?.calls.length) {
      const allToolCalls = openAiToolCalls.length > 0
        ? openAiToolCalls.map((tc) => {
            let args: Record<string, unknown> = {};
            try {
              args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
            } catch {
              log.error(`Arguments JSON invalides pour "${tc.function.name}":`, tc.function.arguments);
            }
            return { id: tc.id, name: tc.function.name, args };
          })
        : dsmlToolCalls!.calls;

      // Un seul appel par tour (voir getToolCallOptions) : le LLM re-emettra
      // les appels restants apres avoir recu ce resultat.
      if (allToolCalls.length > 1) {
        log.warn(
          `${allToolCalls.length} tool calls recus, seul "${allToolCalls[0].name}" est traite ce tour`,
        );
      }
      const toolCalls = allToolCalls.slice(0, 1);

      result.toolCalls = toolCalls.map((tc) => {
        const callId = tc.id || `call_${generateId().slice(0, 8)}`;
        const args = tc.args;

        // Stocker le contexte pour handleToolResult
        const reasoningContent =
          (
            choice.message as OpenAI.Chat.ChatCompletionMessage & {
              reasoning_content?: string | null;
            }
          ).reasoning_content ?? undefined;

        this.pendingToolContext.set(callId, {
          toolName: tc.name,
          args,
          messages,
          systemPrompt,
          reasoningContent,
          content: textContent,
        });

        const toolCall = {
          callId,
          name: tc.name,
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

  private parseDeepSeekDsmlToolCalls(
    content: string,
  ): { source: string; calls: Array<{ id?: string; name: string; args: Record<string, unknown> }> } | null {
    const block = DEEPSEEK_DSML_TOOL_CALLS_RE.exec(content);
    if (!block) return null;

    const calls: Array<{ id?: string; name: string; args: Record<string, unknown> }> = [];
    for (const invoke of block[1].matchAll(DEEPSEEK_DSML_INVOKE_RE)) {
      const args: Record<string, unknown> = {};
      for (const parameter of invoke[2].matchAll(DEEPSEEK_DSML_PARAMETER_RE)) {
        args[parameter[1]] = parameter[2].trim();
      }

      calls.push({ name: invoke[1], args });
    }

    return calls.length > 0 ? { source: block[0], calls } : null;
  }

  getCapabilities(): LLMAdapterCapabilities {
    return {
      provider: "openai",
      providerName: "OpenAI",
      currentModel: this.model,
      models: OPENAI_CHAT_MODELS.map((id) => ({
        id,
        name: id,
        supportsAudio: false,
        supportsTools: true,
        description: isOpenAIReasoningModel(id) ? "Raisonnement" : undefined,
      })),
    };
  }
}
