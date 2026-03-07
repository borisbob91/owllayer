/**
 * Options de configuration pour l'authentification admin.
 */
export interface AdminAuthOptions {
  /** Username administrateur */
  username: string;

  /** Mot de passe administrateur (sera hashé avec bcrypt) */
  password: string;

  /** Durée de session en ms (défaut: 24h) */
  sessionDuration?: number;

  /** Fenêtre de rate limiting en ms (défaut: 15min) */
  rateLimitWindowMs?: number;

  /** Nombre max de tentatives de login dans la fenêtre (défaut: 5) */
  rateLimitMaxAttempts?: number;

  /** Origines CORS autorisées pour l'admin (défaut: []) */
  allowedOrigins?: string[];

  /** Forcer HTTPS en production (défaut: true en prod) */
  requireHttps?: boolean;

  /** Path de base pour l'API admin (défaut: /admin) */
  path?: string;
}

/**
 * Options de configuration pour l'authentification client.
 */
export interface ClientAuthOptions {
  /** Requérir une API key pour se connecter (défaut: true) */
  requireApiKey?: boolean;

  /** Activer la gestion des API keys via l'UI client (défaut: false) */
  enableApiKeyManagement?: boolean;

  /** Scopes autorisés pour les clients (défaut: ['tools:read', 'tools:write']) */
  allowedScopes?: string[];

  /** Nombre max de connexions simultanées par API key (défaut: 10) */
  maxConnectionsPerKey?: number;
}

/**
 * Session admin active.
 */
export interface AdminSession {
  /** Token de session (random ou JWT) */
  token: string;

  /** Username associé */
  username: string;

  /** Timestamp de création */
  createdAt: number;

  /** Timestamp d'expiration */
  expiresAt: number;

  /** Dernière activité */
  lastActivityAt: number;
}

/**
 * Tentative de login enregistrée (rate limiting).
 */
export interface LoginAttempt {
  /** IP address */
  ip: string;

  /** Timestamp de la tentative */
  timestamp: number;

  /** Succès ou échec */
  success: boolean;
}
