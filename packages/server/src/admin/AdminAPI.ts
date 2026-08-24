import type { IncomingMessage, ServerResponse } from 'http';
import { createHash, randomBytes } from 'node:crypto';
import type { SessionManager } from '../core/SessionManager.js';
import type { ConnectionPool } from '../transport/ConnectionPool.js';
import type { ToolRouter } from '../core/ToolRouter.js';
import type { LinePoolStatus, VirtualLineManager } from '../lines/VirtualLineManager.js';
import type { SystemPrompt, ToolDeclaration } from '@owllayer/core';
import type { AdminAuthManager } from '../auth/AdminAuthManager.js';
import type { ClientAuthManager } from '../auth/ClientAuthManager.js';
import type { AgentRecord, AgentStore, ApiKeyRecord } from '../persistence/types.js';
import type { LLMAdapter, LiveAdapter } from '../llm/types.js';
import type { STTService, TTSService } from '../speech/types.js';

import { createLogger } from '@owllayer/core';

const log = createLogger('OwlLayer:AdminAPI');

export interface RuntimeVoiceConfig {
  liveVoice?: string;
  ttsVoice?: string;
  language?: string;
}

export interface BridgeStats {
  enabled: boolean;
  activeBridges: number;
  sessions: Array<{
    sessionId: string;
    roomName: string;
    agentIdentity: string;
    startedAt: number;
  }>;
  events?: BridgeEventSummary[];
  lastError?: string;
  provider?: string;
  urlConfigured?: boolean;
  model?: string;
  voice?: string;
}

export interface BridgeEventSummary {
  type: string;
  sessionId?: string;
  message?: string;
  reason?: string;
  toolName?: string;
  roomName?: string;
  toolCount?: number;
}

type PromptSource = 'dashboardOverride' | 'codeDefault' | 'none';

interface AdminEvent {
  id: string;
  type: string;
  at: number;
  message: string;
  data?: Record<string, unknown>;
}

interface SessionRuntimeMeta {
  apiKey: string;
  keyId: string;
  apiKeyName?: string;
  clientType?: ApiKeyRecord['clientType'];
  agentName: string;
  promptSource: PromptSource;
  promptUpdatedAt?: number;
  toolsCount: number;
  effectiveToolsCount: number;
}

// ============================================================
// Brute-force protection — login admin
// Max 5 tentatives par IP par 15 minutes
// ============================================================

interface LoginAttemptEntry {
  count: number;
  resetAt: number;
}

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 min
const loginAttempts = new Map<string, LoginAttemptEntry>();

function checkLoginBruteForce(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  let entry = loginAttempts.get(ip);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    loginAttempts.set(ip, entry);
  }

  entry.count++;

  if (entry.count > LOGIN_MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  return { allowed: true, retryAfterMs: 0 };
}

function resetLoginAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function redactBridgeText(value: string): string {
  return value
    .replace(/\b(?:sk|pk|tok|lk)_[A-Za-z0-9_.=-]+\b/g, '[redacted]')
    .replace(/\b(?:apiSecret|apiKey|token|secret|password|cardToken)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]');
}

function safeBridgeErrorMessage(type: string): string {
  return type === 'tool.call_failed'
    ? 'Tool call failed; details redacted'
    : 'Bridge error; details redacted';
}

function sanitizeBridgeEvent(event: unknown): BridgeEventSummary | null {
  const record = asRecord(event);
  if (!record) {
    return null;
  }

  const type = readString(record, 'type');
  if (!type) {
    return null;
  }

  const toolCall = asRecord(record.toolCall);
  const room = asRecord(record.room);
  const summary: BridgeEventSummary = { type };
  const sessionId = readString(record, 'sessionId');
  const message = readString(record, 'message');
  const reason = readString(record, 'reason');
  const error = readString(record, 'error');
  const toolName = toolCall ? readString(toolCall, 'name') : undefined;
  const roomName = room ? readString(room, 'roomName') : undefined;
  const toolCount = readNumber(record, 'toolCount');
  const errorLike = type === 'error' || type === 'tool.call_failed';

  if (sessionId) summary.sessionId = sessionId;
  if (errorLike) {
    summary.message = safeBridgeErrorMessage(type);
  } else if (message) {
    summary.message = redactBridgeText(message);
  } else if (error) {
    summary.message = redactBridgeText(error);
  }
  if (reason) summary.reason = redactBridgeText(reason);
  if (toolName) summary.toolName = toolName;
  if (roomName) summary.roomName = roomName;
  if (toolCount !== undefined) summary.toolCount = toolCount;

  return summary;
}

/**
 * Dependances injectees dans l'AdminAPI.
 */
export interface AdminAPIDeps {
  sessions: SessionManager;
  pool: ConnectionPool;
  toolRouter: ToolRouter;
  startedAt: number;
  adminAuth: AdminAuthManager;
  clientAuth: ClientAuthManager;
  agentStore?: AgentStore;
  virtualLines?: VirtualLineManager;
  llmAdapter?: LLMAdapter;
  liveAdapter?: LiveAdapter;
  sttService?: STTService;
  ttsService?: TTSService;
  runtimeVoiceConfig?: RuntimeVoiceConfig;
  setRuntimeVoiceConfig?: (config: RuntimeVoiceConfig) => void;
  closeConnection?: (connId: string, code?: number, reason?: string) => void;
  bridge?: {
    getStats(): Promise<BridgeStats> | BridgeStats;
    getEvents?(limit?: number): Promise<unknown[]> | unknown[];
  };
}

/**
 * Options de configuration AdminAPI.
 */
export interface AdminAPIOptions {
  /** Path de base (défaut: /admin) */
  basePath?: string;

  /** Activer la gestion des API keys client via l'API (défaut: false) */
  enableClientKeyManagement?: boolean;

  /** Origines CORS autorisées (défaut: []) */
  allowedOrigins?: string[];
}

