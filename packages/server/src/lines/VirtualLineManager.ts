import { createLogger } from '@owllayer/core';

const log = createLogger('OwlLayer:Lines');

// ============================================================
// Types
// ============================================================

export interface VirtualLineConfig {
  /** Cle API associee (optionnel — si absent, sert de config par defaut pour toute cle) */
  apiKey?: string;
  /** Nombre de lignes disponibles (ex: 10, 20, 30) */
  count: number;
  /** Duree max d'un appel en ms (defaut: 30 min) */
  ttlMs?: number;
  /** TTL de la ligne d'attente en ms (defaut: 2 min) */
  waitingTtlMs?: number;
}

export type LineState = 'available' | 'busy' | 'waiting';

export interface VirtualLine {
  /** Identifiant interne ("line_001") */
  id: string;
  /** Numero deterministe ("OWLLAYER-48271-001") */
  number: string;
  /** Etat courant */
  state: LineState;
  /** Token de session (null si disponible) */
  token: string | null;
  /** Session ID liee (null avant bindSession) */
  sessionId: string | null;
  /** Timestamp de prise de la ligne */
  busySince: number | null;
  /** Timestamp d'expiration TTL */
  expiresAt: number | null;
}

export interface LineAcquireResult {
  success: boolean;
  /** Numero de ligne (ex: "OWLLAYER-48271-001") */
  lineNumber?: string;
  /** Token temporaire a passer en query param */
  token?: string;
  /** true si c'est la ligne d'attente */
  waiting?: boolean;
  /** Message d'erreur */
  error?: string;
}

export interface LinePoolStatus {
  apiKey: string;
  total: number;
  available: number;
  busy: number;
  lines: Array<{
    id: string;
    number: string;
    state: LineState;
    sessionId: string | null;
    busySince: number | null;
    expiresAt: number | null;
  }>;
  waitingLine: {
    id: string;
    number: string;
    state: LineState;
    sessionId: string | null;
    busySince: number | null;
    expiresAt: number | null;
  };
}

// ============================================================
// Helpers
// ============================================================

/**
 * Hash simple et deterministe d'une string → nombre positif.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash = hash & hash; // 32-bit
  }
  return Math.abs(hash);
}

/**
 * Generer un numero de ligne deterministe.
 * Format : OWLLAYER-XXXXX-NNN
 */
function generateLineNumber(apiKey: string, index: number): string {
  const hash = simpleHash(apiKey) % 100000;
  const prefix = String(hash).padStart(5, '0');
  const num = String(index).padStart(3, '0');
  return `OWLLAYER-${prefix}-${num}`;
}

/**
 * Generer un token UUID (ou fallback si crypto.randomUUID n'existe pas).
 */
function generateToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback Node.js
  try {
    const { randomUUID } = require('crypto');
    return randomUUID();
  } catch {
    // Fallback simple
    return 'xxxx-xxxx-xxxx-xxxx'.replace(/x/g, () =>
      Math.floor(Math.random() * 16).toString(16)
    );
  }
}

// ============================================================
// LinePool — Pool interne pour une API key
// ============================================================

interface LinePool {
  config: VirtualLineConfig;
  lines: VirtualLine[];
  waitingLine: VirtualLine;
  timers: Map<string, ReturnType<typeof setTimeout>>; // token → timer
}

// ============================================================
// VirtualLineManager
// ============================================================

export class VirtualLineManager {
  private pools = new Map<string, LinePool>();
  private tokenIndex = new Map<string, { apiKey: string; lineId: string }>();
  /** Config par defaut (sans apiKey) — utilisee pour auto-creer des pools */
  private defaultConfig: VirtualLineConfig | null = null;

  constructor(configs: VirtualLineConfig[]) {
    for (const config of configs) {
      if (config.apiKey) {
        this.initPool(config.apiKey, config);
      } else {
        // Config sans apiKey = pool par defaut (template)
        this.defaultConfig = config;
        log.info(`Pool par defaut configure: ${config.count} lignes (auto-creation a la connexion)`);
      }
    }
  }

