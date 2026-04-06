import type { Server as HttpServer, IncomingMessage, ServerResponse } from 'http';
import {
  MessageType,
  Messages,
  createLogger,
  ADTP_VERSION,
  resolveSystemPrompt,
  DomosAgent,
  type ADTPMessage,
  type AgentIdentity,
  type AgentMemorySnapshot,
  type ApprovalRequestPayload,
  type ApprovalResponsePayload,
  type ToolResultPayload,
  type ToolCallPayload,
  type SystemPrompt,
} from '@domos/core';
import type { Transport, TransportType, ConnectionId } from '../transport/Transport.js';
import { ADTPTransport } from '../transport/adtp.transport.js';
import { WebRTCTransport, type WebRTCTransportOptions } from '../transport/WebRTCTransport.js';
import { ConnectionPool } from '../transport/ConnectionPool.js';
import { SessionManager } from './SessionManager.js';
import { ToolRouter, type ServerToolHandler } from './ToolRouter.js';
import { type ApiKeyValidator } from '../middleware/auth.js';
import { WsRateLimitMiddleware, RateLimitMiddleware, type WsRateLimitOptions, type RateLimitOptions, type RateLimiter, type WsRateLimiter } from '../middleware/rateLimit.js';
import { HITLSecurityMiddleware } from '../middleware/hitl.security.js';
import { AdminAPI } from '../admin/AdminAPI.js';
import { AdminAuthManager, type AdminAuthOptions } from '../auth/AdminAuthManager.js';
import { ClientAuthManager, type ClientAuthOptions } from '../auth/ClientAuthManager.js';
import { VirtualLineManager, type VirtualLineConfig } from '../lines/VirtualLineManager.js';
import { LineHTTPHandler } from '../lines/LineHTTPHandler.js';
import type { LLMAdapter, LLMResponse, LiveAdapter, LiveSession, LiveSessionConfig } from '../llm/types.js';
import type { STTService, TTSService } from '../speech/types.js';
import { MemoryManager } from '../persistence/MemoryManager.js';
import type { AgentMemoryConfig } from '../persistence/agentMemory.types.js';
import type { SessionStore, ApiKeyStore, AgentStore } from '../persistence/types.js';
import { MemoryAgentStore } from '../persistence/MemoryAgentStore.js';
import { installServerPlugin } from '../plugins/installServerPlugin.js';
import type { DomOSServerPlugin, PluginRuntimeOptions } from '../plugins/plugin.types.js';
import { DashboardUIHandler } from '../admin/DashboardUIHandler.js';

const log = createLogger('DomOS:Server');

/**
 * Options de configuration du serveur DomOS.
 */
export interface DomOSServerOptions {
  /** Adaptateur LLM texte (Gemini, OpenAI, etc.) */
  llm: LLMAdapter;

  /** Adaptateur LLM Live Audio (optionnel — Gemini Live, OpenAI Realtime) */
  live?: LiveAdapter;

  /** Service Speech-to-Text (optionnel — Whisper, Google STT, Azure STT) */
  stt?: STTService;

  /** Service Text-to-Speech (optionnel — OpenAI TTS, Google TTS, ElevenLabs) */
  tts?: TTSService;

  /** Serveur HTTP existant (optionnel) */
  server?: HttpServer;

  /** Port (si pas de serveur HTTP) */
  port?: number;

  /** Path WebSocket */
  path?: string;

  /** Configuration rate limit WebSocket-native (couche burst + quota AI) */
  rateLimit?: WsRateLimitOptions | RateLimitOptions | RateLimiter;

  /** Timeout des tools en ms */
  toolTimeout?: number;

  /** Max messages en memoire par session */
  maxConversationMessages?: number;

  /** Type de transport : 'websocket' (defaut) ou 'webrtc' */
  transport?: TransportType;

  /** Options specifiques WebRTC (si transport === 'webrtc') */
  webrtc?: WebRTCTransportOptions;

  /** Configuration authentification admin (monitoring API REST) */
  admin?: AdminAuthOptions;

  /** Configuration authentification client (API keys WebSocket) */
  client?: ClientAuthOptions;

  /** Configuration des virtual lines (controle de concurrence) */
  virtualLines?: { lines: VirtualLineConfig[] };

  /** Liste d'origines autorisees (CORS WS) */
  allowedOrigins?: string[];

  /** Configuration memoire agent (runtime frontend + persistence serveur) */
  agentMemory?: AgentMemoryConfig;

  /** Store de persistance des sessions (SQLiteStore, MongoStore, etc.). Défaut: MemoryStore. */
  sessionStore?: SessionStore;

  /** Store de persistance des API keys (métadonnées). Défaut: MemoryApiKeyStore. */
  apiKeyStore?: ApiKeyStore;

  /** Store de persistance des agents (system prompts liés aux API keys). Défaut: MemoryAgentStore. */
  agentStore?: AgentStore;

  /** Dashboard UI embarqué (@domos/ui). Nécessite options.admin configuré. */
  ui?: DashboardUIOptions;

  /** Nombre maximum de connexions WebSocket simultanées toutes clés confondues. Défaut: illimité. */
  maxConnections?: number;

  /** Handler HTTP supplémentaire appelé avant les handlers core (ex: health check standalone). Retourne true si la requête a été traitée. */
  extraHttpHandler?: (req: IncomingMessage, res: ServerResponse) => boolean;
}

/**
 * Options du dashboard UI embarqué.
 */
export interface DashboardUIOptions {
  /** Active le dashboard (défaut: false). */
  enabled: boolean;
  /** Path HTTP de base (défaut: '/domos-ui'). */
  path?: string;
}

/**
 * DomOSServer - Le serveur principal du framework.
 *
 * Orchestre la communication entre le client (navigateur) et le LLM.
 *
 * @example
 * ```ts
 * const server = new DomOSServer({
 *   llm: new GoogleAdapter({ model: 'gemini-2.0-flash', apiKey: '...' }),
 *   port: 3000,
 * });
 *
 * server.addApiKey('pk_live_...');
 *
 * server.tool('check_inventory', async ({ productId }) => {
 *   return await db.products.getStock(productId);
 * });
 *
 * server.listen();
 * ```
 */
