import type { IncomingMessage, ServerResponse } from 'http';
import type { SessionManager } from '../core/SessionManager.js';
import type { ConnectionPool } from '../transport/ConnectionPool.js';
import type { ToolRouter } from '../core/ToolRouter.js';
import type { RateLimiter } from '../middleware/rateLimit.js';
import type { VirtualLineManager } from '../lines/VirtualLineManager.js';
import type { SystemPrompt } from '@domos/core';
import type { AdminAuthManager } from '../auth/AdminAuthManager.js';
import type { ClientAuthManager } from '../auth/ClientAuthManager.js';

/**
 * Dependances injectees dans l'AdminAPI.
 */
export interface AdminAPIDeps {
  sessions: SessionManager;
  pool: ConnectionPool;
  toolRouter: ToolRouter;
  rateLimit: RateLimiter;
  startedAt: number;
  adminAuth: AdminAuthManager;
  clientAuth: ClientAuthManager;
  promptOverrides?: Map<string, SystemPrompt>;
  virtualLines?: VirtualLineManager;
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
 * AdminAPI — API REST d'administration pour le monitoring du serveur DomOS.
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
        this.handleLogin(req, res);
        return true;
      }

      // Tous les autres endpoints requièrent authentification
      const session = this.requireAuth(req, res);
      if (!session) return true; // Erreur 401 déjà envoyée par requireAuth

      // Endpoints protégés
      if (method === 'POST' && path === '/logout') {
        this.handleLogout(session.token, res);
      } else if (method === 'GET' && path === '/status') {
        this.sendJSON(res, this.getStatus());
      } else if (method === 'GET' && path === '/sessions') {
        this.sendJSON(res, this.getSessions());
      } else if (method === 'GET' && path.startsWith('/sessions/')) {
        const id = path.slice('/sessions/'.length);
        this.sendJSON(res, this.getSession(id));
      } else if (method === 'DELETE' && path.startsWith('/sessions/')) {
        const id = path.slice('/sessions/'.length);
        this.deleteSession(id, res);
        return true;
      } else if (method === 'GET' && path === '/tools') {
        this.sendJSON(res, this.getTools());
      } else if (method === 'GET' && path === '/metrics') {
        this.sendJSON(res, this.getMetrics());
      } else if (method === 'GET' && path === '/lines') {
        this.sendJSON(res, this.getLines());
      } else if (method === 'GET' && path.startsWith('/lines/')) {
        const apiKey = decodeURIComponent(path.slice('/lines/'.length));
        this.sendJSON(res, this.getLinesByApiKey(apiKey));
      } else if (method === 'GET' && path === '/client/keys') {
        this.handleGetClientKeys(res);
      } else if (method === 'POST' && path === '/client/keys') {
        this.handleAddClientKey(req, res);
        return true;
      } else if (method === 'DELETE' && path.startsWith('/client/keys/')) {
        const key = decodeURIComponent(path.slice('/client/keys/'.length));
        this.handleDeleteClientKey(key, res);
        return true;
      } else if (method === 'GET' && path === '/prompts') {
        this.sendJSON(res, this.getPrompts());
      } else if (method === 'GET' && path.startsWith('/prompts/')) {
        const apiKey = decodeURIComponent(path.slice('/prompts/'.length));
        this.sendJSON(res, this.getPromptByApiKey(apiKey));
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
  private handleLogin(req: IncomingMessage, res: ServerResponse): void {
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
          message: 'Login réussi. Utilisez ce token dans le header Authorization: Bearer <token>'
        });
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

  private getStatus() {
    const { sessions, pool, toolRouter, startedAt } = this.deps;
    return {
      uptime: Date.now() - startedAt,
      version: '0.1.0',
      activeSessions: sessions.size,
      activeConnections: pool.size,
      serverTools: toolRouter.getServerToolNames(),
      pendingToolCalls: toolRouter.pendingCount,
    };
  }

  private getSessions() {
    const sessions = this.deps.sessions.getAll();
    return {
      sessions: sessions.map(s => ({
        id: s.id,
        apiKey: this.maskApiKey(s.apiKey),
        state: s.state,
        createdAt: s.createdAt,
        lastActivityAt: s.lastActivityAt,
        messageCount: s.conversation.getMessages().length,
        toolCallCount: s.graph.getMetrics().totalToolCalls,
        currentUrl: s.context.url || null,
      })),
    };
  }

  private getSession(id: string) {
    const session = this.deps.sessions.get(id);
    if (!session) {
      return { error: 'Session not found' };
    }

    return {
      id: session.id,
      state: session.state,
      conversation: session.conversation.getMessages(),
      tools: session.toolRegistry.getDeclarations().map(t => ({
        name: t.name,
        description: t.description,
      })),
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

    await this.deps.sessions.destroy(id);
    this.deps.pool.unregister(session.connId);
    this.sendJSON(res, { ok: true, deleted: id });
  }

  private getTools() {
    const serverTools = this.deps.toolRouter.getServerToolNames();
    const clientTools: Record<string, { name: string; description: string; parameters?: unknown; risk?: string }[]> = {};

    for (const session of this.deps.sessions.getAll()) {
      const tools = session.toolRegistry.getDeclarations();
      if (tools.length > 0) {
        clientTools[session.id] = tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
          risk: t.risk,
        }));
      }
    }

    return { serverTools, clientTools };
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

    const keys = this.deps.clientAuth.getKeys();
    this.sendJSON(res, {
      keys: keys.map(k => ({
        key: k,
        masked: this.maskApiKey(k),
      })),
      total: keys.length,
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
        const { apiKey } = JSON.parse(body || '{}');
        if (!apiKey) {
          this.sendJSON(res, { error: 'apiKey requis dans le body' }, 400);
          return;
        }
        this.deps.clientAuth.addKeys(apiKey);
        this.sendJSON(res, { success: true, apiKey: this.maskApiKey(apiKey) });
      } catch {
        this.sendJSON(res, { error: 'Body JSON invalide' }, 400);
      }
    });
  }

  private handleDeleteClientKey(key: string, res: ServerResponse): void {
    if (!this.enableClientKeyManagement) {
      this.sendJSON(res, { 
        error: 'Client key management disabled' 
      }, 403);
      return;
    }

    const removed = this.deps.clientAuth.removeKey(key);
    if (removed) {
      this.sendJSON(res, { success: true, deleted: this.maskApiKey(key) });
    } else {
      this.sendJSON(res, { error: 'API key non trouvée' }, 404);
    }
  }

  private getPrompts() {
    const map = this.deps.promptOverrides;
    if (!map) return { prompts: [] };

    const prompts: Array<{ apiKey: string; prompt: SystemPrompt }> = [];
    for (const [apiKey, prompt] of map) {
      prompts.push({ apiKey, prompt });
    }
    return { prompts };
  }

  private getPromptByApiKey(apiKey: string) {
    const map = this.deps.promptOverrides;
    if (!map) return { error: 'Prompts non disponibles' };

    const prompt = map.get(apiKey);
    if (!prompt) return { apiKey, prompt: null };
    return { apiKey, prompt };
  }

  private handleSetPrompt(req: IncomingMessage, res: ServerResponse): void {
    const map = this.deps.promptOverrides;
    if (!map) {
      this.sendJSON(res, { error: 'Prompts non disponibles' }, 400);
      return;
    }

    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { apiKey, prompt } = JSON.parse(body || '{}');
        if (!apiKey) {
          this.sendJSON(res, { error: 'apiKey requis' }, 400);
          return;
        }
        if (!prompt) {
          this.sendJSON(res, { error: 'prompt requis' }, 400);
          return;
        }

        // prompt peut etre un string ou un SystemPromptConfig
        map.set(apiKey, prompt);
        this.sendJSON(res, { success: true, apiKey });
      } catch {
        this.sendJSON(res, { error: 'Body JSON invalide' }, 400);
      }
    });
  }

  private handleDeletePrompt(apiKey: string, res: ServerResponse): void {
    const map = this.deps.promptOverrides;
    if (!map) {
      this.sendJSON(res, { error: 'Prompts non disponibles' }, 400);
      return;
    }

    const deleted = map.delete(apiKey);
    if (deleted) {
      this.sendJSON(res, { success: true, deleted: apiKey });
    } else {
      this.sendJSON(res, { error: 'Aucun override pour cette API key' }, 404);
    }
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
        const { apiKey } = JSON.parse(body || '{}');
        if (!apiKey) {
          this.sendJSON(res, { error: 'apiKey requis dans le body' }, 400);
          return;
        }
        const result = this.deps.virtualLines!.acquire(apiKey);
        this.sendJSON(res, result, result.success ? 200 : 503);
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
        this.sendJSON(res, { success: released }, released ? 200 : 404);
      } catch {
        this.sendJSON(res, { error: 'Body JSON invalide' }, 400);
      }
    });
  }

  private getLines() {
    if (!this.deps.virtualLines) {
      return { pools: [], enabled: false };
    }
    return { pools: this.deps.virtualLines.getAllPools(), enabled: true };
  }

  private getLinesByApiKey(apiKey: string) {
    if (!this.deps.virtualLines) {
      return { error: 'Virtual lines non activees' };
    }
    const status = this.deps.virtualLines.getPoolStatus(apiKey);
    if (!status) {
      return { error: 'Aucun pool pour cette API key' };
    }
    return status;
  }

  // ============================================================
  // Helpers
  // ============================================================

  private sendJSON(res: ServerResponse, data: unknown, status: number = 200): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  private maskApiKey(key: string): string {
    if (key.length <= 8) return '***';
    return key.slice(0, 3) + '***' + key.slice(-3);
  }
}
