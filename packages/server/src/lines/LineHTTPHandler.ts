import type { IncomingMessage, ServerResponse } from 'http';
import type { VirtualLineManager } from './VirtualLineManager.js';
import { createLogger } from '@domos/core';

const log = createLogger('DomOS:LineHTTP');

/**
 * LineHTTPHandler — Handler HTTP pour les routes client des virtual lines.
 *
 * Endpoints :
 * - POST /lines/acquire?apiKey=pk_xxx  — Acquerir une ligne
 * - POST /lines/release               — Liberer une ligne (body: { token })
 */
export class LineHTTPHandler {
  constructor(private lineManager: VirtualLineManager) {}

  /**
   * Gerer une requete HTTP entrante.
   * @returns true si la requete a ete geree, false sinon.
   */
  handleRequest(req: IncomingMessage, res: ServerResponse): boolean {
    const url = req.url || '';
    if (!url.startsWith('/lines')) return false;

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return true;
    }

    // Extraire le path sans query string
    const [path] = url.split('?');
    const method = req.method || 'GET';

    try {
      if (method === 'POST' && path === '/lines/acquire') {
        this.handleAcquire(req, res);
      } else if (method === 'POST' && path === '/lines/release') {
        this.handleRelease(req, res);
      } else if (method === 'GET' && path === '/lines/status') {
        this.handleStatus(req, res);
      } else {
        this.sendJSON(res, { error: 'Not Found' }, 404);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.sendJSON(res, { error: message }, 500);
    }

    return true;
  }

  /**
   * POST /lines/acquire?apiKey=pk_xxx
   */
  private handleAcquire(req: IncomingMessage, res: ServerResponse): void {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const apiKey = url.searchParams.get('apiKey');

    if (!apiKey) {
      this.sendJSON(res, { error: 'apiKey requis en query param' }, 400);
      return;
    }

    if (!this.lineManager.hasPool(apiKey)) {
      this.sendJSON(res, { error: 'Aucun pool configure pour cette API key' }, 404);
      return;
    }

    const result = this.lineManager.acquire(apiKey);

    if (result.success) {
      this.sendJSON(res, {
        success: true,
        lineNumber: result.lineNumber,
        token: result.token,
        waiting: result.waiting || false,
      });
    } else {
      this.sendJSON(res, {
        success: false,
        error: result.error,
      }, 503);
    }
  }

  /**
   * GET /lines/status?token=xxx
   * Retourne l'etat du token : waiting / ready / expired.
   * Utilise par le client pour detecter quand sa ligne d'attente est promue.
   */
  private handleStatus(req: IncomingMessage, res: ServerResponse): void {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const token = url.searchParams.get('token');

    if (!token) {
      this.sendJSON(res, { error: 'token requis en query param' }, 400);
      return;
    }

    const state = this.lineManager.getTokenState(token);
    this.sendJSON(res, { state });
  }

  /**
   * POST /lines/release — body: { token }
   */
  private handleRelease(req: IncomingMessage, res: ServerResponse): void {
    let body = '';

    req.on('data', (chunk: Buffer | string) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        const token = parsed?.token;

        if (!token) {
          this.sendJSON(res, { error: 'token requis dans le body' }, 400);
          return;
        }

        const released = this.lineManager.release(token);

        if (released) {
          this.sendJSON(res, { success: true });
        } else {
          this.sendJSON(res, { success: false, error: 'Token invalide ou deja libere' }, 404);
        }
      } catch {
        this.sendJSON(res, { error: 'Body JSON invalide' }, 400);
      }
    });
  }

  // ============================================================
  // Helpers
  // ============================================================

  private sendJSON(res: ServerResponse, data: unknown, status: number = 200): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }
}