export class DomOSServer {
  private transport: Transport;
  private pool: ConnectionPool;
  private sessions: SessionManager;
  private toolRouter: ToolRouter;
  private clientAuth: ClientAuthManager;
  private adminAuth: AdminAuthManager | null = null;
  private rateLimit: WsRateLimiter;
  private security: HITLSecurityMiddleware;
  private adminAPI: AdminAPI | null = null;
  private lineManager: VirtualLineManager | null = null;
  private lineHTTPHandler: LineHTTPHandler | null = null;
  private llm: LLMAdapter;
  private live?: LiveAdapter;
  private stt?: STTService;
  private tts?: TTSService;
  private liveSessions = new Map<string, LiveSession>();
  private liveSessionErrors = new Map<string, number>(); // sessionId → timestamp of last error (circuit-breaker)
  private liveSessionCreating = new Map<string, Promise<LiveSession>>(); // verrou anti-race-condition

  // Metriques vocales par session — timestamps pour mesurer la latence
  private voiceMetrics = new Map<string, {
    inputEndTs: number;      // Quand VOICE_INPUT_END a ete recu
    firstAudioByteTs: number; // Quand le premier chunk audio de reponse a ete envoye
    turnCount: number;        // Nombre de tours vocaux
  }>();
  private agentStore: AgentStore;
  private pendingServerApprovals = new Map<string, { sessionId: string; toolName: string; args: Record<string, unknown> }>();
  private startedAt = Date.now();
  private dashboardUI: DashboardUIHandler | null = null;
  private memoryManager: MemoryManager;
  private sessionAgents = new Map<string, DomosAgent>();

  constructor(private options: DomOSServerOptions) {
    this.llm = options.llm;
    this.live = options.live;
    this.stt = options.stt;
    this.tts = options.tts;
    this.pool = new ConnectionPool();
    this.sessions = new SessionManager(options.maxConversationMessages);
    this.memoryManager = new MemoryManager(options.agentMemory);
    if (options.sessionStore) {
      void this.sessions.setStore(options.sessionStore);
    }
    this.sessions.setLifecycleHooks({
      onSessionCreated: (session) => {
        void this.createSessionAgent(session.id, { sessionId: session.id }).catch((err) => {
          log.error(`Erreur creation DomosAgent (${session.id}):`, String(err));
        });
      },
      onBeforeSessionDestroy: async (session) => {
        const agent = this.sessionAgents.get(session.id);
        if (agent) {
          await agent.flush();
          this.sessionAgents.delete(session.id);
        }
      },
    });
    
    // Persistence agents (system prompts par API key)
    this.agentStore = options.agentStore ?? new MemoryAgentStore();

    // Client auth (API keys WebSocket)
    this.clientAuth = new ClientAuthManager(options.client, options.apiKeyStore);
    
    // Admin auth (username/password pour monitoring API)
    if (options.admin) {
      this.adminAuth = new AdminAuthManager(options.admin);
    }
    
    this.security = new HITLSecurityMiddleware();

    this.rateLimit = this.createRateLimiter(options.rateLimit);

    this.toolRouter = new ToolRouter(
      (connId, msg) => this.transport.send(connId, msg),
      options.toolTimeout
    );

    // Creer le VirtualLineManager si configure
    if (options.virtualLines?.lines?.length) {
      this.lineManager = new VirtualLineManager(options.virtualLines.lines);
      this.lineHTTPHandler = new LineHTTPHandler(this.lineManager);
      log.info(`Virtual Lines actives (${options.virtualLines.lines.length} pool(s))`);

      // Valider la coherence virtualLines vs maxConnections
      if (options.maxConnections !== undefined && isFinite(options.maxConnections)) {
        // +1 par pool = la ligne d'attente
        const totalLineSlots = options.virtualLines.lines.reduce((sum, c) => sum + c.count + 1, 0);
        if (totalLineSlots > options.maxConnections) {
          log.warn(
            `⚠️  Incohérence de configuration: total des lignes virtuelles (${totalLineSlots}) ` +
            `dépasse maxConnections (${options.maxConnections}). ` +
            `Certains clients ne pourront jamais obtenir de connexion. ` +
            `Recommandé: maxConnections >= ${totalLineSlots}`
          );
        }
      }
    }

    // Creer le DashboardUIHandler si option ui.enabled
    if (options.ui?.enabled) {
      if (!options.admin) {
        log.warn('ui.enabled=true mais options.admin n\'est pas configuré. Le dashboard nécessite une authentification admin.');
      }
      const uiPath = options.ui.path ?? '/domos-ui';
      const port = options.port ?? 3000;
      const serverUrl = options.server ? '' : `http://localhost:${port}`;
      this.dashboardUI = new DashboardUIHandler({ path: uiPath, serverUrl });
      log.info(`Dashboard UI activé sur ${uiPath} → ${serverUrl}${uiPath}`);
    }

    // Creer l'AdminAPI si demandee
    if (options.admin && this.adminAuth) {
      this.adminAPI = new AdminAPI(
        {
          sessions: this.sessions,
          pool: this.pool,
          toolRouter: this.toolRouter,
          rateLimit: this.rateLimit,
          startedAt: this.startedAt,
          adminAuth: this.adminAuth,
          clientAuth: this.clientAuth,
          agentStore: this.agentStore,
          virtualLines: this.lineManager ?? undefined,
          llmAdapter: this.llm,
          liveAdapter: this.live,
          sttService: this.stt,
          ttsService: this.tts,
        },
        {
          basePath: options.admin.path,
          enableClientKeyManagement: options.client?.enableApiKeyManagement
            ?? options.client?.requireApiKey
            ?? false,
          allowedOrigins: options.admin.allowedOrigins || [],
        }
      );
      const adminPath = options.admin.path || '/admin';
      log.info(`Admin API activee sur ${adminPath} (auth: username/password)`);
    }

    const transportEvents = {
      onConnection: (connId: string, req: any) => this.handleConnection(connId, req),
      onMessage: (connId: string, msg: ADTPMessage) => this.handleMessage(connId, msg),
      onClose: (connId: string, code: number, reason: string) => {
        void code;
        void reason;
        void this.handleClose(connId);
      },
      onError: (connId: string, err: Error) => this.handleError(connId, err),
    };

    // Handler HTTP pour l'admin API, les virtual lines et le dashboard UI
    const httpHandler = (this.adminAPI || this.lineHTTPHandler || this.dashboardUI || options.extraHttpHandler)
      ? (req: any, res: any) => {
          // Handler supplémentaire (ex: /health depuis standalone) — en premier
          if (options.extraHttpHandler?.(req, res)) return true;
          // Tester les virtual lines en premier
          if (this.lineHTTPHandler?.handleRequest(req, res)) return true;
          // Puis l'admin API
          if (this.adminAPI?.handleRequest(req, res)) return true;
          // Puis le dashboard UI embarqué
          if (this.dashboardUI?.handleRequest(req, res)) return true;
          return false;
        }
      : undefined;

    if (options.transport === 'webrtc') {
      this.transport = new WebRTCTransport(
        {
          server: options.server,
          port: options.port || 3001,
          signalingPath: options.path ? `${options.path}/rtc` : '/domos/rtc',
          ...options.webrtc,
        },
        transportEvents
      );
    } else {
      this.transport = new ADTPTransport(
        {
          server: options.server,
          port: options.port || 3000,
          path: options.path || '/domos',
          httpHandler,
          maxConnections: options.maxConnections,
        },
        transportEvents
      );
    }
  }

