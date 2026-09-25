import { resolveSystemPrompt, type SystemPrompt } from '../prompt/SystemPromptConfig.js';
import type { LLMAdapter, LLMRequest, LLMResponse } from './contracts.js';
import type { ToolDeclaration } from '../protocol/aitp.types.js';

/**
 * Classe de base pour les adaptateurs LLM.
 * Fournit des utilitaires communs.
 */
export abstract class BaseLLMAdapter implements LLMAdapter {
  abstract readonly name: string;
  systemPrompt?: SystemPrompt;

  constructor(systemPrompt?: SystemPrompt) {
    this.systemPrompt = systemPrompt;
  }

  abstract chat(request: LLMRequest): Promise<LLMResponse>;
  abstract handleToolResult(callId: string, result: unknown, tools?: ToolDeclaration[]): Promise<LLMResponse>;

  /**
   * Formater le contexte UI en texte pour l'ajouter au prompt.
   */
  protected formatContext(request: LLMRequest): string {
    const parts: string[] = [];

    if (request.context.url) {
      parts.push(`[Page actuelle: ${request.context.url}]`);
    }

    if (request.context.title) {
      parts.push(`[Titre: ${request.context.title}]`);
    }

    const dataKeys = Object.keys(request.context.data);
    if (dataKeys.length > 0) {
      parts.push(`[Contexte: ${JSON.stringify(request.context.data)}]`);
    }

    return parts.join(' ');
  }

  /**
   * Construire le prompt systeme complet (prompt de base + contexte).
   * Supporte string et SystemPromptConfig via resolveSystemPrompt().
   */
  protected buildSystemPrompt(request: LLMRequest): string {
    const parts: string[] = [];

    if (this.systemPrompt) {
      parts.push(resolveSystemPrompt(this.systemPrompt));
    }

    if (request.systemPrompt) {
      parts.push(resolveSystemPrompt(request.systemPrompt));
    }

    const contextStr = this.formatContext(request);
    if (contextStr) {
      parts.push(`\n${contextStr}`);
    }

    return parts.join('\n\n');
  }
}