  /**
   * Initialiser un pool de lignes pour une API key.
   */
  private initPool(apiKey: string, config: VirtualLineConfig): void {
    const ttlMs = config.ttlMs ?? 30 * 60 * 1000; // 30 min
    const waitingTtlMs = config.waitingTtlMs ?? 2 * 60 * 1000; // 2 min

    const lines: VirtualLine[] = [];
    for (let i = 0; i < config.count; i++) {
      lines.push({
        id: `line_${String(i + 1).padStart(3, '0')}`,
        number: generateLineNumber(apiKey, i + 1),
        state: 'available',
        token: null,
        sessionId: null,
        busySince: null,
        expiresAt: null,
      });
    }

    // Ligne d'attente (index 0)
    const waitingLine: VirtualLine = {
      id: 'line_waiting',
      number: generateLineNumber(apiKey, 0),
      state: 'available',
      token: null,
      sessionId: null,
      busySince: null,
      expiresAt: null,
    };

    this.pools.set(apiKey, {
      config: { ...config, apiKey, ttlMs, waitingTtlMs },
      lines,
      waitingLine,
      timers: new Map(),
    });

    log.info(`Pool cree: ${apiKey} → ${config.count} lignes (TTL: ${ttlMs}ms)`);
  }

  /**
   * Verifier si les virtual lines sont actives pour une API key.
   * Si un defaultConfig existe, retourne true (le pool sera cree a la volee).
   */
  hasPool(apiKey: string): boolean {
    return this.pools.has(apiKey) || this.defaultConfig !== null;
  }

  /**
   * S'assurer qu'un pool existe pour cette API key.
   * Si absent mais defaultConfig existe, le creer automatiquement.
   */
  ensurePool(apiKey: string): void {
    if (!this.pools.has(apiKey) && this.defaultConfig) {
      this.initPool(apiKey, this.defaultConfig);
    }
  }

  /**
   * Acquerir une ligne pour une API key.
   */
  acquire(apiKey: string): LineAcquireResult {
    const pool = this.pools.get(apiKey);
    if (!pool) {
      return { success: false, error: 'Aucun pool configure pour cette API key' };
    }

    // Chercher une ligne disponible
    const line = pool.lines.find(l => l.state === 'available');

    if (line) {
      const token = generateToken();
      const now = Date.now();
      const ttlMs = pool.config.ttlMs!;

      line.state = 'busy';
      line.token = token;
      line.busySince = now;
      line.expiresAt = now + ttlMs;

      // Indexer le token
      this.tokenIndex.set(token, { apiKey, lineId: line.id });

      // Demarrer le timer TTL
      const timer = setTimeout(() => this.expireLine(token), ttlMs);
      pool.timers.set(token, timer);

      log.info(`Ligne acquise: ${line.number} (token: ${token.slice(0, 8)}...)`);

      return {
        success: true,
        lineNumber: line.number,
        token,
        waiting: false,
      };
    }

    // Aucune ligne dispo → tenter la ligne d'attente
    if (pool.waitingLine.state === 'available') {
      const token = generateToken();
      const now = Date.now();
      const waitingTtlMs = pool.config.waitingTtlMs!;

      pool.waitingLine.state = 'waiting';
      pool.waitingLine.token = token;
      pool.waitingLine.busySince = now;
      pool.waitingLine.expiresAt = now + waitingTtlMs;

      this.tokenIndex.set(token, { apiKey, lineId: pool.waitingLine.id });

      const timer = setTimeout(() => this.expireLine(token), waitingTtlMs);
      pool.timers.set(token, timer);

      log.info(`Ligne d'attente assignee: ${pool.waitingLine.number} (token: ${token.slice(0, 8)}...)`);

      return {
        success: true,
        lineNumber: pool.waitingLine.number,
        token,
        waiting: true,
      };
    }

    // Meme la ligne d'attente est prise
    log.warn(`Toutes les lignes occupees pour ${apiKey}`);
    return {
      success: false,
      error: 'Toutes les lignes sont occupees, veuillez reessayer plus tard',
    };
  }

