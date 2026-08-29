import { GoogleGenAI } from '@google/genai';
import {
  generateId,
  createLogger,
  BaseLLMAdapter,
  EventEmitter,
  type SystemPrompt,
  type LLMRequest,
  type LLMResponse,
  type ChatMessage,
  type LLMAdapterCapabilities,
} from '@owllayer/core';
import type {
  GoogleAdapterAnyEventListener,
  GoogleAdapterEventListener,
  GoogleAdapterEventMap,
  GoogleAdapterEventType,
} from './events.ts';
import { toGeminiFunctionDeclarations } from './toolConverter.js';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

const log = createLogger('OwlLayer:GoogleAdapter');

export interface GoogleAdapterOptions {
  /** Modele Gemini a utiliser */
  model?: string;
  /** Cle API Google */
  apiKey: string;
  /** Prompt systeme */
  systemPrompt?: SystemPrompt;
  /** Langue par défaut de l'application ('en' ou 'fr', défaut: 'en') */
  language?: 'en' | 'fr';
}

/**
 * GoogleAdapter - Adaptateur Gemini pour le mode texte avec function calling.
 *
 * @example
 * ```ts
 * const adapter = new GoogleAdapter({
 *   model: 'gemini-2.0-flash',
 *   apiKey: process.env.GOOGLE_API_KEY,
 * });
 * ```
 */
export class GoogleAdapter extends BaseLLMAdapter {
  readonly name = 'google-gemini';
  private client: GoogleGenAI;
  private model: string;
  private language: 'en' | 'fr' = 'en';
  private pendingToolContext: Map<string, any> = new Map();
  private events = new EventEmitter<GoogleAdapterEventMap>();

  constructor(options: GoogleAdapterOptions) {
    super(options.systemPrompt);
    this.client = new GoogleGenAI({ apiKey: options.apiKey });
    this.model = options.model || 'gemini-2.0-flash';
    this.language = options.language || 'en';
  }

  setLanguage(lang: 'en' | 'fr'): void {
    this.language = lang;
  }

  getLanguage(): 'en' | 'fr' {
    return this.language;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const systemPrompt = this.buildSystemPrompt(request);

    // Convertir l'historique au format Gemini
    const contents = this.convertMessages(request.messages);

    // Convertir les tools au format Gemini
    const tools = request.tools.length > 0
      ? [{ functionDeclarations: toGeminiFunctionDeclarations(request.tools) as any }]
      : undefined;

    try {
      let response: any;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await withTimeout(
            this.client.models.generateContent({
              model: this.model,
              contents,
              config: {
                systemInstruction: systemPrompt,
                tools: tools as any,
              },
            }),
            25000,
            `Gemini API request timed out after 25s for model ${this.model}`
          );
          break;
        } catch (genErr) {
          const msg = genErr instanceof Error ? genErr.message : String(genErr);
          if (attempt < 2 && (msg.includes('fetch failed') || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('timed out'))) {
            log.warn(`Gemini API network retry (${attempt + 1}/2): ${msg}`);
            await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
            continue;
          }
          throw genErr;
        }
      }

      // Passe le contexte complet pour que handleToolResult puisse reconstruire la conversation
      return this.parseResponse(response, contents, systemPrompt, tools);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      const cause = (err as any)?.cause ? ` (cause: ${(err as any).cause?.message || (err as any).cause})` : '';
      log.error('Gemini API error:', `${error}${cause}`);
      this.events.emit('chat.error', {
        error: err instanceof Error ? err : new Error(error),
        message: `${error}${cause}`,
        model: this.model,
      });
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
      // Le résultat doit être un objet propre et sérialisable pour Gemini functionResponse
      const responsePayload: Record<string, unknown> =
        result !== null && typeof result === 'object'
          ? (JSON.parse(JSON.stringify(result)) as Record<string, unknown>)
          : { output: String(result) };

      const modelParts = (context.modelParts && context.modelParts.length > 0)
        ? context.modelParts
        : [context.functionCallPart];

      const cleanModelParts = JSON.parse(JSON.stringify(modelParts));

      // Reconstruire la conversation complète :
      //   historique  →  model (tous les parts du modèle, y compris thought_signatures)  →  user (functionResponse)
      const updatedContents = [
        ...context.contents,
        {
          role: 'model',
          parts: cleanModelParts,
        },
        {
          role: 'user',
          parts: [
            {
              functionResponse: {
                // id requis dans les nouvelles versions du SDK @google/genai
                ...(context.functionCallPart.functionCall?.id
                  ? { id: context.functionCallPart.functionCall.id }
                  : {}),
                name: context.toolName,
                response: responsePayload,
              },
            },
          ],
        },
      ];

