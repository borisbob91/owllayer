import { createLogger } from '@domos/core';

const log = createLogger('DomOS:RateLimit');

export interface RateLimitOptions {
  /** Nombre max de requetes par fenetre */
  maxRequests: number;
  /** Taille de la fenetre en ms */
  windowMs: number;
}

/**
 * Interface commune pour les rate limiters.
 */
export interface RateLimiter {
  /** Verifier si une requete est autorisee */
  check(apiKey: string): boolean | Promise<boolean>;
  /** Info restante pour une API key */
  getRemaining(apiKey: string): { remaining: number; resetAt: number } | Promise<{ remaining: number; resetAt: number }>;
  /** Arreter le rate limiter */
  stop(): void;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Middleware de rate limiting par API key (en memoire).
 */
export class RateLimitMiddleware implements RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(private options: RateLimitOptions) {
    // Nettoyage periodique des entrees expirees
    this.cleanupTimer = setInterval(() => this.cleanup(), options.windowMs);
  }

  /**
   * Verifier si une requete est autorisee.
   * @returns true si autorise, false si rate limited.
   */
  check(apiKey: string): boolean {
    const now = Date.now();
    let entry = this.limits.get(apiKey);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + this.options.windowMs };
      this.limits.set(apiKey, entry);
    }

    entry.count++;

    if (entry.count > this.options.maxRequests) {
      log.warn(`Rate limit depasse pour ${apiKey.slice(0, 8)}... (${entry.count}/${this.options.maxRequests})`);
      return false;
    }

    return true;
  }

  /**
   * Info restante pour une API key.
   */
  getRemaining(apiKey: string): { remaining: number; resetAt: number } {
    const entry = this.limits.get(apiKey);
    if (!entry || Date.now() >= entry.resetAt) {
      return { remaining: this.options.maxRequests, resetAt: Date.now() + this.options.windowMs };
    }
    return {
      remaining: Math.max(0, this.options.maxRequests - entry.count),
      resetAt: entry.resetAt,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits) {
      if (now >= entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Arreter le timer de cleanup.
   */
  stop(): void {
    clearInterval(this.cleanupTimer);
  }
}

// ============================================================
// Redis Rate Limiter — Rate limiting distribue via Redis
// ============================================================

/**
 * Options pour le RedisRateLimiter.
 */
export interface RedisRateLimitOptions extends RateLimitOptions {
  /** URL de connexion Redis (ex: 'redis://localhost:6379') */
  redisUrl: string;

  /** Prefixe des cles Redis (defaut: 'domos:rl:') */
  keyPrefix?: string;
}

/**
 * RedisRateLimiter — Rate limiting distribue via Redis.
 *
 * Utilise le pattern "sliding window counter" avec INCR + EXPIRE.
 * Partage l'etat entre plusieurs instances du serveur.
 *
 * Necessite `ioredis` en peer dependency :
 * ```bash
 * pnpm add ioredis
 * ```
 *
 * @example
 * ```ts
 * const limiter = new RedisRateLimiter({
 *   maxRequests: 100,
 *   windowMs: 60_000,
 *   redisUrl: 'redis://localhost:6379',
 * });
 * await limiter.connect();
 *
 * if (await limiter.check('pk_live_xxx')) {
 *   // Requete autorisee
 * }
 * ```
 */
export class RedisRateLimiter implements RateLimiter {
  private redis: any = null;
  private keyPrefix: string;

  constructor(private options: RedisRateLimitOptions) {
    this.keyPrefix = options.keyPrefix || 'domos:rl:';
  }

  /**
   * Connexion a Redis.
   */
  async connect(): Promise<void> {
    const { default: Redis } = await import('ioredis');
    this.redis = new Redis(this.options.redisUrl);

    this.redis.on('error', (err: any) => {
      log.error('Redis error:', String(err));
    });

    log.info('RedisRateLimiter connecte');
  }

  /**
   * Verifier si une requete est autorisee (async).
   */
  async check(apiKey: string): Promise<boolean> {
    if (!this.redis) {
      log.warn('Redis non connecte, autorisation par defaut');
      return true;
    }

    const key = this.buildKey(apiKey);
    const windowSec = Math.ceil(this.options.windowMs / 1000);

    try {
      // INCR atomique + TTL si la cle n'existe pas
      const count = await this.redis.incr(key);

      if (count === 1) {
        // Premiere requete dans la fenetre : definir l'expiration
        await this.redis.expire(key, windowSec);
      }

      if (count > this.options.maxRequests) {
        log.warn(`Rate limit Redis depasse pour ${apiKey.slice(0, 8)}... (${count}/${this.options.maxRequests})`);
        return false;
      }

      return true;
    } catch (err) {
      log.error('Redis check error:', String(err));
      // En cas d'erreur Redis, on autorise (fail-open)
      return true;
    }
  }

  /**
   * Info restante pour une API key (async).
   */
  async getRemaining(apiKey: string): Promise<{ remaining: number; resetAt: number }> {
    if (!this.redis) {
      return { remaining: this.options.maxRequests, resetAt: Date.now() + this.options.windowMs };
    }

    const key = this.buildKey(apiKey);

    try {
      const [count, ttl] = await Promise.all([
        this.redis.get(key),
        this.redis.ttl(key),
      ]);

      const currentCount = parseInt(count || '0', 10);
      const resetAt = ttl > 0 ? Date.now() + ttl * 1000 : Date.now() + this.options.windowMs;

      return {
        remaining: Math.max(0, this.options.maxRequests - currentCount),
        resetAt,
      };
    } catch {
      return { remaining: this.options.maxRequests, resetAt: Date.now() + this.options.windowMs };
    }
  }

  /**
   * Arreter le rate limiter et deconnecter Redis.
   */
  stop(): void {
    if (this.redis) {
      this.redis.disconnect();
      this.redis = null;
      log.info('RedisRateLimiter deconnecte');
    }
  }

  private buildKey(apiKey: string): string {
    const windowId = Math.floor(Date.now() / this.options.windowMs);
    return `${this.keyPrefix}${apiKey}:${windowId}`;
  }
}