  /**
   * Valider un token et retourner le lineId.
   */
  validate(apiKey: string, token: string): string | null {
    const entry = this.tokenIndex.get(token);
    if (!entry) return null;
    if (entry.apiKey !== apiKey) return null;
    return entry.lineId;
  }

  /**
   * Verifier si un token correspond a la ligne d'attente.
   */
  isWaitingLine(token: string): boolean {
    const entry = this.tokenIndex.get(token);
    if (!entry) return false;
    return entry.lineId === 'line_waiting';
  }

  /**
   * Lier un session ID a une ligne (apres connexion WS).
   */
  bindSession(token: string, sessionId: string): void {
    const entry = this.tokenIndex.get(token);
    if (!entry) return;

    const pool = this.pools.get(entry.apiKey);
    if (!pool) return;

    const line = this.findLine(pool, entry.lineId);
    if (line) {
      line.sessionId = sessionId;
      log.debug(`Session ${sessionId} liee a la ligne ${line.number}`);
    }
  }

  /**
   * Retourner l'etat courant d'un token.
   */
  getTokenState(token: string): 'waiting' | 'ready' | 'expired' {
    const entry = this.tokenIndex.get(token);
    if (!entry) return 'expired';
    const pool = this.pools.get(entry.apiKey);
    if (!pool) return 'expired';
    const line = this.findLine(pool, entry.lineId);
    if (!line) return 'expired';
    if (line.state === 'waiting') return 'waiting';
    return 'ready';
  }

  /**
   * Liberer une ligne par token.
   * Si une ligne d'attente existe, la promouvoir automatiquement.
   */
  release(token: string): boolean {
    const entry = this.tokenIndex.get(token);
    if (!entry) return false;

    const pool = this.pools.get(entry.apiKey);
    if (!pool) return false;

    const line = this.findLine(pool, entry.lineId);
    if (!line) return false;

    // Annuler le timer
    const timer = pool.timers.get(token);
    if (timer) {
      clearTimeout(timer);
      pool.timers.delete(token);
    }

    // Remettre la ligne disponible
    line.state = 'available';
    line.token = null;
    line.sessionId = null;
    line.busySince = null;
    line.expiresAt = null;

    this.tokenIndex.delete(token);

    log.info(`Ligne liberee: ${line.number}`);

    // Si une ligne d'attente existe, la promouvoir vers cette ligne liberee
    if (line.id !== 'line_waiting' && pool.waitingLine.state === 'waiting') {
      this.promoteWaiting(pool, line);
    }

    return true;
  }

  /**
   * Promouvoir la ligne d'attente vers une ligne normale qui vient de se liberer.
   * Le meme token est reutilise — le client n'a pas besoin de re-acquerir.
   */
  private promoteWaiting(pool: LinePool, targetLine: VirtualLine): void {
    const waitingToken = pool.waitingLine.token;
    if (!waitingToken) return;

    // Annuler le timer d'attente
    const waitingTimer = pool.timers.get(waitingToken);
    if (waitingTimer) {
      clearTimeout(waitingTimer);
      pool.timers.delete(waitingToken);
    }

    // Transferer le token vers la ligne reelle
    const now = Date.now();
    const ttlMs = pool.config.ttlMs!;

    targetLine.state = 'busy';
    targetLine.token = waitingToken;
    targetLine.busySince = now;
    targetLine.expiresAt = now + ttlMs;

    // Mettre a jour l'index (meme token, nouvelle ligne)
    const entry = this.tokenIndex.get(waitingToken);
    if (entry) entry.lineId = targetLine.id;

    // Reinitialiser la ligne d'attente
    pool.waitingLine.state = 'available';
    pool.waitingLine.token = null;
    pool.waitingLine.sessionId = null;
    pool.waitingLine.busySince = null;
    pool.waitingLine.expiresAt = null;

    // Demarrer le timer TTL normal
    const timer = setTimeout(() => this.expireLine(waitingToken), ttlMs);
    pool.timers.set(waitingToken, timer);

    log.info(`Ligne d'attente promue → ${targetLine.number} (token: ${waitingToken.slice(0, 8)}...)`);
  }