      let response: any;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await withTimeout(
            this.client.models.generateContent({
              model: this.model,
              contents: updatedContents,
              config: {
                systemInstruction: context.systemPrompt,
                // Réinjecte les tools pour autoriser un nouvel appel chaîné si nécessaire
                ...(context.tools ? { tools: context.tools } : {}),
              },
            }),
            25000,
            `Gemini API tool result timed out after 25s for model ${this.model}`
          );
          break;
        } catch (genErr) {
          const msg = genErr instanceof Error ? genErr.message : String(genErr);
          if (attempt < 2 && (msg.includes('fetch failed') || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('timed out'))) {
            log.warn(`Gemini tool result network retry (${attempt + 1}/2): ${msg}`);
            await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
            continue;
          }
          throw genErr;
        }
      }

      return this.parseResponse(response, updatedContents, context.systemPrompt, context.tools);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      const cause = (err as any)?.cause ? ` (cause: ${(err as any).cause?.message || (err as any).cause})` : '';
      log.error('Gemini tool result error:', `${error}${cause}`);
      this.events.emit('chat.error', {
        error: err instanceof Error ? err : new Error(error),
        message: `${error}${cause}`,
        model: this.model,
      });
      return {
        text: this.language === 'fr'
          ? 'Désolé, une erreur est survenue lors du traitement.'
          : 'Sorry, an error occurred while processing the request.',
      };
    }
  }

  onEvent<TType extends GoogleAdapterEventType>(
    type: TType,
    listener: GoogleAdapterEventListener<TType>
  ): () => void {
    return this.events.on(type, listener);
  }

  offEvent<TType extends GoogleAdapterEventType>(
    type: TType,
    listener: GoogleAdapterEventListener<TType>
  ): void {
    this.events.off(type, listener);
  }

  onAnyEvent(listener: GoogleAdapterAnyEventListener): () => void {
    return this.events.onAny(listener);
  }

  offAnyEvent(listener: GoogleAdapterAnyEventListener): void {
    this.events.offAny(listener);
  }

  private convertMessages(messages: ChatMessage[]): any[] {
    return messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
  }

  private parseResponse(response: any, contents: any[], systemPrompt: string, tools?: any[]): LLMResponse {
    const candidate = response.candidates?.[0];
    if (!candidate) {
      return { text: '' };
    }

    const parts = candidate.content?.parts || [];
    const result: LLMResponse = {};

    // Extraire le texte
    const textParts = parts.filter((p: any) => p.text);
    if (textParts.length > 0) {
      const text = textParts.map((p: any) => p.text).join('');
      result.text = text;
      this.events.emit('chat.response.text', {
        text,
        model: this.model,
      });
    }

    // Extraire les function calls
    const functionCalls = parts.filter((p: any) => p.functionCall);
    if (functionCalls.length > 0) {
      result.toolCalls = functionCalls.map((p: any) => {
        // Utilise l'id Gemini si présent (nouveau SDK), sinon en génère un
        const callId = p.functionCall?.id || `call_${generateId().slice(0, 8)}`;

        // Sauvegarder le contexte pour handleToolResult
        this.pendingToolContext.set(callId, {
          toolName: p.functionCall.name,
          args: p.functionCall.args,
          functionCallPart: p, // part complet incluant l'id Gemini
          modelParts: parts,   // tous les parts du modèle générés dans ce tour (y compris thought signatures)
          contents,            // historique complet au moment de l'appel
          systemPrompt,
          tools,
        });

        const toolCall = {
          callId,
          name: p.functionCall.name,
          args: p.functionCall.args || {},
        };
        this.events.emit('chat.tool.call', {
          toolCall,
          model: this.model,
        });
        return toolCall;
      });
    }

    // Extraire l'usage
    if (response.usageMetadata) {
      result.usage = {
        inputTokens: response.usageMetadata.promptTokenCount || 0,
        outputTokens: response.usageMetadata.candidatesTokenCount || 0,
      };
    }

    return result;
  }

  getCapabilities(): LLMAdapterCapabilities {
    return {
      provider: 'google',
      providerName: 'Google Gemini',
      currentModel: this.model,
      models: [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', supportsAudio: false, supportsTools: true, description: 'Rapide, bon rapport qualité/prix' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', supportsAudio: false, supportsTools: true, description: 'Haute qualité, raisonnement avancé' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', supportsAudio: false, supportsTools: true, description: 'Version précédente stable' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', supportsAudio: false, supportsTools: true, description: 'Context window 1M tokens' },
      ],
    };
  }
}