  /**
   * Recuperer l'AdminAPI (pour usage externe).
   */
  getAdminAPI(): AdminAPI | null {
    return this.adminAPI;
  }

  // ============================================================
  // API Publique
  // ============================================================

  /**
   * Ajouter une API key autorisee.
   */
  addApiKey(key: string): void {
    this.clientAuth.addKeys(key);
  }

  /**
   * Definir un system prompt specifique pour une API key.
   * Permet de servir plusieurs roles (boutique, admin, etc.) depuis le meme serveur.
   */
  setPromptOverride(apiKey: string, prompt: SystemPrompt): void {
    const now = Date.now();
    void this.agentStore.save({ apiKey, prompt, createdAt: now, updatedAt: now });
  }

  /**
   * Definir un validateur d'API key custom.
   */
  setApiKeyValidator(validator: ApiKeyValidator): void {
    this.clientAuth.setValidator(validator);
  }

  /**
   * Enregistrer un tool cote serveur.
   */
  tool(name: string, handler: ServerToolHandler): void {
    this.toolRouter.registerServerTool(name, handler);
  }

  /**
   * Installer un plugin serveur.
   *
   * Le plugin reçoit un contexte isolé — les tools sont enregistrés sous
   * le namespace `@scope/name/toolName` automatiquement.
   *
   * @returns Fonction de désinstallation — retire tous les tools du plugin
   *
   * @example
   * ```ts
   * const uninstall = server.installPlugin(StockPlugin, { dbUrl: process.env.DATABASE_URL! });
   * // Plus tard :
   * uninstall();
   * ```
   */
  installPlugin<C>(plugin: DomOSServerPlugin<C>, config: C, runtimeOptions?: PluginRuntimeOptions): () => void {
    return installServerPlugin(this.toolRouter, plugin, config, runtimeOptions);
  }

  /**
   * Bloquer un tool (securite).
   */
  blockTool(name: string): void {
    this.security.blockTool(name);
  }

  /**
   * Demarrer le serveur.
   */
  listen(callback?: () => void): void {
    void this.memoryManager.init().catch((err) => {
      log.error('Erreur initialisation MemoryManager:', String(err));
    });

    this.transport.start();
    log.info(`DomOS Server v${ADTP_VERSION} demarre`);

    // Log du mode audio configuré
    if (this.live) {
      log.info(`Mode audio: LIVE (${this.live.name})`);
    } else if (this.stt && this.tts) {
      log.info(`Mode audio: HYBRIDE (STT: ${this.stt.name}, TTS: ${this.tts.name})`);
    } else if (this.stt && !this.tts) {
      log.warn(`STT configure (${this.stt.name}) mais TTS manquant — mode hybride inactif`);
    } else if (!this.stt && this.tts) {
      log.warn(`TTS configure (${this.tts.name}) mais STT manquant — mode hybride inactif`);
    } else {
      log.info(`Mode audio: TEXTE UNIQUEMENT (pas de STT/TTS)`);
    }

    callback?.();
  }

  /**
   * Arreter le serveur.
   */
  stop(): void {
    for (const agent of this.sessionAgents.values()) {
      void agent.flush();
    }
    this.sessionAgents.clear();
    void this.memoryManager.close();

    this.transport.stop();
    this.rateLimit.stop();
    this.lineManager?.stop();
    this.adminAuth?.stop();
    log.info('DomOS Server arrete');
  }

  /**
   * Configurer dynamiquement les virtual lines pour une API key.
   */
  configureLines(apiKey: string, count: number, ttlMs?: number): void {
    if (!this.lineManager) {
      this.lineManager = new VirtualLineManager([{ apiKey, count, ttlMs }]);
      this.lineHTTPHandler = new LineHTTPHandler(this.lineManager);
    } else {
      this.lineManager.configurePool(apiKey, count, ttlMs);
    }
  }

  /**
   * Nombre de sessions actives.
   */
  get activeSessions(): number {
    return this.sessions.size;
  }

  async loadAgentMemory(identity: AgentIdentity): Promise<AgentMemorySnapshot | null> {
    return this.memoryManager.loadMemory(identity);
  }

  async saveAgentMemory(identity: AgentIdentity, snapshot: AgentMemorySnapshot): Promise<void> {
    await this.memoryManager.saveMemory(identity, snapshot);
  }

  async deleteAgentMemory(identity: AgentIdentity): Promise<void> {
    await this.memoryManager.deleteMemory(identity);
  }

  // ============================================================
  // Handlers internes
  // ============================================================

  private async handleConnection(connId: ConnectionId, req: any): Promise<void> {
    if (!this.isOriginAllowed(req)) {
      log.warn('Connexion refusee: origin non autorisee');
      this.transport.close(connId, 1008, 'Origin non autorisee');
      return;
    }

    // Authentifier
    let apiKey: string;
    const authResult = await this.clientAuth.authenticate(req);

    if (!authResult.authenticated || !authResult.apiKey) {
      log.warn(`Connexion refusee: ${authResult.error}`);
      this.transport.close(connId, 1008, authResult.error || 'Unauthorized');
      return;
    }
    
    apiKey = authResult.apiKey;
    this.clientAuth.registerConnection(apiKey);
    log.info(`Client authentifié: ${apiKey.slice(0, 8)}...`);

    // Creer le pool de virtual lines a la volee si defaultConfig existe
    if (this.lineManager) {
      this.lineManager.ensurePool(apiKey);
    }

    // Valider le lineToken si les virtual lines sont actives pour cette API key
    let lineToken: string | null = null;
    if (this.lineManager?.hasPool(apiKey)) {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      lineToken = url.searchParams.get('lineToken');

      if (!lineToken) {
        log.warn(`Connexion refusee: lineToken requis pour ${apiKey}`);
        this.transport.close(connId, 1008, 'lineToken requis');
        return;
      }

      const lineId = this.lineManager.validate(apiKey, lineToken);
      if (!lineId) {
        log.warn(`Connexion refusee: lineToken invalide`);
        this.transport.close(connId, 1008, 'lineToken invalide');
        return;
      }
    }

    // Creer la session
    const session = this.sessions.create(connId, apiKey);
    this.pool.register(connId, apiKey, session.id);

    // Lier la session a la ligne virtuelle
    if (lineToken && this.lineManager) {
      this.lineManager.bindSession(lineToken, session.id);

      // Si c'est la ligne d'attente → envoyer un message systeme
      if (this.lineManager.isWaitingLine(lineToken)) {
        this.transport.send(
          connId,
          Messages.systemEvent(
            'waiting',
            'Toutes les lignes sont occupees. Un agent vous repondra des qu\'une ligne se libere.'
          )
        );
      }
    }

    // Envoyer le HANDSHAKE_ACK
    this.transport.send(
      connId,
      Messages.handshakeAck(session.id, ADTP_VERSION, ADTP_VERSION, ['text', 'audio', 'tools'])
    );

    this.sessions.activate(session.id);
  }