/**
 * AdminAPI — API REST d'administration pour le monitoring du serveur OwlLayer.
 *
 * **Authentification** : Session-based avec username/password (bcrypt).
 *
 * Endpoints publics (sans auth) :
 * - POST /admin/login        — Login admin (retourne session token)
 *
 * Endpoints protégés (requirent session token) :
 * - POST /admin/logout       — Logout admin
 * - GET /admin/status        — Status global (uptime, connexions, sessions)
 * - GET /admin/sessions      — Liste des sessions actives
 * - GET /admin/sessions/:id  — Detail d'une session
 * - DELETE /admin/sessions/:id — Forcer la fermeture d'une session
 * - GET /admin/tools         — Tous les tools (server + client)
 * - GET /admin/metrics       — Metriques agregees
 * - GET /admin/client/keys   — Liste des API keys client (si enableClientKeyManagement)
 * - POST /admin/client/keys  — Ajouter une API key client
 * - DELETE /admin/client/keys/:key — Supprimer une API key client
 */
export class AdminAPI {
  private basePath: string;
  private enableClientKeyManagement: boolean;
  private allowedOrigins: string[];
  private events: AdminEvent[] = [];

  constructor(
    private deps: AdminAPIDeps,
    options: AdminAPIOptions = {}
  ) {
    this.basePath = (options.basePath || '/admin').replace(/\/$/, '');
    this.enableClientKeyManagement = options.enableClientKeyManagement ?? false;
    this.allowedOrigins = options.allowedOrigins || [];
  }

  getBasePath(): string {
    return this.basePath;
  }

  setVirtualLines(virtualLines: VirtualLineManager | null): void {
    this.deps.virtualLines = virtualLines ?? undefined;
  }

