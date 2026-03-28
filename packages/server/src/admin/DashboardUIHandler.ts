import { readFileSync } from 'fs';
import { createRequire } from 'module';
import type { IncomingMessage, ServerResponse } from 'http';
import { createLogger } from '@domos/core';

const log = createLogger('DomOS:DashboardUI');

const require = createRequire(import.meta.url);

export interface DashboardUIHandlerOptions {
  /** Path HTTP sans slash final (ex: '/domos-ui') */
  path: string;
  /** URL de l'API admin à passer au dashboard (ex: 'http://localhost:3000') */
  serverUrl?: string;
}

function resolveBundlePath(): string | null {
  try {
    // Résoudre depuis le package @domos/ui installé
    return require.resolve('@domos/ui/dist/dashboard.esm.js');
  } catch {
    return null;
  }
}

function resolveMapPath(): string | null {
  try {
    return require.resolve('@domos/ui/dist/dashboard.esm.js.map');
  } catch {
    return null;
  }
}

/**
 * DashboardUIHandler — Sert les assets du dashboard @domos/ui embarqué.
 *
 * Pattern identique à AdminAPI.handleRequest() :
 * retourne true si la requête a été gérée, false sinon.
 *
 * Endpoints :
 *   GET {path}              → HTML shell SPA
 *   GET {path}/bundle.js    → bundle Preact (dashboard.esm.js)
 *   GET {path}/bundle.js.map → sourcemap (si disponible)
 *   GET {path}/*            → redirect vers {path} (hash routing SPA)
 */
export class DashboardUIHandler {
  private readonly basePath: string;
  private readonly serverUrl: string;
  private bundlePath: string | null;
  private mapPath: string | null;

  constructor(options: DashboardUIHandlerOptions) {
    this.basePath = options.path.replace(/\/$/, '');
    this.serverUrl = options.serverUrl ?? '';
    this.bundlePath = resolveBundlePath();
    this.mapPath = resolveMapPath();

    if (!this.bundlePath) {
      log.warn('@domos/ui n\'est pas installé ou son bundle est introuvable. Le dashboard sera indisponible.');
    } else {
      log.info(`Dashboard UI prêt — assets depuis ${this.bundlePath}`);
    }
  }

  /**
   * Gère une requête HTTP entrante.
   * @returns true si la requête a été gérée, false sinon.
   */
  handleRequest(req: IncomingMessage, res: ServerResponse): boolean {
    const url = (req.url ?? '').split('?')[0];

    if (!url.startsWith(this.basePath)) return false;

    const subPath = url.slice(this.basePath.length) || '/';

    // Bundle JS
    if (subPath === '/bundle.js') {
      this.serveBundleJs(res);
      return true;
    }

    // Sourcemap
    if (subPath === '/bundle.js.map') {
      this.serveSourceMap(res);
      return true;
    }

    // Root ou toute sous-route → HTML shell (SPA hash routing)
    if (subPath === '/' || subPath === '' || subPath.startsWith('/')) {
      this.serveShell(req, res);
      return true;
    }

    return false;
  }

  // ────────────────────────────────────────────────────────────
  // Private
  // ────────────────────────────────────────────────────────────

  private serveShell(_req: IncomingMessage, res: ServerResponse): void {
    const bundleUrl = `${this.basePath}/bundle.js`;
    // serverUrl injecté dans la config initiale du dashboard
    const configScript = this.serverUrl
      ? `<script>window.__DOMOS_SERVER_URL__ = ${JSON.stringify(this.serverUrl)};</script>`
      : '';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DomOS Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #app { height: 100%; background: #0f0f13; }
  </style>
  ${configScript}
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { mountDashboard } from '${bundleUrl}';
    const serverUrl = window.__DOMOS_SERVER_URL__ ?? (location.origin);
    mountDashboard(document.getElementById('app'), { serverUrl });
  </script>
</body>
</html>`;

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(html);
  }

  private serveBundleJs(res: ServerResponse): void {
    if (!this.bundlePath) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '@domos/ui bundle not found' }));
      return;
    }

    try {
      const content = readFileSync(this.bundlePath);
      const headers: Record<string, string> = {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      };
      if (this.mapPath) {
        headers['SourceMap'] = `${this.basePath}/bundle.js.map`;
      }
      res.writeHead(200, headers);
      res.end(content);
    } catch (err) {
      log.error('Erreur lecture bundle @domos/ui :', String(err));
      res.writeHead(500);
      res.end();
    }
  }

  private serveSourceMap(res: ServerResponse): void {
    if (!this.mapPath) {
      res.writeHead(404);
      res.end();
      return;
    }

    try {
      const content = readFileSync(this.mapPath);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end();
    }
  }
}