  private async handleMessage(connId: ConnectionId, message: ADTPMessage): Promise<void> {
    const session = this.sessions.getByConnection(connId);
    if (!session) {
      log.warn(`Message de connexion sans session: ${connId}`);
      return;
    }

    // Rate limit WebSocket-native : couche burst (anti-DoS par connexion) + quota AI (par API key)
    const rlResult = this.rateLimit.checkMessage(connId, session.apiKey, message.type);
    if (!rlResult.allowed) {
      this.transport.send(connId, Messages.rateLimitEvent(
        rlResult.retryAfter ?? 1000,
        rlResult.remaining ?? 0,
        rlResult.limit ?? 0,
        rlResult.reason ?? 'quota',
      ));
      if (rlResult.closeConnection) {
        // Attaquant detecte : fermeture propre de la connexion
        this.transport.close(connId, 1008, 'Rate limit exceeded');
      }
      return;
    }

    this.sessions.touch(session.id);
    this.pool.recordActivity(connId);

    switch (message.type) {
      case MessageType.CONTEXT_UPDATE:
        this.handleContextUpdate(session, message.payload);
        break;

      case MessageType.APPROVAL_REQUEST:
        await this.handleApprovalRequest(session, message.payload);
        break;

      case MessageType.APPROVAL_RESPONSE:
        this.handleApprovalResponse(session, message.payload);
        break;

      case MessageType.USER_INPUT:
        await this.handleUserInput(session, message.payload);
        break;

      case MessageType.AUDIO_STREAM:
        await this.handleAudioInput(session, message.payload);
        break;

      case MessageType.VOICE_INPUT_END:
        await this.handleVoiceInputEnd(session);
        break;

      case MessageType.VOICE_INTERRUPT:
        await this.handleVoiceInterrupt(session);
        break;

      case MessageType.TOOL_RESULT:
        this.toolRouter.handleToolResult(message.payload);
        break;

      case MessageType.HANDSHAKE_INIT:
        if (message.payload.protocolVersion !== ADTP_VERSION) {
          this.transport.send(
            connId,
            Messages.systemEvent(
              'error',
              `Version protocole incompatible: ${message.payload.protocolVersion} (serveur: ${ADTP_VERSION})`
            )
          );
          this.transport.close(connId, 1008, 'Protocol version mismatch');
        }
        break;

      default:
        log.warn(`Type de message non gere: ${message.type}`);
    }
  }

  private handleContextUpdate(session: any, payload: any): void {
    this.sessions.updateContext(
      session.id,
      payload.url,
      payload.title,
      payload.activeTools,
      payload.context
    );

    session.graph.recordContextChange(payload.url);
    log.debug(`Context update: ${payload.url} (${payload.activeTools?.length || 0} tools)`);

    // Mettre a jour les tools de la LiveSession si active (prioritaire)
    const liveSession = this.liveSessions.get(session.id);
    if (liveSession?.isActive && liveSession.updateTools) {
      liveSession.updateTools(payload.activeTools);
      log.debug(`LiveSession tools updated: ${payload.activeTools?.length || 0} tools`);
    }
  }

  private async handleApprovalRequest(session: any, payload: ApprovalRequestPayload): Promise<void> {
    try {
      await this.notifyApprovalPending(
        session,
        payload.callId,
        payload.toolName,
        payload.args,
        payload.message
      );
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error(`Erreur LLM (approval pending) pour session ${session.id}:`, error);
    }
  }

  private handleApprovalResponse(_session: any, payload: ApprovalResponsePayload): void {
    const pendingServer = this.pendingServerApprovals.get(payload.callId);
    if (pendingServer) {
      this.pendingServerApprovals.delete(payload.callId);
      
      // Utiliser la session du pending (chercher depuis le manager)
      // ou fallback sur _session si pas trouve (pour les tests)
      const session = this.sessions.get(pendingServer.sessionId) || _session;
      
      if (!session) {
        log.warn(`Session introuvable pour approval server-side: ${payload.callId}`);
        return;
      }

      if (!payload.approved) {
        this.notifyToolResult(session, payload.callId, pendingServer.toolName, undefined, "Action refusée par l'utilisateur");
        return;
      }

      this.toolRouter.runServerTool(payload.callId, pendingServer.toolName, pendingServer.args)
        .then((result) => {
          this.notifyToolResult(session, payload.callId, pendingServer.toolName, result);
        })
        .catch((err) => {
          const error = err instanceof Error ? err.message : String(err);
          this.notifyToolResult(session, payload.callId, pendingServer.toolName, undefined, error);
        });

      return;
    }

    const status = payload.approved && !payload.error ? 'success' : 'error';
    const error = payload.approved
      ? payload.error
      : (payload.error || "Action refusée par l'utilisateur");

    const resultPayload: ToolResultPayload = {
      callId: payload.callId,
      result: payload.result ?? null,
      status,
      ...(error ? { error } : {}),
    };

    this.toolRouter.handleToolResult(resultPayload);
  }

  private async handleUserInput(session: any, payload: any): Promise<void> {
    const modality = payload.modality || 'text';
    const content = payload.content;
    const mimeType = payload.mimeType;

    // ============================================================
    // MODE 1 : Live Audio (Gemini Live, OpenAI Realtime)
    // ============================================================
    if (modality === 'audio' && this.live) {
      await this.handleLiveAudio(session, content, mimeType);
      return;
    }

    // ============================================================
    // MODE 2 : Hybride STT/TTS (Claude, GPT-4 standard, etc.)
    // ============================================================
    if (modality === 'audio' && this.stt && this.tts) {
      await this.handleHybridAudio(session, content, mimeType);
      return;
    }

    // ============================================================
    // MODE 3 : Texte pur (mode par défaut)
    // ============================================================
    if (modality === 'audio' && !this.live && (!this.stt || !this.tts)) {
      log.warn('Audio input received but no Live adapter or STT/TTS configured');
      this.transport.send(
        session.connId,
        Messages.systemEvent('error', 'Audio input not supported without Live adapter or STT/TTS services')
      );
      return;
    }

    await this.handleTextInput(session, content);
  }

