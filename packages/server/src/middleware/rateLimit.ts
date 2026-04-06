import { MessageType, createLogger } from '@domos/core';

const log = createLogger('DomOS:RateLimit');

// ============================================================
// Types publics
// ============================================================

/**
 * Options legacy (fenetre fixe par API key) — conserve pour compat RedisRateLimiter.
 */
export interface RateLimitOptions {
  /** Nombre max de requetes par fenetre */
  maxRequests: number;
  /** Taille de la fenetre en ms */
  windowMs: number;
}

/**
 * Options WebSocket-native avec 2 couches.
 *
 * Couche 1 — burst anti-DoS (par connexion) :
 *   Bloque les connexions qui envoient trop de messages en rafale.
 *   Ferme la connexion apres N refus consecutifs.
 *
 * Couche 2 — quota AI (par API key) :
 *   Limite les vraies requetes AI (USER_INPUT, APPROVAL_REQUEST).
 *   Les messages de protocole (audio, context, tool results) ne comptent pas.
 */
export interface WsRateLimitOptions {
  /** Desactiver completement (dev/test). Defaut: false */
  disabled?: boolean;

  /** Couche 1 — burst : max messages par connexion par fenetre courte */
  burstLimit?: number;
  /** Couche 1 — fenetre burst en ms. Defaut: 1000 (1 seconde) */
  burstWindowMs?: number;
  /** Couche 1 — nb de refus burst consecutifs avant fermeture connexion. Defaut: 5 */
  burstCloseAfter?: number;

  /** Couche 2 — quota : max requetes AI par API key. Defaut: 30 */
  maxRequests?: number;
  /** Couche 2 — fenetre quota en ms. Defaut: 300_000 (5 minutes) */
  windowMs?: number;
}

/**
 * Resultat d'une verification de rate limit.
 */
export interface RateLimitResult {
  allowed: boolean;
  /** Si bloque: ms avant de pouvoir reessayer */
  retryAfter?: number;
  /** Messages restants dans la fenetre courante */
  remaining?: number;
  /** Limite de la fenetre courante */
  limit?: number;
  /** Raison du blocage */
  reason?: 'burst' | 'quota';
  /** Si true: la connexion doit etre fermee (attaquant detecte) */
  closeConnection?: boolean;
}

/**
 * Interface commune pour les rate limiters.
 * check() conserve la signature originale pour compat RedisRateLimiter.
 */
export interface RateLimiter {
  check(apiKey: string): boolean | Promise<boolean>;
  getRemaining(apiKey: string): { remaining: number; resetAt: number } | Promise<{ remaining: number; resetAt: number }>;
  stop(): void;
}

/**
 * Interface etendue pour le rate limiter WebSocket-native.
 */
export interface WsRateLimiter extends RateLimiter {
  checkMessage(connId: string, apiKey: string, messageType: MessageType): RateLimitResult;
  onDisconnect(connId: string): void;
}

// ============================================================
// Types de messages qui comptent pour le quota AI
// ============================================================

const AI_REQUEST_TYPES = new Set<MessageType>([
  MessageType.USER_INPUT,
  MessageType.VOICE_INPUT_END,
]);

// ============================================================
// WsRateLimitMiddleware — 2 couches, WebSocket-native
// ============================================================

interface BurstEntry {
  count: number;
  resetAt: number;
  consecutiveRefusals: number;
}

interface QuotaEntry {
  count: number;
  resetAt: number;
}

export class WsRateLimitMiddleware implements WsRateLimiter {
  private readonly burstLimit: number;
  private readonly burstWindowMs: number;
  private readonly burstCloseAfter: number;
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly disabled: boolean;

  private burstMap = new Map<string, BurstEntry>();   // connId -> entry
  private quotaMap = new Map<string, QuotaEntry>();    // connId -> entry (per session)
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(options: WsRateLimitOptions = {}) {
    this.disabled       = options.disabled ?? false;
    this.burstLimit     = options.burstLimit ?? 15;
    this.burstWindowMs  = options.burstWindowMs ?? 1_000;
    this.burstCloseAfter = options.burstCloseAfter ?? 5;
    this.maxRequests    = options.maxRequests ?? 30;
    this.windowMs       = options.windowMs ?? 300_000;

    // Cleanup toutes les 60s
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
  }

  /**
   * Verification 2-couches pour un message WebSocket entrant.
   */
  checkMessage(connId: string, apiKey: string, messageType: MessageType): RateLimitResult {
    if (this.disabled) return { allowed: true };

    // --- Couche 1 : burst anti-DoS par connexion ---
    const burstResult = this.checkBurst(connId);
    if (!burstResult.allowed) return burstResult;

    // --- Couche 2 : quota AI par connexion (uniquement sur USER_INPUT / VOICE_INPUT_END) ---
    if (AI_REQUEST_TYPES.has(messageType)) {
      return this.checkQuota(connId);
    }

    return { allowed: true };
  }

  /**
   * Nettoyer l'etat burst quand une connexion se ferme.
   */
  onDisconnect(connId: string): void {
    this.burstMap.delete(connId);
    this.quotaMap.delete(connId);
  }

  // ---- check() legacy : deleguee au quota par API key (compat RedisRateLimiter) ----
  check(apiKey: string): boolean {
    if (this.disabled) return true;
    const result = this.checkQuota(apiKey);
    return result.allowed;
  }

