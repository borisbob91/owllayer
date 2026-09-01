import {
  ToolRegistry,
  createLogger,
  generateId,
  type ToolDeclaration,
  type ShadowContext,
  RiskLevel,
} from '@owllayer/core';
import type { ConnectionId } from '../transport/Transport.js';
import { ConversationBuffer } from '../memory/ConversationBuffer.js';
import { SessionGraph } from '../memory/SessionGraph.js';
import type { SessionStore, SessionData } from '../persistence/types.js';

const log = createLogger('OwlLayer:Session');

/**
 * Etat d'une session.
 */
export type SessionState = 'handshake' | 'active' | 'closing' | 'closed';

/**
 * Session OwlLayer - Represente une connexion client active.
 */
export interface Session {
  /** ID unique de la session */
  id: string;

  /** ID de la connexion WebSocket */
  connId: ConnectionId;

  /** Cle API du client */
  apiKey: string;

  /** Etat de la session */
  state: SessionState;

  /** Registre de tools dynamique pour cette session */
  toolRegistry: ToolRegistry;

  /** Contexte UI courant */
  context: ShadowContext;

  /** Historique conversationnel */
  conversation: ConversationBuffer;

  /** Graphe de session (metriques + etat) */
  graph: SessionGraph;

  /** Timestamp de creation */
  createdAt: number;

  /** Timestamp de derniere activite */
  lastActivityAt: number;
}

export interface SessionLifecycleHooks {
  onSessionCreated?: (session: Session) => void | Promise<void>;
  onBeforeSessionDestroy?: (session: Session) => void | Promise<void>;
}

/**
 * SessionManager - Gere le cycle de vie des sessions.
 *
 * Supporte un SessionStore optionnel pour persister les sessions
 * (MongoDB, Redis, etc.). Par defaut, tout reste en memoire.
 */
export class SessionManager {
  private sessions = new Map<string, Session>();
  private connToSession = new Map<ConnectionId, string>();
  private store: SessionStore | null = null;
  private hooks: SessionLifecycleHooks = {};

  constructor(
    private maxConversationMessages: number = 50
  ) {}

  /**
   * Attacher un SessionStore pour la persistence.
   * Le store doit etre connecte avant d'etre passe.
   */
  setStore(store: SessionStore): void {
    this.store = store;
    log.info(`SessionStore attached: ${store.name}`);
  }

  setLifecycleHooks(hooks: SessionLifecycleHooks): void {
    this.hooks = hooks;
  }

  /**
   * Creer une nouvelle session pour une connexion.
   */
  create(connId: ConnectionId, apiKey: string): Session {
    const sessionId = `sess_${generateId().slice(0, 8)}`;

    const session: Session = {
      id: sessionId,
      connId,
      apiKey,
      state: 'handshake',
      toolRegistry: new ToolRegistry(),
      context: {
        url: '',
        data: {},
        updatedAt: Date.now(),
      },
      conversation: new ConversationBuffer(this.maxConversationMessages),
      graph: new SessionGraph(sessionId),
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    this.sessions.set(sessionId, session);
    this.connToSession.set(connId, sessionId);
    void this.hooks.onSessionCreated?.(session);

    log.info(`Session created: ${sessionId} for connection ${connId}`);
    return session;
  }

  /**
   * Activer une session (apres le handshake).
   */
  activate(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.state = 'active';
      log.info(`Session activated: ${sessionId}`);
    }
  }

  /**
   * Recuperer une session par ID.
   */
  get(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Recuperer une session par connexion ID.
   */
  getByConnection(connId: ConnectionId): Session | undefined {
    const sessionId = this.connToSession.get(connId);
    if (sessionId) {
      return this.sessions.get(sessionId);
    }
    return undefined;
  }

  /**
   * Mettre a jour le contexte UI d'une session.
   */
  updateContext(
    sessionId: string,
    url: string,
    title?: string,
    activeTools?: ToolDeclaration[],
    contextData?: Record<string, unknown>
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.context = {
      url,
      title,
      data: contextData ?? session.context.data,
      updatedAt: Date.now(),
    };

    // Synchroniser le registre de tools
    if (activeTools) {
      session.toolRegistry.clear();
      for (const tool of activeTools) {
        session.toolRegistry.add({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          risk: this.normalizeRisk(tool.risk),
          source: 'client',
        });
      }
    }

    session.lastActivityAt = Date.now();
    log.debug(`Context mis a jour pour session ${sessionId}: ${url}`);
  }

  /**
   * Enregistrer une activite sur la session.
   */
  touch(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = Date.now();
    }
  }

  /**
   * Persister une session dans le store (si attache).
   */
  async persist(sessionId: string): Promise<void> {
    if (!this.store) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const data: SessionData = {
      id: session.id,
      apiKey: session.apiKey,
      messages: session.conversation.getMessages(),
      context: session.context,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
    };

    await this.store.save(data);
  }

  /**
   * Restaurer une session depuis le store.
   */
  async restore(sessionId: string, connId: ConnectionId): Promise<Session | null> {
    if (!this.store) return null;

    const data = await this.store.load(sessionId);
    if (!data) return null;

    const conversation = new ConversationBuffer(this.maxConversationMessages);
    // Restaurer les messages
    for (const msg of data.messages) {
      if (msg.role === 'user') conversation.addUserMessage(msg.content);
      else if (msg.role === 'assistant') conversation.addAssistantMessage(msg.content);
      else conversation.addSystemMessage(msg.content);
    }

    const session: Session = {
      id: data.id,
      connId,
      apiKey: data.apiKey,
      state: 'active',
      toolRegistry: new ToolRegistry(),
      context: data.context,
      conversation,
      graph: new SessionGraph(data.id),
      createdAt: data.createdAt,
      lastActivityAt: Date.now(),
    };

    this.sessions.set(session.id, session);
    this.connToSession.set(connId, session.id);

    log.info(`Session restored: ${sessionId}`);
    return session;
  }

  /**
   * Fermer et supprimer une session.
   */
  async destroy(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.state = 'closed';

      if (this.hooks.onBeforeSessionDestroy) {
        try {
          await this.hooks.onBeforeSessionDestroy(session);
        } catch (err) {
          log.error(`Error in hook onBeforeSessionDestroy (${sessionId}):`, String(err));
        }
      }

      // Persister avant de detruire (pour historique)
      if (this.store) {
        try {
          await this.persist(sessionId);
        } catch (err) {
          log.error(`Error persisting session ${sessionId}:`, String(err));
        }
      }

      this.connToSession.delete(session.connId);
      this.sessions.delete(sessionId);
      log.info(`Session destroyed: ${sessionId} (duration: ${Date.now() - session.createdAt}ms)`);
    }
  }

  /**
   * Fermer une session par connexion ID.
   */
  async destroyByConnection(connId: ConnectionId): Promise<void> {
    const sessionId = this.connToSession.get(connId);
    if (sessionId) {
      await this.destroy(sessionId);
    }
  }

  /**
   * Nombre de sessions actives.
   */
  get size(): number {
    return this.sessions.size;
  }

  /**
   * Toutes les sessions actives.
   */
  getAll(): Session[] {
    return Array.from(this.sessions.values());
  }

  private normalizeRisk(risk?: string): RiskLevel {
    switch (risk) {
      case 'low':
        return RiskLevel.LOW;
      case 'high':
        return RiskLevel.HIGH;
      case 'critical':
        return RiskLevel.CRITICAL;
      default:
        return RiskLevel.NONE;
    }
  }
}
