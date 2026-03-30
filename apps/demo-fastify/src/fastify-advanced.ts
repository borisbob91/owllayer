// Exemple avancé : Fastify avec DomOS + routes custom + middleware

import 'dotenv/config';
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import { domosPlugin } from '@domos/server/adapters/fastify';
import { GoogleAdapter } from '@domos/adapter-google';

async function main() {
  const app = Fastify({ logger: true });

  // 1. Plugins de sécurité Fastify
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", 'ws:', 'wss:'],
      }
    }
  });

  await app.register(fastifyCors, {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  });

  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // 2. LLM Adapter
  const llm = new GoogleAdapter({
    apiKey: process.env.GOOGLE_API_KEY || 'dummy-key',
    model: 'gemini-2.0-flash',
  });

  // 3. DomOS Plugin
  await app.register(domosPlugin, {
    llm,
    port: 3000,
    path: '/domos',
    admin: {
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'changeme',
    },
    rateLimit: {
      disabled: false,
      burstLimit: 10,
      burstWindowMs: 1000,
      maxRequests: 100,
      windowMs: 60000,
    },
  });

  // 4. Routes API custom
  app.get('/api/status', async () => {
    return {
      server: 'fastify',
      domos: 'active',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  });

  app.post('/api/analytics', async (request, reply) => {
    // Endpoint custom pour analytics
    const { event, data } = request.body as any;
    console.log('[Analytics]', event, data);
    return { received: true };
  });

  // 5. Hook global pour logger toutes les requêtes
  app.addHook('onRequest', async (request) => {
    request.log.info({ url: request.url, method: request.method }, 'incoming request');
  });

  // 6. Démarrer
  const port = Number(process.env.PORT) || 3000;
  await app.listen({ port, host: '0.0.0.0' });

  console.log(`✅ Fastify + DomOS running on http://localhost:${port}`);
}

main().catch(console.error);
