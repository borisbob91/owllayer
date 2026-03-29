// @ts-nocheck — fastify and fastify-plugin are peerDependencies; not installed in this package
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { DomOSServer } from '../../core/DomOSServer.js';
import type { DomOSServerOptions } from '../../core/DomOSServer.js';

export type DomOSFastifyPluginOptions = DomOSServerOptions;

/**
 * Plugin Fastify pour DomOS.
 *
 * Enregistre un serveur DomOS dans une application Fastify existante.
 * Le serveur DomOS gère son propre handler WebSocket + HTTP admin.
 * Le cycle de vie (démarrage/arrêt) est lié à celui de Fastify.
 *
 * @example
 * ```ts
 * import Fastify from 'fastify';
 * import { domosPlugin } from '@domos/server/adapters/fastify';
 *
 * const app = Fastify({ logger: true });
 * await app.register(domosPlugin, { llm, port: 3000 });
 * await app.listen({ port: 3000 });
 * ```
 */
const domosPluginFn: FastifyPluginAsync<DomOSFastifyPluginOptions> = async (fastify, options) => {
  const domos = new DomOSServer(options);

  // Décorer l'instance Fastify avec le serveur DomOS
  fastify.decorate('domos', domos);

  // Démarrer le serveur DomOS au même moment que Fastify
  fastify.addHook('onReady', async () => {
    domos.listen();
  });

  // Arrêt propre lors du shutdown Fastify
  fastify.addHook('onClose', async () => {
    domos.stop();
  });

  fastify.log.info(`[DomOS] Plugin Fastify enregistré (path: ${(options as any).path ?? '/domos'})`);
};

export const domosPlugin = fp(domosPluginFn, {
  name: 'domos',
  fastify: '>=4.0.0',
});

// Type augmentation — accessible via fastify.domos
declare module 'fastify' {
  interface FastifyInstance {
    domos: DomOSServer;
  }
}
