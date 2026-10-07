/**
 * Compteur a fenetre fixe : `limit` evenements par fenetre de `windowMs` et par cle.
 * Utilise pour borner les messages par connexion et par API key (cout LLM).
 */
export class RateLimiter {
  private windows = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly limit: number, private readonly windowMs: number) {}

  /**
   * Enregistrer un evenement pour `key`.
   * @returns false si la limite de la fenetre courante est depassee.
   */
  hit(key: string, now = Date.now()): boolean {
    if (this.limit <= 0) return true;

    let entry = this.windows.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.windows.set(key, entry);
      this.prune(now);
    }
    entry.count++;
    return entry.count <= this.limit;
  }

  /** Oublier une cle (fermeture de connexion). */
  forget(key: string): void {
    this.windows.delete(key);
  }

  // Borne la memoire : les fenetres expirees sont retirees au fil des creations
  private prune(now: number): void {
    if (this.windows.size < 10_000) return;
    for (const [key, entry] of this.windows) {
      if (now >= entry.resetAt) this.windows.delete(key);
    }
  }
}
