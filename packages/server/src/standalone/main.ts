import 'dotenv/config';
import { createDomOSServer } from './createDomOSServer.js';
import { createLogger } from './logger.js';

async function main() {
  const logger = createLogger();

  try {
    const app = await createDomOSServer();

    app.listen(() => {
      logger.info('');
      logger.info('╔══════════════════════════════════════════════════════╗');
      logger.info('║           DomOS Server — Ready                      ║');
      logger.info('╠══════════════════════════════════════════════════════╣');
      logger.info(`║  WebSocket   → ws://localhost:${app.port}${app.config.path}`);
      logger.info(`║  Dashboard   → http://localhost:${app.port}/_domos/panel`);
      logger.info(`║  Admin API   → http://localhost:${app.port}${app.config.admin.path}`);
      logger.info(`║  Health      → http://localhost:${app.port}/health`);
      logger.info(`║  Mode        → ${app.config.mode}`);
      logger.info('╚══════════════════════════════════════════════════════╝');
      logger.info('');
    });

    const shutdown = async (signal: string) => {
      logger.info(`Signal ${signal} reçu — arrêt en cours...`);
      await app.close();
      logger.info('Serveur arrêté proprement.');
      process.exit(0);
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGUSR2', () => void shutdown('SIGUSR2'));
  } catch (err) {
    const logger2 = createLogger();
    logger2.error('Échec au démarrage', { err: String(err) });
    process.exit(1);
  }
}

main();

