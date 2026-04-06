import { DomOSServer } from '../core/DomOSServer.js';
import { loadConfig } from './config/loader.js';
import { buildAdapters } from './adapters/factory.js';
import { loadPluginsFromConfig } from './plugins/pluginLoader.js';
import { getHealthStatus } from './health.js';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { JWTAuthService } from './cloud/auth/JWTAuthService.js';
import { QuotaService } from './cloud/billing/QuotaService.js';
import { StripeService } from './cloud/billing/StripeService.js';
import { AnalyticsService } from './cloud/analytics/AnalyticsService.js';
import { AuditService } from './cloud/audit/AuditService.js';
import { ShopifyConnector } from './cloud/stores/ShopifyConnector.js';
import { WooCommerceConnector } from './cloud/stores/WooCommerceConnector.js';
import { createCloudRouter } from './cloud/routes/index.js';
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

  // ── Cloud Pro mode init ──
  let cloudRouter: ((req: import('http').IncomingMessage, res: import('http').ServerResponse) => Promise<boolean>) | null = null;
  let prismaInstance: PrismaClient | null = null;
  let redisInstance: ReturnType<typeof createClient> | null = null;

  if (config.mode === 'cloud' && config.cloud) {
    const cloud = config.cloud;

    const pgPool = new Pool({ connectionString: cloud.database.url });
    const pgAdapter = new PrismaPg(pgPool);
    prismaInstance = new PrismaClient({ adapter: pgAdapter });
    await prismaInstance.$connect();

    redisInstance = createClient({ url: cloud.redis.url });
    await redisInstance.connect();

    const jwtAuth = new JWTAuthService(cloud.jwt);
    const analytics = new AnalyticsService(prismaInstance);
    const audit = new AuditService(prismaInstance);
    const quotas = new QuotaService(prismaInstance, cloud.billing?.plans ?? []);
    void quotas; // available for future session hooks

    const stripe = cloud.billing
      ? new StripeService(cloud.billing, prismaInstance, cloud.billing.plans)
      : null;

    const shopify = cloud.storeConnect?.shopify
      ? new ShopifyConnector(cloud.storeConnect.shopify)
      : null;

    const woo = cloud.storeConnect?.woocommerce
      ? new WooCommerceConnector(cloud.storeConnect.woocommerce)
      : null;

    cloudRouter = createCloudRouter({ prisma: prismaInstance, jwt: jwtAuth, stripe, analytics, audit, shopify, woo });
  }

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
      // Health check (sync)
      if (req.url === '/health' && req.method === 'GET') {
        const health = getHealthStatus(server);
        const statusCode = health.status === 'unhealthy' ? 503 : 200;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health));
        return true;
      }
      // Cloud REST API (async, fire-and-forget with error handling already in router)
      if (cloudRouter && req.url?.startsWith('/api/')) {
        cloudRouter(req, res).catch(() => {
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
          }
        });
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
      if (prismaInstance) await prismaInstance.$disconnect();
      if (redisInstance) await redisInstance.quit();
    },
  };
}