  getRemaining(apiKey: string): { remaining: number; resetAt: number } {
    const entry = this.quotaMap.get(apiKey);
    if (!entry || Date.now() >= entry.resetAt) {
      return { remaining: this.maxRequests, resetAt: Date.now() + this.windowMs };
    }
    return {
      remaining: Math.max(0, this.maxRequests - entry.count),
      resetAt: entry.resetAt,
    };
  }

  stop(): void {
    clearInterval(this.cleanupTimer);
  }

  // ============================================================
  // Logique interne
  // ============================================================

  private checkBurst(connId: string): RateLimitResult {
    const now = Date.now();
    let entry = this.burstMap.get(connId);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + this.burstWindowMs, consecutiveRefusals: 0 };
      this.burstMap.set(connId, entry);
    }

    entry.count++;

    if (entry.count > this.burstLimit) {
      entry.consecutiveRefusals++;
      const retryAfter = entry.resetAt - now;

      if (entry.consecutiveRefusals >= this.burstCloseAfter) {
        log.warn(`Burst attack detecte sur connexion ${connId.slice(0, 8)} (${entry.consecutiveRefusals} refus consecutifs) - fermeture`);
        return {
          allowed: false,
          retryAfter,
          remaining: 0,
          limit: this.burstLimit,
          reason: 'burst',
          closeConnection: true,
        };
      }

      log.warn(`Burst limite depasse sur connexion ${connId.slice(0, 8)} (${entry.count}/${this.burstLimit} msg/${this.burstWindowMs}ms)`);
      return {
        allowed: false,
        retryAfter,
        remaining: 0,
        limit: this.burstLimit,
        reason: 'burst',
      };
    }

    // Remise a zero des refus consecutifs si passage reussi
    entry.consecutiveRefusals = 0;
    return { allowed: true };
  }

  private checkQuota(apiKey: string): RateLimitResult {
    const now = Date.now();
    let entry = this.quotaMap.get(apiKey);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.quotaMap.set(apiKey, entry);
    }

    entry.count++;

    if (entry.count > this.maxRequests) {
      const retryAfter = entry.resetAt - now;
      log.warn(`Quota AI depasse pour ${apiKey.slice(0, 8)}... (${entry.count}/${this.maxRequests})`);
      return {
        allowed: false,
        retryAfter,
        remaining: 0,
        limit: this.maxRequests,
        reason: 'quota',
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - entry.count),
      limit: this.maxRequests,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.burstMap) {
      if (now >= entry.resetAt) this.burstMap.delete(key);
    }
    for (const [key, entry] of this.quotaMap) {
      if (now >= entry.resetAt) this.quotaMap.delete(key);
    }
  }
}

// ============================================================
// RateLimitMiddleware legacy — conserve pour compat
// ============================================================

/**
 * @deprecated Utiliser WsRateLimitMiddleware pour les connexions WebSocket.
 */
export class RateLimitMiddleware implements RateLimiter {
  private limits = new Map<string, { count: number; resetAt: number }>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(private options: RateLimitOptions) {
    this.cleanupTimer = setInterval(() => this.cleanup(), options.windowMs);
  }

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
      if (now >= entry.resetAt) this.limits.delete(key);
    }
  }

  stop(): void {
    clearInterval(this.cleanupTimer);
  }
}

// ============================================================
// Redis Rate Limiter — Rate limiting distribue via Redis
// ============================================================

export interface RedisRateLimitOptions extends RateLimitOptions {
  redisUrl: string;
  keyPrefix?: string;
}

export class RedisRateLimiter implements RateLimiter {
  private redis: any = null;
  private keyPrefix: string;

  constructor(private options: RedisRateLimitOptions) {
    this.keyPrefix = options.keyPrefix || 'domos:rl:';
  }

  async connect(): Promise<void> {
    const { default: Redis } = await import('ioredis');
    this.redis = new Redis(this.options.redisUrl);
    this.redis.on('error', (err: any) => {
      log.error('Redis error:', String(err));
    });
    log.info('RedisRateLimiter connecte');
  }

  async check(apiKey: string): Promise<boolean> {
    if (!this.redis) {
      log.warn('Redis non connecte, autorisation par defaut');
      return true;
    }

    const key = this.buildKey(apiKey);
    const windowSec = Math.ceil(this.options.windowMs / 1000);

    try {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, windowSec);
      }
      if (count > this.options.maxRequests) {
        log.warn(`Rate limit Redis depasse pour ${apiKey.slice(0, 8)}... (${count}/${this.options.maxRequests})`);
        return false;
      }
      return true;
    } catch (err) {
      log.error('Redis check error:', String(err));
      return true;
    }
  }

  async getRemaining(apiKey: string): Promise<{ remaining: number; resetAt: number }> {
    if (!this.redis) {
      return { remaining: this.options.maxRequests, resetAt: Date.now() + this.options.windowMs };
    }

    const key = this.buildKey(apiKey);
    try {
      const [count, ttl] = await Promise.all([this.redis.get(key), this.redis.ttl(key)]);
      const currentCount = parseInt(count || '0', 10);
      const resetAt = ttl > 0 ? Date.now() + ttl * 1000 : Date.now() + this.options.windowMs;
      return { remaining: Math.max(0, this.options.maxRequests - currentCount), resetAt };
    } catch {
      return { remaining: this.options.maxRequests, resetAt: Date.now() + this.options.windowMs };
    }
  }

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
