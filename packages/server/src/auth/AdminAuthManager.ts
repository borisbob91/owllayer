import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { createLogger } from '@owllayer/core';
import type { AdminAuthOptions, AdminSession, LoginAttempt } from './types.js';

// Réexporter les types pour usage externe
export type { AdminAuthOptions, AdminSession, LoginAttempt };

const log = createLogger('OwlLayer:AdminAuth');

const BCRYPT_ROUNDS = 10;
const DEFAULT_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24h
const DEFAULT_RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15min
const DEFAULT_MAX_ATTEMPTS = 5;

/**
 * Gestionnaire d'authentification admin.
 * - Username/password avec bcrypt
 * - Session-based auth (tokens aléatoires)
 * - Rate limiting sur login
 * - Protection timing attack
 */
export class AdminAuthManager {
  private passwordHash: string = '';
  private sessions = new Map<string, AdminSession>();
  private loginAttempts = new Map<string, LoginAttempt[]>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private options: AdminAuthOptions) {
    // Hash le mot de passe une fois au démarrage (synchrone)
    this.passwordHash = bcrypt.hashSync(options.password, BCRYPT_ROUNDS);

    // Nettoyer les sessions expirées toutes les heures
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
      this.cleanupOldAttempts();
    }, 60 * 60 * 1000);

    log.info(`AdminAuth initialisé pour user: ${options.username}`);
  }

  /**
   * Login avec username/password.
   * @returns Session token si succès, null sinon
   */
  async login(username: string, password: string, ip: string): Promise<string | null> {
    // Rate limiting
    if (!this.checkRateLimit(ip)) {
      log.warn(`Rate limit dépassé pour IP: ${ip}`);
      this.recordAttempt(ip, false);
      throw new Error('Trop de tentatives de connexion. Réessayez dans 15 minutes.');
    }

    // Validation username (protection timing attack via bcrypt.compare)
    const isUsernameValid = username === this.options.username;
    
    // Toujours comparer le password même si username invalide (timing attack protection)
    const isPasswordValid = this.passwordHash
      ? await bcrypt.compare(password, this.passwordHash)
      : false;

    if (!isUsernameValid || !isPasswordValid) {
      log.warn(`Tentative de login échouée pour: ${username} depuis ${ip}`);
      this.recordAttempt(ip, false);
      return null;
    }

    // Login réussi - créer session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const duration = this.options.sessionDuration || DEFAULT_SESSION_DURATION;

    const session: AdminSession = {
      token: sessionToken,
      username,
      createdAt: now,
      expiresAt: now + duration,
      lastActivityAt: now,
    };

    this.sessions.set(sessionToken, session);
    this.recordAttempt(ip, true);

    log.info(`Login réussi pour ${username} depuis ${ip}`);
    return sessionToken;
  }

  /**
   * Vérifier si un token de session est valide.
   */
  verifySession(token: string): AdminSession | null {
    const session = this.sessions.get(token);
    if (!session) return null;

    const now = Date.now();
    if (session.expiresAt < now) {
      this.sessions.delete(token);
      return null;
    }

    // Mettre à jour lastActivityAt
    session.lastActivityAt = now;
    return session;
  }

  /**
   * Logout (invalider session).
   */
  logout(token: string): boolean {
    return this.sessions.delete(token);
  }

  /**
   * Vérifier le rate limiting pour une IP.
   */
  private checkRateLimit(ip: string): boolean {
    const attempts = this.loginAttempts.get(ip) || [];
    const window = this.options.rateLimitWindowMs || DEFAULT_RATE_LIMIT_WINDOW;
    const maxAttempts = this.options.rateLimitMaxAttempts || DEFAULT_MAX_ATTEMPTS;
    const now = Date.now();

    // Compter les tentatives dans la fenêtre
    const recentAttempts = attempts.filter(a => now - a.timestamp < window);
    return recentAttempts.length < maxAttempts;
  }

  /**
   * Enregistrer une tentative de login.
   */
  private recordAttempt(ip: string, success: boolean): void {
    const attempts = this.loginAttempts.get(ip) || [];
    attempts.push({
      ip,
      timestamp: Date.now(),
      success,
    });
    this.loginAttempts.set(ip, attempts);
  }

  /**
   * Nettoyer les sessions expirées.
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log.info(`Nettoyé ${cleaned} session(s) expirée(s)`);
    }
  }

  /**
   * Nettoyer les anciennes tentatives de login (> 1h).
   */
  private cleanupOldAttempts(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    for (const [ip, attempts] of this.loginAttempts.entries()) {
      const recentAttempts = attempts.filter(a => now - a.timestamp < oneHour);
      if (recentAttempts.length === 0) {
        this.loginAttempts.delete(ip);
      } else {
        this.loginAttempts.set(ip, recentAttempts);
      }
    }
  }

  /**
   * Obtenir les statistiques admin.
   */
  getStats() {
    return {
      activeSessions: this.sessions.size,
      trackedIPs: this.loginAttempts.size,
      username: this.options.username,
    };
  }

  /**
   * Arrêter le manager (cleanup interval).
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