  /**
   * Mode 1 : Live Audio (Gemini Live, OpenAI Realtime).
   * Audio natif bidirectionnel, STT/TTS intégré au modèle.
   */
  private async handleLiveAudio(session: any, audioBase64: string, mimeType: string): Promise<void> {
    try {
      // Créer ou réutiliser la session live
      let liveSession = this.liveSessions.get(session.id);
      
      if (!liveSession || !liveSession.isActive) {
        const agentRecord = await this.agentStore.load(session.apiKey);
        const systemPrompt = agentRecord?.prompt ?? this.llm.systemPrompt;
        const tools = session.toolRegistry.getDeclarations();

        const config: LiveSessionConfig = {
          systemPrompt: resolveSystemPrompt(systemPrompt || ''),
          tools,
          onAudioOutput: (audio, audioMimeType) => {
            // Envoyer l'audio au client
            this.transport.send(
              session.connId,
              Messages.audioStream(audio, audioMimeType)
            );
          },
          onTextOutput: (text, done) => {
            if (text) {
              session.conversation.addAssistantMessage(text);
              this.recordAgentResponse(session, text);
            }
            this.transport.send(
              session.connId,
              Messages.agentResponse(text, done)
            );
          },
          onToolCall: (toolCall) => {
            this.transport.send(
              session.connId,
              Messages.toolCall(toolCall.callId, toolCall.name, toolCall.args)
            );
          },
          onTranscript: (role, text) => {
            if (role === 'user') {
              session.conversation.addUserMessage(text);
              this.recordUserRequest(session, text);
            }
          },
          onError: (error) => {
            log.error(`Live session error: ${error.message}`);
            this.transport.send(
              session.connId,
              Messages.systemEvent('error', error.message)
            );
          },
        };

        liveSession = await this.live!.createSession(config);
        this.liveSessions.set(session.id, liveSession);
        log.info(`Live session created for ${session.id}`);
      }

      // Envoyer l'audio à la session live
      await liveSession.sendAudio(audioBase64, mimeType);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error(`Error in live audio mode: ${error}`);
      this.transport.send(
        session.connId,
        Messages.systemEvent('error', 'Live audio error')
      );
    }
  }

  /**
   * Mode 2 : Hybride STT/TTS (Claude, GPT-4 standard, etc.).
   * Pipeline : Audio → STT → LLM texte → TTS → Audio.
   */
  private async handleHybridAudio(session: any, audioBase64: string, mimeType: string): Promise<void> {
    const startTime = Date.now();
    let sttTime = 0;
    let llmTime = 0;
    let ttsTime = 0;

    try {
      // ===== ÉTAPE 1 : STT (Audio → Texte) =====
      log.info(`[Hybrid] STT transcribing audio (${audioBase64.length} bytes)`);
      const sttStart = Date.now();
      
      const transcription = await this.stt!.transcribe({
        audioBase64,
        mimeType,
        languageCode: session.context?.language,
      });

      sttTime = Date.now() - sttStart;
      const userText = transcription.text;

      if (!userText || userText.trim().length === 0) {
        log.warn('[Hybrid] Empty transcription');
        this.transport.send(
          session.connId,
          Messages.systemEvent('error', 'Unable to transcribe audio')
        );
        return;
      }

      log.info(`[Hybrid] STT complete (${sttTime}ms): "${userText.substring(0, 100)}..."`);

      // Optionnel : Envoyer la transcription au client (via AGENT_RESPONSE temporaire)
      this.transport.send(
        session.connId,
        Messages.agentResponse(`[Transcription] ${userText}`, false)
      );

      // ===== ÉTAPE 2 : LLM (Texte → Texte) =====
      session.conversation.addUserMessage(userText);
      this.recordUserRequest(session, userText);

      const tools = session.toolRegistry.getDeclarations();
      const history = session.conversation.getMessages();
      const agentRecordHybrid = await this.agentStore.load(session.apiKey);
      const systemPrompt = agentRecordHybrid?.prompt ?? this.llm.systemPrompt;

      log.info(`[Hybrid] LLM processing text`);
      const llmStart = Date.now();

      const response = await this.llm.chat({
        messages: history,
        tools,
        context: session.context,
        systemPrompt,
      });

      llmTime = Date.now() - llmStart;
      log.info(`[Hybrid] LLM complete (${llmTime}ms)`);

      // Si le LLM veut appeler des tools, on les traite
      if (response.toolCalls && response.toolCalls.length > 0) {
        await this.processLLMResponse(session, response);
        // Les tools seront appelés, et la réponse finale viendra après
        // On ne fait pas de TTS ici, il faudra attendre le TOOL_RESULT
        return;
      }

      // Réponse directe (pas de toolCalls) — enregistrer l'usage ici
      // (processLLMResponse n'est pas appelé dans ce chemin)
      if (response.usage) {
        session.graph.recordTokens(response.usage.inputTokens, response.usage.outputTokens);
      }

      const assistantText = response.text || '';
      if (assistantText.trim().length === 0) {
        log.warn('[Hybrid] Empty LLM response');
        return;
      }

      session.conversation.addAssistantMessage(assistantText);
      this.recordAgentResponse(session, assistantText);

      // Envoyer la réponse texte au client
      this.transport.send(
        session.connId,
        Messages.agentResponse(assistantText, true)
      );

      // ===== ÉTAPE 3 : TTS (Texte → Audio) =====
      log.info(`[Hybrid] TTS synthesizing (${assistantText.length} chars)`);
      const ttsStart = Date.now();

      const audioResult = await this.tts!.synthesize({
        text: assistantText,
        voice: session.context?.voice,
        languageCode: session.context?.language,
        speed: session.context?.speechSpeed || 1.0,
      });

      ttsTime = Date.now() - ttsStart;
      log.info(`[Hybrid] TTS complete (${ttsTime}ms, ${audioResult.audioBase64.length} bytes)`);

      // Envoyer l'audio au client
      this.transport.send(
        session.connId,
        Messages.audioStream(audioResult.audioBase64, audioResult.mimeType)
      );

      const totalTime = Date.now() - startTime;
      log.info(`[Hybrid] Pipeline complete: STT=${sttTime}ms, LLM=${llmTime}ms, TTS=${ttsTime}ms, Total=${totalTime}ms`);

    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error(`[Hybrid] Error in hybrid audio pipeline: ${error}`);
      
      // Envoyer l'erreur au client
      this.transport.send(
        session.connId,
        Messages.systemEvent('error', 'Audio processing error: ' + error)
      );

      // Fallback : envoyer une réponse texte d'excuse
      const fallbackText = "Désolé, j'ai rencontré un problème avec le traitement audio.";
      this.transport.send(
        session.connId,
        Messages.agentResponse(fallbackText, true)
      );
    }
  }

