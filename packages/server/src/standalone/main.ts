import 'dotenv/config';
import { createDomOSServer } from './createDomOSServer.js';

async function main() {
  try {
    const app = await createDomOSServer();

    app.listen(() => {
      console.log('');
      console.log('╔══════════════════════════════════════════════════════╗');
      console.log('║           DomOS Server — Ready                      ║');
      console.log('╠══════════════════════════════════════════════════════╣');
      console.log(`║  WebSocket   → ws://localhost:${app.port}${app.config.path}`);
      console.log(`║  Dashboard   → http://localhost:${app.port}/_domos/panel`);
      console.log(`║  Admin API   → http://localhost:${app.port}${app.config.admin.path}`);
      console.log(`║  Mode        → ${app.config.mode}`);
      console.log('╚══════════════════════════════════════════════════════╝');
      console.log('');
    });

    const shutdown = async () => {
      console.log('\n[DomOS] Arrêt en cours...');
      await app.close();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('[DomOS] ❌ Échec au démarrage :', err);
    process.exit(1);
  }
}

main();
