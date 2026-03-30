// Exemple simple d'utilisation du FastifyAdapter avec DomOS
// Ce fichier montre comment intégrer DomOS dans une app Fastify existante

import 'dotenv/config';
import Fastify from 'fastify';
import { domosPlugin } from '@domos/server/adapters/fastify';
import { GoogleAdapter } from '@domos/adapter-google';

async function main() {
  // Créer l'app Fastify
  const app = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    }
  });

  // Adapter LLM (exemple avec Google Gemini)
  const llm = new GoogleAdapter({
    apiKey: process.env.GOOGLE_API_KEY || '',
    model: 'gemini-2.0-flash',
  });

  // Enregistrer le plugin DomOS
  await app.register(domosPlugin, {
    llm,
    port: 3000,
    path: '/domos',
    admin: {
      username: 'admin',
      password: process.env.ADMIN_PASSWORD || 'changeme',
    },
  });

  // Ajouter des routes Fastify custom
  app.get('/api/health', async () => {
    return {
      status: 'ok',
      timestamp: Date.now(),
      domos: {
        connected: app.domos ? 'active' : 'inactive'
      }
    };
  });

  app.get('/api/ping', async () => {
    return { pong: Date.now() };
  });

  // Démarrer le serveur
  const port = 3000;
  await app.listen({ port, host: '0.0.0.0' });

  console.log(`
╔═══════════════════════════════════════════════════════╗
║  🚀 Fastify + DomOS Server started                    ║
║                                                       ║
║  HTTP Routes:                                         ║
║    GET  http://localhost:${port}/api/health            ║
║    GET  http://localhost:${port}/api/ping              ║
║                                                       ║
║  DomOS WebSocket:                                     ║
║    ws://localhost:${port}/domos                        ║
║                                                       ║
║  Admin Dashboard:                                     ║
║    http://localhost:${port}/_domos/panel               ║
╚═══════════════════════════════════════════════════════╝
  `);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