  /**
   * Mode 3 : Texte pur (mode classique).
   */
  private async handleTextInput(session: any, content: string): Promise<void> {
    // Ajouter le message utilisateur a l'historique
    session.conversation.addUserMessage(content);
    this.recordUserRequest(session, content);

    // Preparer le contexte pour le LLM
    const tools = session.toolRegistry.getDeclarations();
    const history = session.conversation.getMessages();

    try {
      // Determiner le system prompt (override dashboard > code)
      const agentRecordText = await this.agentStore.load(session.apiKey);
      const systemPrompt = agentRecordText?.prompt ?? this.llm.systemPrompt;

      // Appeler le LLM
      const response = await this.llm.chat({
        messages: history,
        tools,
        context: session.context,
        systemPrompt,
      });

      // Traiter la reponse
      await this.processLLMResponse(session, response);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error(`Erreur LLM pour session ${session.id}:`, error);

      this.transport.send(
        session.connId,
        Messages.systemEvent('error', 'Erreur du service IA')
      );
    }
  }

  private async notifyApprovalPending(
    session: any,
    callId: string,
    toolName: string,
    args: Record<string, unknown>,
    message: string
  ): Promise<void> {
    const liveSession = this.liveSessions.get(session.id);
    if (liveSession?.isActive) {
      await liveSession.sendToolResponse(callId, toolName, {
        status: 'pending_approval',
        message,
        args,
      });
      return;
    }

    const followUp = await this.llm.handleToolResult(callId, {
      status: 'pending_approval',
      toolName,
      message,
      args,
    });

    if (followUp?.usage) {
      session.graph.recordTokens(followUp.usage.inputTokens, followUp.usage.outputTokens);
    }

    if (followUp?.text) {
      session.conversation.addAssistantMessage(followUp.text);
      this.recordAgentResponse(session, followUp.text);
      this.transport.send(
        session.connId,
        Messages.agentResponse(followUp.text, true)
      );
    }
  }

  private async notifyToolResult(
    session: any,
    callId: string,
    toolName: string,
    result?: unknown,
    error?: string
  ): Promise<void> {
    const liveSession = this.liveSessions.get(session.id);
    if (liveSession?.isActive) {
      if (error) {
        await liveSession.sendToolResponse(callId, toolName, { error });
      } else {
        await liveSession.sendToolResponse(callId, toolName, result);
      }
      return;
    }

    const followUp = await this.llm.handleToolResult(callId, error ? { error } : result);

    if (followUp?.usage) {
      session.graph.recordTokens(followUp.usage.inputTokens, followUp.usage.outputTokens);
    }

    if (followUp?.text) {
      session.conversation.addAssistantMessage(followUp.text);
      this.recordAgentResponse(session, followUp.text);
      this.transport.send(
        session.connId,
        Messages.agentResponse(followUp.text, true)
      );
    }
  }