  /**
   * Liberer une ligne par session ID (appele a la deconnexion WS).
   */
  releaseBySession(sessionId: string): boolean {
    for (const pool of this.pools.values()) {
      // Chercher dans les lignes normales
      for (const line of pool.lines) {
        if (line.sessionId === sessionId && line.token) {
          return this.release(line.token);
        }
      }
      // Chercher dans la ligne d'attente
      if (pool.waitingLine.sessionId === sessionId && pool.waitingLine.token) {
        return this.release(pool.waitingLine.token);
      }
    }
    return false;
  }

  /**
   * Liberer une ligne par API key + lineId sans exposer le token au dashboard.
   */
  forceRelease(apiKey: string, lineId: string): boolean {
    const pool = this.pools.get(apiKey);
    if (!pool) return false;
    const line = this.findLine(pool, lineId);
    if (!line?.token) return false;
    return this.release(line.token);
  }

  /**
   * Expirer une ligne (timer TTL ecoule).
   */
  private expireLine(token: string): void {
    const entry = this.tokenIndex.get(token);
    if (!entry) return;

    log.info(`Ligne expiree (TTL): token ${token.slice(0, 8)}...`);
    this.release(token);
  }

  /**
   * Trouver une ligne dans un pool par son ID.
   */
  private findLine(pool: LinePool, lineId: string): VirtualLine | null {
    if (lineId === 'line_waiting') return pool.waitingLine;
    return pool.lines.find(l => l.id === lineId) || null;
  }

  /**
   * Status d'un pool pour une API key.
   */
  getPoolStatus(apiKey: string): LinePoolStatus | null {
    const pool = this.pools.get(apiKey);
    if (!pool) return null;

    return {
      apiKey,
      total: pool.lines.length,
      available: pool.lines.filter(l => l.state === 'available').length,
      busy: pool.lines.filter(l => l.state === 'busy').length,
      lines: pool.lines.map(l => ({
        id: l.id,
        number: l.number,
        state: l.state,
        sessionId: l.sessionId,
        busySince: l.busySince,
        expiresAt: l.expiresAt,
      })),
      waitingLine: {
        id: pool.waitingLine.id,
        number: pool.waitingLine.number,
        state: pool.waitingLine.state,
        sessionId: pool.waitingLine.sessionId,
        busySince: pool.waitingLine.busySince,
        expiresAt: pool.waitingLine.expiresAt,
      },
    };
  }

  /**
   * Status de tous les pools.
   */
  getAllPools(): LinePoolStatus[] {
    const statuses: LinePoolStatus[] = [];
    for (const apiKey of this.pools.keys()) {
      const status = this.getPoolStatus(apiKey);
      if (status) statuses.push(status);
    }
    return statuses;
  }

  /**
   * Configurer dynamiquement un pool pour une API key.
   */
  configurePool(apiKey: string, count: number, ttlMs?: number): void {
    // Si un pool existe deja, le nettoyer
    if (this.pools.has(apiKey)) {
      this.cleanupPool(apiKey);
    }
    this.initPool(apiKey, { count, ttlMs });
  }

  /**
   * Nettoyer un pool (annuler tous les timers).
   */
  private cleanupPool(apiKey: string): void {
    const pool = this.pools.get(apiKey);
    if (!pool) return;

    for (const [token, timer] of pool.timers) {
      clearTimeout(timer);
      this.tokenIndex.delete(token);
    }
    pool.timers.clear();
    this.pools.delete(apiKey);
  }

  /**
   * Arreter le manager (cleanup de tous les pools).
   */
  stop(): void {
    for (const apiKey of this.pools.keys()) {
      this.cleanupPool(apiKey);
    }
    log.info('VirtualLineManager arrete');
  }
}