  /**
   * Gerer une requete HTTP entrante.
   * @returns true si la requete a ete geree, false sinon.
   */
  handleRequest(req: IncomingMessage, res: ServerResponse): boolean {
    const url = req.url || '';
    if (!url.startsWith(this.basePath)) return false;

    // CORS strict
    this.handleCORS(req, res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return true;
    }

    const path = url.slice(this.basePath.length) || '/';
    const method = req.method || 'GET';

    try {
      // Endpoints publics (sans auth)
      if (method === 'POST' && path === '/login') {
        // Brute-force protection par IP
        const ip = (req as any).socket?.remoteAddress || 'unknown';
        const bf = checkLoginBruteForce(ip);
        if (!bf.allowed) {
          const retryAfterSec = Math.ceil(bf.retryAfterMs / 1000);
          log.warn(`Brute-force login bloque pour IP ${ip} (retry in ${retryAfterSec}s)`);
          res.setHeader('Retry-After', String(retryAfterSec));
          this.sendJSON(res, {
            error: 'Too Many Requests',
            message: `Trop de tentatives de connexion. Reessayez dans ${retryAfterSec}s.`,
            retryAfter: retryAfterSec,
          }, 429);
          return true;
        }
        this.handleLogin(req, res, ip);
        return true;
      }

      // Tous les autres endpoints requièrent authentification
      const session = this.requireAuth(req, res);
      if (!session) return true; // Erreur 401 déjà envoyée par requireAuth

      // Endpoints protégés
      if (method === 'POST' && path === '/logout') {
        this.handleLogout(session.token, res);
      } else if (method === 'GET' && path === '/status') {
        this.getStatus().then((data) => this.sendJSON(res, data)).catch((err) => this.sendJSON(res, { error: String(err) }, 500));
        return true;
      } else if (method === 'GET' && path === '/sessions') {
        this.getSessions().then((data) => this.sendJSON(res, data)).catch((err) => this.sendJSON(res, { error: String(err) }, 500));
        return true;
      } else if (method === 'GET' && path.startsWith('/sessions/')) {
        const id = path.slice('/sessions/'.length);
        this.getSession(id).then((data) => this.sendJSON(res, data, 'error' in data ? 404 : 200)).catch((err) => this.sendJSON(res, { error: String(err) }, 500));
        return true;
      } else if (method === 'DELETE' && path.startsWith('/sessions/')) {
        const id = path.slice('/sessions/'.length);
        this.deleteSession(id, res);
        return true;
      } else if (method === 'GET' && path === '/tools') {
        this.sendJSON(res, this.getTools());
      } else if (method === 'GET' && path === '/metrics') {
        this.sendJSON(res, this.getMetrics());
      } else if (method === 'GET' && path === '/events') {
        this.sendJSON(res, this.getEvents());
      } else if (method === 'GET' && path === '/lines') {
        this.sendJSON(res, this.getLines());
      } else if (method === 'GET' && path.startsWith('/lines/')) {
        const apiKey = decodeURIComponent(path.slice('/lines/'.length));
        this.getLinesByApiKey(apiKey).then((data) => this.sendJSON(res, data, 'error' in data ? 404 : 200)).catch((err) => this.sendJSON(res, { error: String(err) }, 500));
        return true;
      } else if (method === 'GET' && path === '/client/keys') {
        this.handleGetClientKeys(res);
      } else if (method === 'POST' && path === '/client/keys') {
        this.handleAddClientKey(req, res);
        return true;
      } else if (method === 'POST' && path.startsWith('/client/keys/') && path.endsWith('/status')) {
        const keyRef = decodeURIComponent(path.slice('/client/keys/'.length, -'/status'.length));
        this.handleSetClientKeyStatus(keyRef, req, res);
        return true;
      } else if (method === 'POST' && path.startsWith('/client/keys/') && path.endsWith('/rotate')) {
        const keyRef = decodeURIComponent(path.slice('/client/keys/'.length, -'/rotate'.length));
        this.handleRotateClientKey(keyRef, req, res);
        return true;
      } else if (method === 'DELETE' && path.startsWith('/client/keys/')) {
        const key = decodeURIComponent(path.slice('/client/keys/'.length));
        this.handleDeleteClientKey(key, res);
        return true;
      } else if (method === 'GET' && path === '/prompts') {
        this.getPrompts().then((data) => this.sendJSON(res, data)).catch((err) => this.sendJSON(res, { error: String(err) }, 500));
        return true;
      } else if (method === 'GET' && path.startsWith('/prompts/')) {
        const apiKey = decodeURIComponent(path.slice('/prompts/'.length));
        this.getPromptByApiKey(apiKey).then((data) => this.sendJSON(res, data)).catch((err) => this.sendJSON(res, { error: String(err) }, 500));
        return true;
      } else if (method === 'POST' && path === '/prompts') {
        this.handleSetPrompt(req, res);
        return true;
      } else if (method === 'DELETE' && path.startsWith('/prompts/')) {
        const apiKey = decodeURIComponent(path.slice('/prompts/'.length));
        this.handleDeletePrompt(apiKey, res);
        return true;
      } else if (method === 'POST' && path === '/lines/acquire') {
        this.handleLineAcquire(req, res);
        return true;
      } else if (method === 'POST' && path === '/lines/release') {
        this.handleLineRelease(req, res);
        return true;
      } else if (method === 'POST' && path === '/lines/force-release') {
        this.handleLineForceRelease(req, res);
        return true;
      } else if (method === 'GET' && path === '/capabilities') {
        this.sendJSON(res, this.getCapabilities());
      } else if (method === 'GET' && path === '/bridge') {
        this.getBridgeStats()
          .then((data: BridgeStats) => this.sendJSON(res, data))
          .catch((err: unknown) => this.sendJSON(res, { error: String(err) }, 500));
        return true;
      } else if (method === 'GET' && path === '/bridge/events') {
        this.getBridgeEvents()
          .then((events: BridgeEventSummary[]) => this.sendJSON(res, { events }))
          .catch((err: unknown) => this.sendJSON(res, { error: String(err) }, 500));
        return true;
      } else if (method === 'GET' && path === '/voice-config') {
        this.sendJSON(res, this.getVoiceConfig());
      } else if (method === 'POST' && path === '/voice-config') {
        this.handleSetVoiceConfig(req, res);
        return true;
      } else {
        this.sendJSON(res, { error: 'Not Found' }, 404);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.sendJSON(res, { error: message }, 500);
    }

    return true;
  }

  // ============================================================
  // Authentification
  // ============================================================

  /**
   * Gérer les headers CORS.
   */
  private handleCORS(req: IncomingMessage, res: ServerResponse): void {
    const origin = req.headers.origin;

    if (this.allowedOrigins.length === 0) {
      // Pas de CORS si non configuré
      return;
    }

    if (this.allowedOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (origin && this.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  /**
   * Login admin.
   */
  private handleLogin(req: IncomingMessage, res: ServerResponse, clientIp: string): void {
    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { username, password } = JSON.parse(body || '{}');
        
        if (!username || !password) {
          this.sendJSON(res, { 
            error: 'Username et password requis',
            message: 'Veuillez fournir username et password dans le body JSON'
          }, 400);
          return;
        }

        const ip = this.getClientIP(req);
        const token = await this.deps.adminAuth.login(username, password, ip);

        if (!token) {
          this.sendJSON(res, { 
            error: 'Identifiants invalides',
            message: 'Username ou password incorrect'
          }, 401);
          return;
        }

        this.sendJSON(res, { 
          success: true,
          token,
          message: 'Login \u00e9ussi. Utilisez ce token dans le header Authorization: Bearer <token>'
        });
        // Login reussi : remettre le compteur brute-force a zero
        resetLoginAttempts(clientIp);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.sendJSON(res, { error: message }, 429); // Too many requests
      }
    });
  }

  /**
   * Logout admin.
   */
  private handleLogout(token: string, res: ServerResponse): void {
    const success = this.deps.adminAuth.logout(token);
    this.sendJSON(res, { 
      success,
      message: success ? 'Logout réussi' : 'Session non trouvée'
    });
  }

  /**
   * Middleware d'authentification.
   * Vérifie le token de session dans le header Authorization.
   * @returns Session si valide, null sinon (et envoie 401)
   */
  private requireAuth(req: IncomingMessage, res: ServerResponse): { token: string; username: string } | null {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      this.sendJSON(res, { 
        error: 'Authentication required',
        message: 'Les endpoints admin requièrent un token de session. Utilisez POST /admin/login pour obtenir un token.'
      }, 401);
      return null;
    }

    const token = authHeader.slice(7);
    const session = this.deps.adminAuth.verifySession(token);

    if (!session) {
      this.sendJSON(res, { 
        error: 'Session invalide ou expirée',
        message: 'Veuillez vous reconnecter via POST /admin/login'
      }, 401);
      return null;
    }

    return { token, username: session.username };
  }

