import type { ChatMessage } from '../llm/types.js';
import type { ShadowContext, SystemPrompt } from '@domos/core';

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

// ============================================================
// Interface ApiKeyStore — Abstraction de persistence des API keys
// ============================================================

/**
 * Enregistrement d'une API key avec ses métadonnées.
 */
export type ApiKeyStatus = 'active' | 'disabled' | 'revoked';

export interface ApiKeyRecord {
  /** La clé API (valeur brute) */
  key: string;
  /** Nom lisible de la clé / de l'agent associé */
  name?: string;
  /** Description de l'usage de cette clé */
  description?: string;
  /** Frameworks clients autorisés */
  clientType?: ('react' | 'vue' | 'svelte' | 'browser')[];
  /** Timestamp de création */
  createdAt: number;
  /** Etat operationnel de la cle */
  status?: ApiKeyStatus;
  /** Timestamp de derniere modification metadata/lifecycle */
  updatedAt?: number;
  /** Timestamp de derniere authentification reussie */
  lastUsedAt?: number;
  /** Timestamp de revocation */
  revokedAt?: number;
  /** Timestamp de rotation */
  rotatedAt?: number;
}

/**
 * Interface abstraite pour la persistence des API keys client.
 *
 * Implémentée par :
 * - MemoryApiKeyStore (défaut, en mémoire)
 * - SQLiteApiKeyStore (better-sqlite3)
 * - MongoApiKeyStore (MongoDB)
 */
export interface ApiKeyStore {
  readonly name: string;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  /** Créer ou mettre à jour une API key */
  save(record: ApiKeyRecord): Promise<void>;
  /** Charger une API key par sa valeur */
  load(key: string): Promise<ApiKeyRecord | null>;
  /** Supprimer une API key */
  delete(key: string): Promise<void>;
  /** Lister toutes les API keys */
  list(): Promise<ApiKeyRecord[]>;
  /** Vérification rapide d'existence (utilisée par auth) */
  hasKey(key: string): Promise<boolean>;
}

// ============================================================
// Interface AgentStore — Abstraction de persistence des agents (system prompts)
// ============================================================

/**
 * Enregistrement d'un agent (system prompt lié à une API key).
 */
export interface AgentRecord {
  /** API key associée */
  apiKey: string;
  /** System prompt (string ou config structurée) */
  prompt: SystemPrompt;
  /** Timestamp de création */
  createdAt: number;
  /** Timestamp de dernière modification */
  updatedAt: number;
}

/**
 * Interface abstraite pour la persistence des agents / system prompts.
 *
 * Implémentée par :
 * - MemoryAgentStore (défaut, en mémoire)
 * - SQLiteAgentStore (better-sqlite3)
 * - MongoAgentStore (MongoDB)
 */
export interface AgentStore {
  readonly name: string;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  /** Créer ou mettre à jour un agent */
  save(record: AgentRecord): Promise<void>;
  /** Charger un agent par son API key */
  load(apiKey: string): Promise<AgentRecord | null>;
  /** Supprimer un agent */
  delete(apiKey: string): Promise<void>;
  /** Lister tous les agents */
  list(): Promise<AgentRecord[]>;
}
