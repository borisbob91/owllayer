import type { Application } from 'express';
import { DomOSServer } from '../../core/DomOSServer.js';
import type { DomOSServerOptions } from '../../core/DomOSServer.js';

/**
 * Attache DomOS à une application Express existante.
 *
 * Le serveur DomOS gère son propre WebSocket server et HTTP admin.
 * Express continue de gérer ses propres routes.
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { attachDomOS } from '@domos/server/adapters/express';
 *
 * const app = express();
 * const domos = attachDomOS(app, { llm, port: 3000 });
 *
 * app.listen(8080, () => console.log('Express started'));
 * domos.listen(() => console.log('DomOS started'));
 *
 * // Arrêt propre
 * process.on('SIGTERM', async () => {
 *   await domos.close();
 *   process.exit(0);
 * });
 * ```
 *
 * @note Express est une peerDependency — pas installé dans @domos/server.
 */
export function attachDomOS(_app: Application, options: DomOSServerOptions): DomOSServer {
  return new DomOSServer(options);
}
