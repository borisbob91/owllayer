import type { ChatMessage } from '../llm/types.js';
import type { ShadowContext } from '@domos/core';

// ============================================================
// Interface SessionStore — Abstraction de persistence des sessions
// ============================================================

/**
 * Donnees persistees d'une session.
 * Sous-ensemble serialisable de Session (sans les objets runtime).
 */
export interface SessionData {
  /** ID unique de la session */
  id: string;

  /** Cle API du client */
  apiKey: string;

  /** Historique conversationnel */
  messages: ChatMessage[];

  /** Contexte UI courant */
  context: ShadowContext;

  /** Timestamp de creation */
  createdAt: number;

  /** Timestamp de derniere activite */
  lastActivityAt: number;

  /** Metadata custom (extensible) */
  metadata?: Record<string, unknown>;
}

/**
 * Interface abstraite pour la persistence des sessions.
 *
 * Implementee par :
 * - MemoryStore (defaut, en memoire)
 * - MongoStore (MongoDB)
 *
 * @example
 * ```ts
 * const store = new MongoStore({ uri: 'mongodb://...' });
 * await store.connect();
 *
 * await store.save({
 *   id: 'sess_abc123',
 *   apiKey: 'pk_live_xxx',
 *   messages: [...],
 *   context: { url: '/products', data: {} },
 *   createdAt: Date.now(),
 *   lastActivityAt: Date.now(),
 * });
 *
 * const session = await store.load('sess_abc123');
 * ```
 */
export interface SessionStore {
  /** Nom du store (pour les logs) */
  readonly name: string;

  /** Connexion au backend (si necessaire) */
  connect?(): Promise<void>;

  /** Deconnexion du backend */
  disconnect?(): Promise<void>;

  /** Sauvegarder ou mettre a jour une session */
  save(data: SessionData): Promise<void>;

  /** Charger une session par ID */
  load(sessionId: string): Promise<SessionData | null>;

  /** Supprimer une session */
  delete(sessionId: string): Promise<void>;

  /** Lister toutes les sessions (avec filtre optionnel par apiKey) */
  list(apiKey?: string): Promise<SessionData[]>;

  /** Nettoyer les sessions expirees */
  cleanup(maxAgeMs: number): Promise<number>;
}

/**
 * Options communes pour les stores.
 */
export interface StoreOptions {
  /** Duree max d'une session avant expiration (defaut: 24h) */
  sessionTTL?: number;

  /** Intervalle de nettoyage auto (defaut: 1h, 0 = desactive) */
  cleanupInterval?: number;
}
