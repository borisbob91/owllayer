import { GoogleGenAI } from '@google/genai';
import {
  generateId,
  createLogger,
  BaseLLMAdapter,
  type SystemPrompt,
  type LLMRequest,
  type LLMResponse,
  type ChatMessage,
  type LLMAdapterCapabilities,
} from '@domos/core';
import { toGeminiFunctionDeclarations } from './toolConverter.js';

const log = createLogger('DomOS:GoogleAdapter');

export interface GoogleAdapterOptions {
  /** Modele Gemini a utiliser */
  model?: string;
  /** Cle API Google */
  apiKey: string;
  /** Prompt systeme */
  systemPrompt?: SystemPrompt;
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
  private pendingToolContext: Map<string, any> = new Map();

  constructor(options: GoogleAdapterOptions) {
    super(options.systemPrompt);
    this.client = new GoogleGenAI({ apiKey: options.apiKey });
    this.model = options.model || 'gemini-2.5-flash';
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
      const response = await this.client.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          tools: tools as any,
        },
      });

      // Passe le contexte complet pour que handleToolResult puisse reconstruire la conversation
      return this.parseResponse(response, contents, systemPrompt, tools);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error('Gemini API error:', error);
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
      // Le résultat doit être un objet pour Gemini functionResponse
      const responsePayload: Record<string, unknown> =
        result !== null && typeof result === 'object'
          ? (result as Record<string, unknown>)
          : { output: String(result) };

      // Reconstruire la conversation complète :
      //   historique  →  model (functionCall)  →  user (functionResponse)
      const updatedContents = [
        ...context.contents,
        {
          role: 'model',
          parts: [context.functionCallPart], // part original de Gemini (avec id si présent)
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

      const response = await this.client.models.generateContent({
        model: this.model,
        contents: updatedContents,
        config: {
          systemInstruction: context.systemPrompt,
          // Réinjecte les tools pour autoriser un nouvel appel chaîné si nécessaire
          ...(context.tools ? { tools: context.tools } : {}),
        },
      });

      return this.parseResponse(response, updatedContents, context.systemPrompt, context.tools);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error('Gemini tool result error:', error);
      return { text: 'Desole, une erreur est survenue.' };
    }
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
      result.text = textParts.map((p: any) => p.text).join('');
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
          functionCallPart: p,  // part complet incluant l'id Gemini
          contents,             // historique complet au moment de l'appel
          systemPrompt,
          tools,
        });

        return {
          callId,
          name: p.functionCall.name,
          args: p.functionCall.args || {},
        };
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
        { id: 'gemini-2.5-flash',  name: 'Gemini 2.5 Flash',  supportsAudio: false, supportsTools: true, description: 'Rapide, bon rapport qualité/prix' },
        { id: 'gemini-2.5-pro',    name: 'Gemini 2.5 Pro',    supportsAudio: false, supportsTools: true, description: 'Haute qualité, raisonnement avancé' },
        { id: 'gemini-2.0-flash',  name: 'Gemini 2.0 Flash',  supportsAudio: false, supportsTools: true, description: 'Version précédente stable' },
        { id: 'gemini-1.5-pro',    name: 'Gemini 1.5 Pro',    supportsAudio: false, supportsTools: true, description: 'Context window 1M tokens' },
      ],
    };
  }
}
