import { existsSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import type { IncomingMessage, ServerResponse } from 'http';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '@owllayer/core';

const log = createLogger('OwlLayer:DashboardUI');

const require = createRequire(import.meta.url);

type ImportMetaResolver = ImportMeta & {
  resolve?: (specifier: string) => string;
};

function findInstalledUiAsset(relativePath: string): string | null {
  const searchRoots = [dirname(fileURLToPath(import.meta.url)), process.cwd()];

  for (const startDir of searchRoots) {
    let currentDir = startDir;

    while (true) {
      const candidateOwllayer = join(currentDir, 'node_modules', '@owllayer', 'ui', 'dist', relativePath);
      if (existsSync(candidateOwllayer)) {
        return candidateOwllayer;
      }

      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }

      currentDir = parentDir;
    }
  }

  return null;
}

function normalizeResolvedAssetPath(resolved: string): string {
  if (resolved.startsWith('file://')) {
    return fileURLToPath(resolved);
  }

  if (resolved.startsWith('/@fs/')) {
    return resolved.slice('/@fs/'.length);
  }

  return resolved;
}

function resolveExportedAsset(specifier: string): string | null {
  const resolver = (import.meta as ImportMetaResolver).resolve;

  if (typeof resolver === 'function') {
    try {
      return normalizeResolvedAssetPath(resolver(specifier));
    } catch {
      // Fallback plus bas
    }
  }

  try {
    return require.resolve(specifier);
  } catch {
    return null;
  }
}

export interface DashboardUIHandlerOptions {
  /** Path HTTP sans slash final (ex: '/owllayer-ui') */
  path: string;
  /** URL de l'API admin à passer au dashboard (ex: 'http://localhost:3000') */
  serverUrl?: string;
  /** Langue du dashboard ('en' ou 'fr', défaut: 'en') */
  language?: 'en' | 'fr';
}

function resolveBundlePath(): string | null {
  return resolveExportedAsset('@owllayer/ui/dashboard') ?? resolveExportedAsset('@owllayer/ui/dashboard') ?? findInstalledUiAsset('dashboard.esm.js');
}

function resolveMapPath(): string | null {
  const bundlePath = resolveBundlePath();
  if (!bundlePath) return null;

  const mapPath = `${bundlePath}.map`;
  return existsSync(mapPath) ? mapPath : null;
}

/**
 * DashboardUIHandler — Sert les assets du dashboard @owllayer/ui embarqué.
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
  private readonly language: 'en' | 'fr';
  private bundlePath: string | null;
  private mapPath: string | null;

  constructor(options: DashboardUIHandlerOptions) {
    this.basePath = options.path.replace(/\/$/, '');
    this.serverUrl = options.serverUrl ?? '';
    this.language = options.language ?? 'en';
    this.bundlePath = resolveBundlePath();
    this.mapPath = resolveMapPath();

    if (!this.bundlePath) {
      log.warn('@owllayer/ui is not installed or its bundle was not found. Dashboard will be unavailable.');
    } else {
      log.info(`Dashboard UI ready — assets from ${this.bundlePath}`);
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
    // serverUrl et language injectés dans la config initiale du dashboard
    const configScript = `
  <script>
    window.__OWLLAYER_SERVER_URL__ = ${JSON.stringify(this.serverUrl)};
    window.__OWLLAYER_LANGUAGE__ = ${JSON.stringify(this.language)};
  </script>`;

    const html = `<!DOCTYPE html>
<html lang="${this.language}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OwlLayer Dashboard</title>
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
    const serverUrl = window.__OWLLAYER_SERVER_URL__ || (location.origin);
    const language = window.__OWLLAYER_LANGUAGE__ || 'en';
    mountDashboard(document.getElementById('app'), { serverUrl, language });
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
      res.end(JSON.stringify({ error: '@owllayer/ui bundle not found' }));
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
      log.error('Erreur lecture bundle @owllayer/ui :', String(err));
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
