import type { ChatMessage } from '../llm/types.js';

/**
 * ConversationBuffer - Historique conversationnel a fenetre glissante.
 *
 * Garde les N derniers messages pour eviter de depasser
 * la fenetre de contexte du LLM.
 */
export class ConversationBuffer {
  private messages: ChatMessage[] = [];

  constructor(private maxMessages: number = 50) {}

  /**
   * Ajouter un message utilisateur.
   */
  addUserMessage(content: string): void {
    this.messages.push({ role: 'user', content });
    this.trim();
  }

  /**
   * Ajouter un message assistant.
   */
  addAssistantMessage(content: string): void {
    this.messages.push({ role: 'assistant', content });
    this.trim();
  }

  /**
   * Ajouter un message systeme.
   */
  addSystemMessage(content: string): void {
    this.messages.push({ role: 'system', content });
    this.trim();
  }

  /**
   * Recuperer tous les messages.
   */
  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  /**
   * Recuperer les N derniers messages.
   */
  getLastMessages(count: number): ChatMessage[] {
    return this.messages.slice(-count);
  }

  /**
   * Nombre de messages.
   */
  get length(): number {
    return this.messages.length;
  }

  /**
   * Vider l'historique.
   */
  clear(): void {
    this.messages = [];
  }

  private trim(): void {
    if (this.messages.length > this.maxMessages) {
      // Garder le premier message systeme s'il existe
      const first = this.messages[0];
      if (first?.role === 'system') {
        this.messages = [first, ...this.messages.slice(-(this.maxMessages - 1))];
      } else {
        this.messages = this.messages.slice(-this.maxMessages);
      }
    }
  }
}