  private async processLLMResponse(session: any, response: LLMResponse): Promise<void> {
    // Enregistrer l'usage de tokens de cette réponse LLM
    if (response.usage) {
      session.graph.recordTokens(response.usage.inputTokens, response.usage.outputTokens);
    }

    // 1. Si le LLM veut appeler des tools
    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        // Verifier la securite
        const secCheck = this.security.check(session, toolCall);

        if (secCheck.allowed === false) {
          log.warn(`Tool bloque: ${toolCall.name} - ${secCheck.reason}`);
          this.transport.send(
            session.connId,
            Messages.systemEvent('error', secCheck.reason)
          );
          continue;
        }

        if (secCheck.allowed === 'pending_approval') {
          log.warn(`Tool en attente d'approbation: ${toolCall.name}`);
          this.transport.send(
            session.connId,
            Messages.systemEvent('approval_required', secCheck.approvalMessage)
          );

          // Si tool server-side, demander l'approbation cote client et mettre en attente
          const isServerTool = this.toolRouter.hasServerTool(toolCall.name);
          if (isServerTool) {
            this.pendingServerApprovals.set(toolCall.callId, {
              sessionId: session.id,
              toolName: toolCall.name,
              args: toolCall.args,
            });
            this.transport.send(
              session.connId,
              Messages.approvalRequest(
                toolCall.callId,
                toolCall.name,
                'high',
                toolCall.args,
                secCheck.approvalMessage
              )
            );
          }

          await this.notifyApprovalPending(
            session,
            toolCall.callId,
            toolCall.name,
            toolCall.args,
            secCheck.approvalMessage
          );
          
          // Toujours continuer pour pending_approval (live ou non)
          continue;
        }

        // Executer le tool (server-side ou client-side)
        try {
          const result = await this.toolRouter.route(session, toolCall.name, toolCall.args);

          // Renvoyer le resultat au LLM pour la reponse finale
          session.graph.recordToolCall(toolCall.name);
          const followUp = await this.llm.handleToolResult(toolCall.callId, result);

          if (followUp?.usage) {
            session.graph.recordTokens(followUp.usage.inputTokens, followUp.usage.outputTokens);
          }

          if (followUp?.text) {
            session.conversation.addAssistantMessage(followUp.text);
            this.recordAgentResponse(session, followUp.text);
            this.transport.send(
              session.connId,
              Messages.agentResponse(followUp.text, true)
            );
          }
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          log.error(`Tool error: ${toolCall.name}`, error);
        }
      }
    }

    // 2. Si le LLM a une reponse texte directe
    if (response.text) {
      session.conversation.addAssistantMessage(response.text);
      this.recordAgentResponse(session, response.text);
      this.transport.send(
        session.connId,
        Messages.agentResponse(response.text, true)
      );
    }
  }

  // ============================================================
  // Live Audio — Mode streaming bidirectionnel
  // ============================================================

  private async handleAudioInput(session: any, payload: any): Promise<void> {
    if (!this.live) {
      log.warn('Audio recu mais pas de LiveAdapter configure');
      this.transport.send(
        session.connId,
        Messages.systemEvent('error', 'Mode audio non disponible')
      );
      return;
    }

    try {
      const liveSession = await this.getOrCreateLiveSession(session);
      await liveSession.sendAudio(payload.data, payload.mimeType);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      // Ignorer silencieusement les rejets du circuit-breaker (eviter le flood de logs)
      if (error === 'circuit-breaker') return;
      log.error(`Erreur audio pour session ${session.id}:`, error);
      this.transport.send(
        session.connId,
        Messages.systemEvent('error', 'Erreur audio streaming')
      );
    }
  }

  /**
   * Signaler la fin du flux audio a la LiveSession.
   * Appelle endAudioTurn() sur l'adaptateur (audioStreamEnd pour Gemini Live).
   */
  private async handleVoiceInputEnd(session: any): Promise<void> {
    let liveSession = this.liveSessions.get(session.id);
    if (!liveSession?.isActive) {
      // La session est peut-être encore en cours de création (race condition).
      // On attend la promesse si elle existe.
      const inProgress = this.liveSessionCreating.get(session.id);
      if (inProgress) {
        try {
          liveSession = await inProgress;
        } catch {
          return; // La création a échoué, rien à faire
        }
      } else {
        log.warn(`VOICE_INPUT_END sans LiveSession active: ${session.id}`);
        return;
      }
    }

    // Enregistrer le timestamp pour mesurer la latence input→first byte
    const metrics = this.voiceMetrics.get(session.id) || { inputEndTs: 0, firstAudioByteTs: 0, turnCount: 0 };
    metrics.inputEndTs = Date.now();
    metrics.firstAudioByteTs = 0; // Reset pour ce nouveau tour
    metrics.turnCount++;
    this.voiceMetrics.set(session.id, metrics);

    try {
      if (liveSession.endAudioTurn) {
        await liveSession.endAudioTurn();
        log.info(`[voice] audioStreamEnd envoye — session=${session.id} turn=${metrics.turnCount}`);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error(`Erreur VOICE_INPUT_END pour session ${session.id}:`, error);
    }
  }

  /**
   * Gerer un barge-in (l'utilisateur interrompt l'agent).
   */
  private async handleVoiceInterrupt(session: any): Promise<void> {
    const liveSession = this.liveSessions.get(session.id);
    if (!liveSession?.isActive) {
      log.warn(`VOICE_INTERRUPT sans LiveSession active: ${session.id}`);
      return;
    }
    try {
      if (liveSession.interrupt) {
        await liveSession.interrupt();
      }
      // Notifier le client que l'interruption a ete prise en compte
      this.transport.send(
        session.connId,
        Messages.voiceStateEvent('interrupted', 'barge_in')
      );
      const metrics = this.voiceMetrics.get(session.id);
      log.info(`[voice] barge_in — session=${session.id} turn=${metrics?.turnCount ?? 0}`);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error(`Erreur VOICE_INTERRUPT pour session ${session.id}:`, error);
    }
  }

  private async getOrCreateLiveSession(session: any): Promise<LiveSession> {
    // Retourner la session active existante
    const existing = this.liveSessions.get(session.id);
    if (existing?.isActive) return existing;

    // Si une création est déjà en cours pour cette session, attendre qu'elle se termine
    // (évite de créer plusieurs sessions Gemini Live en parallèle quand les chunks audio arrivent en rafale)
    const inProgress = this.liveSessionCreating.get(session.id);
    if (inProgress) return inProgress;

    // Circuit-breaker: si la derniere erreur date de moins de 5s, bloquer la re-creation
    const lastErrorTs = this.liveSessionErrors.get(session.id);
    if (lastErrorTs && Date.now() - lastErrorTs < 5000) {
      // Pas de log ici — le flood de chunks audio génèrerait des milliers de lignes.
      // L'erreur a déjà été reportée une fois dans onError.
      throw new Error('circuit-breaker');
    }

    const tools = session.toolRegistry?.getDeclarations() || [];
    const systemPrompt = this.live!.systemPrompt
      ? resolveSystemPrompt(this.live!.systemPrompt)
      : 'Tu es un assistant vocal intelligent.';

    log.info(`Creation LiveSession pour session ${session.id}`);

    // Déclarer liveSession avant la promesse pour que onToolCall puisse y accéder
    // par fermeture (la variable sera liée avant le premier appel de tool)
    // Le `!` indique à TypeScript que la variable sera définie avant tout usage réel
    let liveSession!: LiveSession;

    // Enregistrer la promesse IMMÉDIATEMENT, avant tout await,
    // pour que les chunks audio concurrents attendent cette même promesse
    const createPromise = this.live!.createSession({
      systemPrompt,
      tools,
      voice: undefined, // utilise la voix par defaut de l'adapter

      onAudioOutput: (audioBase64, mimeType) => {
        // Mesurer la latence input_end → premier byte audio de reponse
        const metrics = this.voiceMetrics.get(session.id);
        if (metrics && metrics.inputEndTs > 0 && metrics.firstAudioByteTs === 0) {
          metrics.firstAudioByteTs = Date.now();
          const latencyMs = metrics.firstAudioByteTs - metrics.inputEndTs;
          log.info(`[voice] first_byte — session=${session.id} turn=${metrics.turnCount} latency_ms=${latencyMs}`);
        }

        this.transport.send(
          session.connId,
          Messages.audioStream(audioBase64, mimeType)
        );
      },

      onTextOutput: (text, done) => {
        if (text) {
          this.transport.send(
            session.connId,
            Messages.agentResponse(text, done)
          );
        } else if (done) {
          // Signaler la fin du tour vocal même sans texte (mode audio pur)
          // pour que le client puisse passer de 'speaking' → 'connected'
          this.transport.send(
            session.connId,
            Messages.agentResponse('', true)
          );

          // Log metrique de duree totale du tour vocal
          const metrics = this.voiceMetrics.get(session.id);
          if (metrics && metrics.inputEndTs > 0) {
            const totalMs = Date.now() - metrics.inputEndTs;
            log.info(`[voice] turn_complete — session=${session.id} turn=${metrics.turnCount} total_ms=${totalMs}`);
          }
        }
      },

      onToolCall: async (toolCall) => {
        // Verifier la securite
        const secCheck = this.security.check(session, toolCall);
        if (secCheck.allowed === false) {
          log.warn(`Tool bloque (live): ${toolCall.name} - ${secCheck.reason}`);
          await liveSession.sendToolResponse(toolCall.callId, toolCall.name, {
            error: `Tool bloque: ${secCheck.reason}`,
          });
          return;
        }

        if (secCheck.allowed === 'pending_approval') {
          log.warn(`Tool en attente d'approbation (live): ${toolCall.name}`);
          this.transport.send(
            session.connId,
            Messages.systemEvent('approval_required', secCheck.approvalMessage)
          );
          await this.notifyApprovalPending(
            session,
            toolCall.callId,
            toolCall.name,
            toolCall.args,
            secCheck.approvalMessage
          );
          return;
        }

        try {
          const result = await this.toolRouter.route(session, toolCall.name, toolCall.args);
          session.graph?.recordToolCall(toolCall.name);
          await liveSession.sendToolResponse(toolCall.callId, toolCall.name, result);
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          log.error(`Tool error (live): ${toolCall.name}`, error);
          await liveSession.sendToolResponse(toolCall.callId, toolCall.name, {
            error,
          });
        }
      },

      onTranscript: (role, text) => {
        log.debug(`Transcript [${role}]: ${text}`);
        if (role === 'user') {
          session.conversation?.addUserMessage(text);
          this.recordUserRequest(session, text);
        } else {
          session.conversation?.addAssistantMessage(text);
          this.recordAgentResponse(session, text);
        }
      },

      onInterrupted: () => {
        this.transport.send(
          session.connId,
          Messages.voiceStateEvent('interrupted')
        );
      },

      onWaitingForInput: () => {
        this.transport.send(
          session.connId,
          Messages.voiceStateEvent('waiting_for_input')
        );
      },

      onError: (error) => {
        log.error(`LiveSession erreur (${session.id}):`, error.message);
        this.liveSessionErrors.set(session.id, Date.now());
        // Nettoyer la session morte pour permettre une recréation propre apres le circuit-breaker
        this.liveSessions.delete(session.id);
        this.voiceMetrics.delete(session.id);
        this.transport.send(
          session.connId,
          Messages.systemEvent('error', 'Erreur session audio')
        );
      },

      onClose: () => {
        const metrics = this.voiceMetrics.get(session.id);
        log.info(`[voice] session_close — session=${session.id} total_turns=${metrics?.turnCount ?? 0}`);
        this.liveSessions.delete(session.id);
        this.voiceMetrics.delete(session.id);
      },
    });

    // Stocker la promesse avant l'await — c'est le verrou anti-race-condition
    this.liveSessionCreating.set(session.id, createPromise);

    try {
      liveSession = await createPromise;
    } catch (err) {
      this.liveSessionCreating.delete(session.id);
      throw err;
    }

    this.liveSessions.set(session.id, liveSession);
    this.liveSessionCreating.delete(session.id);
    return liveSession;
  }

  private async handleClose(connId: ConnectionId): Promise<void> {
    // R\u00e9cup\u00e9rer la session avant destruction
    const session = this.sessions.getByConnection(connId);
    
    // Libérer la connexion client auth
    if (session?.apiKey) {
      this.clientAuth.releaseConnection(session.apiKey);
    }

    // Fermer la LiveSession si elle existe
    if (session) {
      const liveSession = this.liveSessions.get(session.id);
      if (liveSession) {
        liveSession.close();
        this.liveSessions.delete(session.id);
      }
      // Nettoyer le verrou de création si la connexion se coupe pendant une création en cours
      this.liveSessionCreating.delete(session.id);
      // Nettoyer le circuit-breaker et metriques sur deconnexion propre
      this.liveSessionErrors.delete(session.id);
      this.voiceMetrics.delete(session.id);

      // Liberer la ligne virtuelle si applicable
      if (this.lineManager) {
        this.lineManager.releaseBySession(session.id);
      }
    }

    await this.sessions.destroyByConnection(connId);
    this.pool.unregister(connId);
    this.toolRouter.cancelByConnection(connId);
    // Nettoyer l'etat burst du rate limiter pour cette connexion
    this.rateLimit.onDisconnect(connId);
  }

  private async createSessionAgent(sessionId: string, identity: AgentIdentity): Promise<void> {
    await this.memoryManager.init();

    const adapter = {
      loadMemory: (agentIdentity: AgentIdentity) => this.memoryManager.loadMemory(agentIdentity),
      saveMemory: (agentIdentity: AgentIdentity, snapshot: AgentMemorySnapshot) =>
        this.memoryManager.saveMemory(agentIdentity, snapshot),
      deleteMemory: (agentIdentity: AgentIdentity) => this.memoryManager.deleteMemory(agentIdentity),
    };

    const agent = new DomosAgent({
      adapter,
      saveDebounceMs: 300,
    });
    await agent.init(identity);
    this.sessionAgents.set(sessionId, agent);
  }

  private recordUserRequest(session: any, content: string): void {
    const agent = this.sessionAgents.get(session.id);
    if (!agent) return;
    agent.onUserRequest({
      content,
      contextSnapshot: session.context?.data,
    });
  }

  private recordAgentResponse(session: any, content: string): void {
    const agent = this.sessionAgents.get(session.id);
    if (!agent) return;
    agent.onAgentResponse({
      content,
      contextSnapshot: session.context?.data,
    });
  }

  private handleError(connId: ConnectionId, error: Error): void {
    log.error(`Erreur connexion ${connId}:`, error.message);
  }

  private createRateLimiter(rateLimit?: WsRateLimitOptions | RateLimitOptions | RateLimiter): WsRateLimiter {
    // Cas 1 : instance RateLimiter passee directement — on l'enveloppe dans un WsRateLimitMiddleware
    if (rateLimit && this.isRateLimiter(rateLimit)) {
      // L'instance passee par le dev est une RateLimiter legacy — on l'ignore et on utilise
      // WsRateLimitMiddleware avec les defaults pour avoir checkMessage() et onDisconnect()
      return new WsRateLimitMiddleware();
    }

    // Cas 2 : options WS-native (avoir 'burstLimit' ou 'disabled')
    if (rateLimit && ('burstLimit' in rateLimit || 'disabled' in rateLimit || 'maxRequests' in rateLimit)) {
      return new WsRateLimitMiddleware(rateLimit as WsRateLimitOptions);
    }

    // Cas 3 : aucune config — defaults
    return new WsRateLimitMiddleware();
  }

  private isRateLimiter(value: WsRateLimitOptions | RateLimitOptions | RateLimiter): value is RateLimiter {
    return typeof (value as RateLimiter).check === 'function';
  }

  private isOriginAllowed(req: any): boolean {
    const allowed = this.options.allowedOrigins;
    if (!allowed || allowed.length === 0) return true;
    if (allowed.includes('*')) return true;

    const origin = req?.headers?.origin;
    if (!origin) return false;
    return allowed.includes(origin);
  }
}
