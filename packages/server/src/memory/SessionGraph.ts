/**
 * SessionGraph - Metriques et etat d'une session.
 *
 * Stocke :
 * - Historique des pages visitees
 * - Tools appeles et leur frequence
 * - Metriques (tokens, latence, erreurs)
 */
export class SessionGraph {
  /** Pages visitees dans l'ordre */
  private pageHistory: { url: string; visitedAt: number }[] = [];

  /** Compteur d'appels par tool */
  private toolCallCounts = new Map<string, number>();

  /** Metriques */
  private metrics = {
    totalMessages: 0,
    totalToolCalls: 0,
    totalTokensIn: 0,
    totalTokensOut: 0,
    errors: 0,
  };

  constructor(public readonly sessionId: string) {}

  /**
   * Enregistrer un changement de page.
   */
  recordContextChange(url: string): void {
    this.pageHistory.push({ url, visitedAt: Date.now() });
  }

  /**
   * Enregistrer un appel de tool.
   */
  recordToolCall(toolName: string): void {
    const count = this.toolCallCounts.get(toolName) || 0;
    this.toolCallCounts.set(toolName, count + 1);
    this.metrics.totalToolCalls++;
  }

  /**
   * Enregistrer un message.
   */
  recordMessage(): void {
    this.metrics.totalMessages++;
  }

  /**
   * Enregistrer l'usage de tokens.
   */
  recordTokens(inputTokens: number, outputTokens: number): void {
    this.metrics.totalTokensIn += inputTokens;
    this.metrics.totalTokensOut += outputTokens;
  }

  /**
   * Enregistrer une erreur.
   */
  recordError(): void {
    this.metrics.errors++;
  }

  /**
   * Historique des pages.
   */
  getPageHistory(): { url: string; visitedAt: number }[] {
    return [...this.pageHistory];
  }

  /**
   * Tools les plus utilises.
   */
  getTopTools(limit: number = 5): { name: string; count: number }[] {
    return Array.from(this.toolCallCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Metriques completes.
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Resume de la session (pour logs/analytics).
   */
  getSummary() {
    return {
      sessionId: this.sessionId,
      pagesVisited: this.pageHistory.length,
      topTools: this.getTopTools(3),
      metrics: this.getMetrics(),
    };
  }
}