  /**
   * Extraire l'IP du client.
   */
  private getClientIP(req: IncomingMessage): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
  }

  // ============================================================
  // Endpoints
  // ============================================================

  private async getStatus() {
    const { sessions, pool, toolRouter, startedAt } = this.deps;
    const sessionList = sessions.getAll();
    const [keyRecords, agentRecords] = await Promise.all([
      this.getApiKeyRecords(),
      this.getAgentRecords(),
    ]);
    const agentGroups = new Map<string, {
      agentName: string;
      keyId: string;
      apiKey: string;
      apiKeyName?: string;
      sessions: number;
      lastActivityAt: number;
      currentUrl: string | null;
    }>();

    for (const session of sessionList) {
      const meta = this.getSessionRuntimeMeta(session, keyRecords, agentRecords);
      const groupKey = meta.keyId;
      const existing = agentGroups.get(groupKey);
      if (existing) {
        existing.sessions++;
        if (session.lastActivityAt > existing.lastActivityAt) {
          existing.lastActivityAt = session.lastActivityAt;
          existing.currentUrl = session.context.url || null;
        }
      } else {
        agentGroups.set(groupKey, {
          agentName: meta.agentName,
          keyId: meta.keyId,
          apiKey: meta.apiKey,
          apiKeyName: meta.apiKeyName,
          sessions: 1,
          lastActivityAt: session.lastActivityAt,
          currentUrl: session.context.url || null,
        });
      }
    }

    const bridge = await this.getBridgeStats();

    return {
      uptime: Date.now() - startedAt,
      version: '0.1.0',
      activeSessions: sessions.size,
      activeConnections: pool.size,
      serverTools: toolRouter.getServerToolNames(),
      pendingToolCalls: toolRouter.pendingCount,
      activeAgents: Array.from(agentGroups.values()),
      bridge,
    };
  }

  private getCapabilities() {
    const { llmAdapter, liveAdapter, sttService, ttsService } = this.deps;
    return {
      llm:  llmAdapter?.getCapabilities?.()  ?? null,
      live: liveAdapter?.getCapabilities?.() ?? null,
      stt:  sttService?.getCapabilities?.()  ?? null,
      tts:  ttsService?.getCapabilities?.()  ?? null,
      voiceConfig: this.getVoiceConfig(),
    };
  }

  private async getBridgeStats(): Promise<BridgeStats> {
    if (!this.deps.bridge) {
      return {
        enabled: false,
        activeBridges: 0,
        sessions: [],
      };
    }

    const rawStats = await this.deps.bridge.getStats();
    const events = await this.getBridgeEvents();
    const lastError = [...events]
      .reverse()
      .find((event) => event.type === 'error' || event.type === 'tool.call_failed')
      ?.message;
    const statsLastError = rawStats.lastError ? safeBridgeErrorMessage('error') : undefined;
    return {
      enabled: Boolean(rawStats.enabled),
      activeBridges: rawStats.activeBridges,
      sessions: rawStats.sessions.map((session) => ({
        sessionId: session.sessionId,
        roomName: session.roomName,
        agentIdentity: session.agentIdentity,
        startedAt: session.startedAt,
      })),
      events,
      lastError: lastError ?? statsLastError,
      provider: rawStats.provider,
      urlConfigured: rawStats.urlConfigured,
      model: rawStats.model,
      voice: rawStats.voice,
    };
  }

  private async getBridgeEvents(limit = 20): Promise<BridgeEventSummary[]> {
    try {
      const rawEvents = this.deps.bridge?.getEvents
        ? await this.deps.bridge.getEvents(limit)
        : [];
      return rawEvents
        .map((event) => sanitizeBridgeEvent(event))
        .filter((event): event is BridgeEventSummary => Boolean(event));
    } catch {
      log.warn('Bridge events indisponibles pour le dashboard');
      return [];
    }
  }

  private async getSessions() {
    const sessions = this.deps.sessions.getAll();
    const [keyRecords, agentRecords] = await Promise.all([
      this.getApiKeyRecords(),
      this.getAgentRecords(),
    ]);

    return {
      sessions: sessions.map((session) => this.serializeSessionSummary(session, keyRecords, agentRecords)),
    };
  }

  private async getSession(id: string) {
    const session = this.deps.sessions.get(id);
    if (!session) {
      return { error: 'Session not found' };
    }
    const [keyRecords, agentRecords] = await Promise.all([
      this.getApiKeyRecords(),
      this.getAgentRecords(),
    ]);
    const meta = this.getSessionRuntimeMeta(session, keyRecords, agentRecords);
    const surface = this.buildEffectiveToolsPayload(session);

    return {
      id: session.id,
      state: session.state,
      ...meta,
      conversation: session.conversation.getMessages(),
      tools: surface.clientTools,
      effectiveTools: surface.effectiveTools,
      serverTools: surface.serverTools,
      ignoredClientTools: surface.ignoredClientTools,
      graph: {
        pageHistory: session.graph.getPageHistory(),
        topTools: session.graph.getTopTools(10),
        metrics: session.graph.getMetrics(),
      },
      context: {
        url: session.context.url,
        data: session.context.data,
      },
    };
  }

  private async deleteSession(id: string, res: ServerResponse) {
    const session = this.deps.sessions.get(id);
    if (!session) {
      this.sendJSON(res, { error: 'Session not found' }, 404);
      return;
    }

    const closed = await this.teardownSession(id, 'Session fermee par admin');
    if (closed) {
      this.recordEvent('session.deleted', `Session fermee: ${id}`, {
        sessionId: id,
        keyId: this.keyId(session.apiKey),
      });
    }
    this.sendJSON(res, { ok: closed, deleted: id });
  }

  private getTools() {
    const serverToolDeclarations = this.deps.toolRouter.getServerToolDeclarations();
    const serverTools = serverToolDeclarations.map((tool) => tool.name);
    const clientTools: Record<string, ToolDeclaration[]> = {};
    const effectiveToolsBySession: Record<string, ToolDeclaration[]> = {};
    const ignoredClientToolsBySession: Record<string, ToolDeclaration[]> = {};

    for (const session of this.deps.sessions.getAll()) {
      const surface = this.buildEffectiveToolsPayload(session);
      if (surface.clientTools.length > 0) {
        clientTools[session.id] = surface.clientTools;
      }
      if (surface.effectiveTools.length > 0) {
        effectiveToolsBySession[session.id] = surface.effectiveTools;
      }
      if (surface.ignoredClientTools.length > 0) {
        ignoredClientToolsBySession[session.id] = surface.ignoredClientTools;
      }
    }

    return {
      serverTools,
      serverToolDeclarations,
      clientTools,
      effectiveToolsBySession,
      ignoredClientToolsBySession,
    };
  }

  private getMetrics() {
    const sessions = this.deps.sessions.getAll();
    let totalMessages = 0;
    let totalToolCalls = 0;
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let errors = 0;

    for (const s of sessions) {
      const m = s.graph.getMetrics();
      totalMessages += m.totalMessages;
      totalToolCalls += m.totalToolCalls;
      totalTokensIn += m.totalTokensIn;
      totalTokensOut += m.totalTokensOut;
      errors += m.errors;
    }

    return {
      global: {
        totalSessions: sessions.length,
        activeSessions: sessions.filter(s => s.state === 'active').length,
        totalMessages,
        totalToolCalls,
        totalTokensIn,
        totalTokensOut,
        errors,
      },
    };
  }

  // ============================================================
  // Client API Keys Management
  // ============================================================

  private handleGetClientKeys(res: ServerResponse): void {
    if (!this.enableClientKeyManagement) {
      this.sendJSON(res, { 
        error: 'Client key management disabled',
        message: 'Activez enableClientKeyManagement dans la config serveur pour accéder à cette fonctionnalité'
      }, 403);
      return;
    }

    this.deps.clientAuth.listKeys().then((records) => {
      this.sendJSON(res, {
        enabled: true,
        keys: records.map(r => ({
          id: this.keyId(r.key),
          masked: this.maskApiKey(r.key),
          name: r.name,
          description: r.description,
          clientType: r.clientType,
          createdAt: r.createdAt,
          status: r.status ?? 'active',
          updatedAt: r.updatedAt,
          lastUsedAt: r.lastUsedAt,
          revokedAt: r.revokedAt,
          rotatedAt: r.rotatedAt,
        })),
        total: records.length,
      });
    }).catch((err) => {
      this.sendJSON(res, { error: `Erreur lecture des clés: ${String(err)}` }, 500);
    });
  }

  private handleAddClientKey(req: IncomingMessage, res: ServerResponse): void {
    if (!this.enableClientKeyManagement) {
      this.sendJSON(res, { 
        error: 'Client key management disabled' 
      }, 403);
      return;
    }

    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { apiKey, name, description, clientType } = JSON.parse(body || '{}');
        if (!apiKey) {
          this.sendJSON(res, { error: 'apiKey requis dans le body' }, 400);
          return;
        }
        const record = {
          key: apiKey,
          name: typeof name === 'string' ? name : undefined,
          description: typeof description === 'string' ? description : undefined,
          clientType: Array.isArray(clientType) ? clientType : undefined,
          createdAt: Date.now(),
          status: 'active' as const,
          updatedAt: Date.now(),
        };
        this.deps.clientAuth.addKeyRecord(record).then(() => {
          this.recordEvent('api_key.created', `API key creee: ${this.maskApiKey(apiKey)}`, {
            keyId: this.keyId(apiKey),
            name: record.name,
          });
          this.sendJSON(res, {
            success: true,
            id: this.keyId(apiKey),
            apiKey: this.maskApiKey(apiKey),
            publicKey: apiKey,
          });
        }).catch((err) => {
          this.sendJSON(res, { error: `Erreur sauvegarde clé: ${String(err)}` }, 500);
        });
      } catch {
        this.sendJSON(res, { error: 'Body JSON invalide' }, 400);
      }
    });
  }

  private handleDeleteClientKey(keyRef: string, res: ServerResponse): void {
    if (!this.enableClientKeyManagement) {
      this.sendJSON(res, {
        error: 'Client key management disabled'
      }, 403);
      return;
    }

    this.resolveApiKeyRef(keyRef).then((apiKey) => {
      if (!apiKey) {
        this.sendJSON(res, { error: 'API key non trouvée' }, 404);
        return;
      }

      return this.deps.clientAuth.removeKeyRecord(apiKey).then(async (removed) => {
        if (removed) {
          const closedSessions = await this.teardownSessionsForApiKey(apiKey, 'API key supprimee');
          this.recordEvent('api_key.deleted', `API key supprimee: ${this.maskApiKey(apiKey)}`, {
            keyId: this.keyId(apiKey),
            closedSessions,
          });
          this.sendJSON(res, { success: true, deleted: this.maskApiKey(apiKey), id: this.keyId(apiKey) });
        } else {
          this.sendJSON(res, { error: 'API key non trouvée' }, 404);
        }
      });
    }).catch((err) => {
      this.sendJSON(res, { error: `Erreur suppression clé: ${String(err)}` }, 500);
    });
  }

  private handleSetClientKeyStatus(keyRef: string, req: IncomingMessage, res: ServerResponse): void {
    if (!this.enableClientKeyManagement) {
      this.sendJSON(res, { error: 'Client key management disabled' }, 403);
      return;
    }

    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { status } = JSON.parse(body || '{}');
        if (!['active', 'disabled', 'revoked'].includes(status)) {
          this.sendJSON(res, { error: 'status invalide' }, 400);
          return;
        }

        this.resolveApiKeyRef(keyRef).then(async (apiKey) => {
          if (!apiKey) {
            this.sendJSON(res, { error: 'API key non trouvee' }, 404);
            return;
          }

          const current = (await this.deps.clientAuth.getStore().load(apiKey));
          if (current?.status === 'revoked' && status === 'active') {
            this.sendJSON(res, { error: 'Une API key revoquee doit etre remplacee par rotation' }, 400);
            return;
          }

          const updated = await this.deps.clientAuth.setKeyStatus(apiKey, status);
          if (!updated) {
            this.sendJSON(res, { error: 'API key non trouvee' }, 404);
            return;
          }

          const closedSessions = status === 'active'
            ? 0
            : await this.teardownSessionsForApiKey(apiKey, `API key ${status}`);
          this.recordEvent(`api_key.${status}`, `API key ${status}: ${this.maskApiKey(apiKey)}`, {
            keyId: this.keyId(apiKey),
            closedSessions,
          });
          this.sendJSON(res, {
            success: true,
            id: this.keyId(apiKey),
            apiKey: this.maskApiKey(apiKey),
            status: updated.status ?? 'active',
            closedSessions,
          });
        }).catch((err) => {
          this.sendJSON(res, { error: `Erreur mise a jour statut: ${String(err)}` }, 500);
        });
      } catch {
        this.sendJSON(res, { error: 'Body JSON invalide' }, 400);
      }
    });
  }

  private handleRotateClientKey(keyRef: string, req: IncomingMessage, res: ServerResponse): void {
    if (!this.enableClientKeyManagement) {
      this.sendJSON(res, { error: 'Client key management disabled' }, 403);
      return;
    }

    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const newKey = typeof parsed.apiKey === 'string' && parsed.apiKey.trim()
          ? parsed.apiKey.trim()
          : `pk_${randomBytes(24).toString('hex')}`;

        this.resolveApiKeyRef(keyRef).then(async (apiKey) => {
          if (!apiKey) {
            this.sendJSON(res, { error: 'API key non trouvee' }, 404);
            return;
          }

          const rotated = await this.deps.clientAuth.rotateKey(apiKey, newKey);
          if (!rotated) {
            this.sendJSON(res, { error: 'API key non trouvee' }, 404);
            return;
          }

          const closedSessions = await this.teardownSessionsForApiKey(apiKey, 'API key rotatee');
          this.recordEvent('api_key.rotated', `API key rotatee: ${this.maskApiKey(apiKey)}`, {
            fromKeyId: this.keyId(apiKey),
            toKeyId: this.keyId(newKey),
            closedSessions,
          });
          this.sendJSON(res, {
            success: true,
            id: this.keyId(newKey),
            apiKey: this.maskApiKey(newKey),
            publicKey: newKey,
            rotatedFrom: this.keyId(apiKey),
            closedSessions,
          });
        }).catch((err) => {
          this.sendJSON(res, { error: `Erreur rotation cle: ${String(err)}` }, 500);
        });
      } catch {
        this.sendJSON(res, { error: 'Body JSON invalide' }, 400);
      }
    });
  }

  private getPrompts() {
    const store = this.deps.agentStore;
    if (!store) return Promise.resolve({ prompts: [] });
    return store.list().then((records) => ({
      prompts: records.map(r => ({
        keyId: this.keyId(r.apiKey),
        apiKey: this.maskApiKey(r.apiKey),
        prompt: r.prompt,
        updatedAt: r.updatedAt,
      })),
    }));
  }

  private async getPromptByApiKey(keyRef: string) {
    const store = this.deps.agentStore;
    if (!store) return { error: 'Prompts non disponibles' };
    const apiKey = await this.resolveApiKeyRef(keyRef);
    if (!apiKey) return { error: 'API key non trouvée' };
    const record = await store.load(apiKey);
    if (!record) return { keyId: this.keyId(apiKey), apiKey: this.maskApiKey(apiKey), prompt: null };
    return { keyId: this.keyId(apiKey), apiKey: this.maskApiKey(apiKey), prompt: record.prompt };
  }

  private handleSetPrompt(req: IncomingMessage, res: ServerResponse): void {
    const store = this.deps.agentStore;
    if (!store) {
      this.sendJSON(res, { error: 'Prompts non disponibles' }, 400);
      return;
    }

    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { apiKey, keyId, keyRef, prompt } = JSON.parse(body || '{}');
        const ref = keyRef ?? keyId ?? apiKey;
        if (!ref) {
          this.sendJSON(res, { error: 'apiKey ou keyId requis' }, 400);
          return;
        }
        if (!prompt) {
          this.sendJSON(res, { error: 'prompt requis' }, 400);
          return;
        }
        const now = Date.now();
        this.resolveApiKeyRef(ref).then((resolvedApiKey) => {
          if (!resolvedApiKey) {
            this.sendJSON(res, { error: 'API key non trouvée' }, 404);
            return null;
          }

          return store.load(resolvedApiKey).then((existing) => {
            const record = {
              apiKey: resolvedApiKey,
              prompt,
              createdAt: existing?.createdAt ?? now,
              updatedAt: now,
            };
            return store.save(record).then(() => resolvedApiKey);
          });
        }).then((resolvedApiKey) => {
          if (!resolvedApiKey) return;
          this.recordEvent('prompt.updated', `Prompt agent mis a jour: ${this.maskApiKey(resolvedApiKey)}`, {
            keyId: this.keyId(resolvedApiKey),
          });
          this.sendJSON(res, {
            success: true,
            keyId: this.keyId(resolvedApiKey),
            apiKey: this.maskApiKey(resolvedApiKey),
          });
        }).catch((err) => {
          this.sendJSON(res, { error: `Erreur sauvegarde prompt: ${String(err)}` }, 500);
        });
      } catch {
        this.sendJSON(res, { error: 'Body JSON invalide' }, 400);
      }
    });
  }

  private handleDeletePrompt(keyRef: string, res: ServerResponse): void {
    const store = this.deps.agentStore;
    if (!store) {
      this.sendJSON(res, { error: 'Prompts non disponibles' }, 400);
      return;
    }

    this.resolveApiKeyRef(keyRef).then((apiKey) => {
      if (!apiKey) {
        this.sendJSON(res, { error: 'API key non trouvée' }, 404);
        return null;
      }
      return store.load(apiKey).then((existing) => ({ apiKey, existing }));
    }).then((resolved) => {
      if (!resolved) return;
      const { apiKey, existing } = resolved;
      if (!existing) {
        this.sendJSON(res, { error: 'Aucun override pour cette API key' }, 404);
        return;
      }
      return store.delete(apiKey).then(() => {
        this.recordEvent('prompt.deleted', `Prompt agent supprime: ${this.maskApiKey(apiKey)}`, {
          keyId: this.keyId(apiKey),
        });
        this.sendJSON(res, { success: true, deleted: this.maskApiKey(apiKey), keyId: this.keyId(apiKey) });
      });
    }).catch((err) => {
      this.sendJSON(res, { error: `Erreur suppression: ${String(err)}` }, 500);
    });
  }

  private handleLineAcquire(req: IncomingMessage, res: ServerResponse): void {
    if (!this.deps.virtualLines) {
      this.sendJSON(res, { error: 'Virtual lines non activees' }, 400);
      return;
    }

    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { apiKey, keyId, keyRef } = JSON.parse(body || '{}');
        const ref = keyRef ?? keyId ?? apiKey;
        if (!ref) {
          this.sendJSON(res, { error: 'apiKey ou keyId requis dans le body' }, 400);
          return;
        }
        this.resolveLineApiKeyRef(ref).then(async (resolvedApiKey) => {
          if (!resolvedApiKey) {
            this.sendJSON(res, { error: 'Aucun pool pour cette API key' }, 404);
            return;
          }
          const result = this.deps.virtualLines!.acquire(resolvedApiKey);
          this.recordEvent('line.acquire', `Ligne demandee: ${this.maskApiKey(resolvedApiKey)}`, {
            keyId: this.keyId(resolvedApiKey),
            success: result.success,
            waiting: result.waiting,
          });
          this.sendJSON(res, result, result.success ? 200 : 503);
        }).catch((err) => {
          this.sendJSON(res, { error: `Erreur acquisition ligne: ${String(err)}` }, 500);
        });
      } catch {
        this.sendJSON(res, { error: 'Body JSON invalide' }, 400);
      }
    });
  }

  private handleLineRelease(req: IncomingMessage, res: ServerResponse): void {
    if (!this.deps.virtualLines) {
      this.sendJSON(res, { error: 'Virtual lines non activees' }, 400);
      return;
    }

    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { token } = JSON.parse(body || '{}');
        if (!token) {
          this.sendJSON(res, { error: 'token requis dans le body' }, 400);
          return;
        }
        const released = this.deps.virtualLines!.release(token);
        if (released) {
          this.recordEvent('line.release', 'Ligne liberee par token admin');
        }
        this.sendJSON(res, { success: released }, released ? 200 : 404);
      } catch {
        this.sendJSON(res, { error: 'Body JSON invalide' }, 400);
      }
    });
  }

  private handleLineForceRelease(req: IncomingMessage, res: ServerResponse): void {
    if (!this.deps.virtualLines) {
      this.sendJSON(res, { error: 'Virtual lines non activees' }, 400);
      return;
    }

    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { apiKey, keyId, keyRef, lineId } = JSON.parse(body || '{}');
        const ref = keyRef ?? keyId ?? apiKey;
        if (!ref || typeof lineId !== 'string') {
          this.sendJSON(res, { error: 'keyRef/keyId et lineId requis' }, 400);
          return;
        }

        this.resolveLineApiKeyRef(ref).then(async (resolvedApiKey) => {
          if (!resolvedApiKey) {
            this.sendJSON(res, { error: 'Aucun pool pour cette API key' }, 404);
            return;
          }

          const status = this.deps.virtualLines!.getPoolStatus(resolvedApiKey);
          const line = status?.lines.find((entry) => entry.id === lineId)
            ?? (status?.waitingLine.id === lineId ? status.waitingLine : undefined);
          const sessionId = line?.sessionId ?? null;
          const released = this.deps.virtualLines!.forceRelease(resolvedApiKey, lineId);
          if (released && sessionId) {
            await this.teardownSession(sessionId, 'Virtual line force-released');
          }
          if (released) {
            this.recordEvent('line.force_release', `Ligne force-release: ${lineId}`, {
              keyId: this.keyId(resolvedApiKey),
              lineId,
              sessionId,
            });
          }
          this.sendJSON(res, { success: released, lineId, sessionId }, released ? 200 : 404);
        }).catch((err) => {
          this.sendJSON(res, { error: `Erreur force-release ligne: ${String(err)}` }, 500);
        });
      } catch {
        this.sendJSON(res, { error: 'Body JSON invalide' }, 400);
      }
    });
  }

  private getLines() {
    if (!this.deps.virtualLines) {
      return { pools: [], enabled: false };
    }
    return {
      pools: this.deps.virtualLines.getAllPools().map((pool) => this.serializeLinePool(pool)),
      enabled: true,
    };
  }

  private async getLinesByApiKey(keyRef: string) {
    if (!this.deps.virtualLines) {
      return { error: 'Virtual lines non activees' };
    }
    const apiKey = await this.resolveLineApiKeyRef(keyRef);
    if (!apiKey) {
      return { error: 'Aucun pool pour cette API key' };
    }
    const status = this.deps.virtualLines.getPoolStatus(apiKey);
    if (!status) {
      return { error: 'Aucun pool pour cette API key' };
    }
    return this.serializeLinePool(status);
  }

  private getVoiceConfig() {
    return {
      configurable: Boolean(this.deps.setRuntimeVoiceConfig),
      liveVoice: this.deps.runtimeVoiceConfig?.liveVoice,
      ttsVoice: this.deps.runtimeVoiceConfig?.ttsVoice,
      language: this.deps.runtimeVoiceConfig?.language,
    };
  }

  private handleSetVoiceConfig(req: IncomingMessage, res: ServerResponse): void {
    if (!this.deps.setRuntimeVoiceConfig) {
      this.sendJSON(res, {
        error: 'Voice runtime config non disponible',
        message: 'Ce serveur expose les capabilities en lecture seule.',
      }, 400);
      return;
    }

    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const next: RuntimeVoiceConfig = {
          liveVoice: this.optionalString(parsed.liveVoice),
          ttsVoice: this.optionalString(parsed.ttsVoice),
          language: this.optionalString(parsed.language),
        };

        this.deps.setRuntimeVoiceConfig?.(next);
        this.recordEvent('voice_config.updated', 'Configuration voix mise a jour', next as Record<string, unknown>);
        this.sendJSON(res, { success: true, voiceConfig: this.getVoiceConfig() });
      } catch {
        this.sendJSON(res, { error: 'Body JSON invalide' }, 400);
      }
    });
  }

  // ============================================================
  // Helpers
  // ============================================================

  private async getApiKeyRecords(): Promise<ApiKeyRecord[]> {
    try {
      return await this.deps.clientAuth.listKeys();
    } catch {
      return [];
    }
  }

  private async getAgentRecords(): Promise<AgentRecord[]> {
    try {
      return await this.deps.agentStore?.list() ?? [];
    } catch {
      return [];
    }
  }

  private getEvents() {
    return { events: this.events.slice().reverse() };
  }

  private recordEvent(type: string, message: string, data?: Record<string, unknown>): void {
    this.events.push({
      id: `evt_${Date.now()}_${this.events.length}`,
      type,
      at: Date.now(),
      message,
      data,
    });
    if (this.events.length > 100) {
      this.events.splice(0, this.events.length - 100);
    }
  }

  private async resolveApiKeyRef(ref: string): Promise<string | null> {
    const records = await this.getApiKeyRecords();
    const record = records.find((entry) =>
      entry.key === ref ||
      this.keyId(entry.key) === ref ||
      this.maskApiKey(entry.key) === ref
    );
    if (record) return record.key;

    // Retrocompatibilite: les endpoints historiques acceptaient la cle brute.
    if (/^key_[a-f0-9]{16}$/.test(ref)) {
      return null;
    }
    return ref;
  }

  private async resolveLineApiKeyRef(ref: string): Promise<string | null> {
    const pools = this.deps.virtualLines?.getAllPools() ?? [];
    const pool = pools.find((entry) =>
      entry.apiKey === ref ||
      this.keyId(entry.apiKey) === ref ||
      this.maskApiKey(entry.apiKey) === ref
    );
    if (pool) return pool.apiKey;
    return this.resolveApiKeyRef(ref);
  }

  private serializeLinePool(pool: LinePoolStatus) {
    return {
      ...pool,
      apiKey: this.maskApiKey(pool.apiKey),
      keyId: this.keyId(pool.apiKey),
    };
  }

  private async teardownSessionsForApiKey(apiKey: string, reason: string): Promise<number> {
    const sessions = this.deps.sessions.getAll().filter((session) => session.apiKey === apiKey);
    for (const session of sessions) {
      await this.teardownSession(session.id, reason);
    }
    return sessions.length;
  }

  private async teardownSession(sessionId: string, reason: string): Promise<boolean> {
    const session = this.deps.sessions.get(sessionId);
    if (!session) return false;

    this.deps.closeConnection?.(session.connId, 1008, reason);
    this.deps.clientAuth.releaseConnection(session.apiKey);
    this.deps.virtualLines?.releaseBySession(session.id);
    this.deps.pool.unregister(session.connId);
    await this.deps.sessions.destroy(session.id);
    return true;
  }

  private serializeSessionSummary(
    session: ReturnType<SessionManager['getAll']>[number],
    keyRecords: ApiKeyRecord[],
    agentRecords: AgentRecord[],
  ) {
    const meta = this.getSessionRuntimeMeta(session, keyRecords, agentRecords);
    return {
      id: session.id,
      ...meta,
      state: session.state,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      messageCount: session.conversation.getMessages().length,
      toolCallCount: session.graph.getMetrics().totalToolCalls,
      currentUrl: session.context.url || null,
    };
  }

  private getSessionRuntimeMeta(
    session: ReturnType<SessionManager['getAll']>[number],
    keyRecords: ApiKeyRecord[],
    agentRecords: AgentRecord[],
  ): SessionRuntimeMeta {
    const keyRecord = keyRecords.find((record) => record.key === session.apiKey);
    const agentRecord = agentRecords.find((record) => record.apiKey === session.apiKey);
    const codePrompt = this.deps.llmAdapter?.systemPrompt ?? this.deps.liveAdapter?.systemPrompt;
    const agentName =
      this.promptName(agentRecord?.prompt) ??
      keyRecord?.name ??
      this.promptName(codePrompt) ??
      this.maskApiKey(session.apiKey);
    const promptSource: PromptSource = agentRecord
      ? 'dashboardOverride'
      : codePrompt
        ? 'codeDefault'
        : 'none';
    const surface = this.buildEffectiveToolsPayload(session);

    return {
      apiKey: this.maskApiKey(session.apiKey),
      keyId: this.keyId(session.apiKey),
      apiKeyName: keyRecord?.name,
      clientType: keyRecord?.clientType,
      agentName,
      promptSource,
      promptUpdatedAt: agentRecord?.updatedAt,
      toolsCount: surface.clientTools.length,
      effectiveToolsCount: surface.effectiveTools.length,
    };
  }

  private buildEffectiveToolsPayload(session: ReturnType<SessionManager['getAll']>[number]) {
    const merged = new Map<string, ToolDeclaration>();
    const serverTools = this.deps.toolRouter.getServerToolDeclarations();
    const clientTools = session.toolRegistry.getDeclarations();
    const ignoredClientTools: ToolDeclaration[] = [];

    for (const tool of serverTools) {
      merged.set(tool.name, tool);
    }

    for (const tool of clientTools) {
      if (merged.has(tool.name)) {
        ignoredClientTools.push(tool);
        continue;
      }
      merged.set(tool.name, tool);
    }

    return {
      effectiveTools: Array.from(merged.values()),
      serverTools,
      clientTools,
      ignoredClientTools,
    };
  }

  private promptName(prompt?: SystemPrompt): string | undefined {
    if (!prompt || typeof prompt === 'string') return undefined;
    return typeof prompt.name === 'string' && prompt.name.trim()
      ? prompt.name.trim()
      : undefined;
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private sendJSON(res: ServerResponse, data: unknown, status: number = 200): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  private keyId(key: string): string {
    return `key_${createHash('sha256').update(key).digest('hex').slice(0, 16)}`;
  }

  private maskApiKey(key: string): string {
    if (key.length <= 8) return '***';
    return key.slice(0, 3) + '***' + key.slice(-3);
  }
}
