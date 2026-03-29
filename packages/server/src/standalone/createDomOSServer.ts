import { DomOSServer } from '../core/DomOSServer.js';
import { loadConfig } from './config/loader.js';
import { buildAdapters } from './adapters/factory.js';
import { loadPluginsFromConfig } from './plugins/pluginLoader.js';
import { getHealthStatus } from './health.js';
import type { DomOSConfig } from './config/types.js';

export interface StandaloneServer {
  server: DomOSServer;
  config: DomOSConfig;
  listen: (callback?: () => void) => void;
  close: () => Promise<void>;
  readonly port: number;
}

export async function createDomOSServer(configPath?: string): Promise<StandaloneServer> {
  const config = loadConfig(configPath);
  const { llm, live, stt, tts } = await buildAdapters(config);

  const server = new DomOSServer({
    llm,
    live,
    stt,
    tts,
    port: config.port,
    path: config.path,
    admin: {
      username: config.admin.username,
      password: config.admin.password ?? process.env.ADMIN_PASSWORD ?? '',
      path: config.admin.path,
    },
    client: {
      requireApiKey: config.client.requireApiKey,
      enableApiKeyManagement: config.client.enableApiKeyManagement,
      maxConnectionsPerKey: config.client.maxConnectionsPerKey,
    },
    rateLimit: {
      disabled: config.rateLimit.disabled,
      burstLimit: config.rateLimit.burstLimit,
      burstWindowMs: config.rateLimit.burstWindowMs,
      burstCloseAfter: config.rateLimit.burstCloseAfter,
      maxRequests: config.rateLimit.maxRequests,
      windowMs: config.rateLimit.windowMs,
    },
    ui: config.ui,
    virtualLines: config.virtualLines,
    extraHttpHandler: (req, res) => {
      if (req.url === '/health' && req.method === 'GET') {
        const health = getHealthStatus(server);
        const statusCode = health.status === 'unhealthy' ? 503 : 200;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health));
        return true;
      }
      return false;
    },
  });

  // Enregistrer les clés API depuis la config
  if (config.apiKeys) {
    for (const entry of config.apiKeys) {
      server.addApiKey(entry.key);
      if (entry.prompt) {
        server.setPromptOverride(entry.key, entry.prompt);
      }
    }
  }

  // Charger les plugins déclarés dans la config YAML
  await loadPluginsFromConfig(server, config.plugins);

  return {
    server,
    config,
    port: config.port,
    listen(callback?: () => void) {
      server.listen(callback);
    },
    async close() {
      server.stop();
    },
  };
}
