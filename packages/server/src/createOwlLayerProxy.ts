import type { Server as HttpServer } from 'http';
import { OwlLayerServer, type OwlLayerServerOptions } from './core/OwlLayerServer.js';
import type { LLMAdapter } from './llm/types.js';
import type { TransportType } from './transport/Transport.js';

/**
 * Options simplifiees pour createOwlLayerProxy.
 */
export interface OwlLayerProxyOptions {
  /** Adaptateur LLM — instance de LLMAdapter (GoogleAdapter, etc.) */
  llm: LLMAdapter;

  /** Adaptateur Live Audio — instance de LiveAdapter (optionnel) */
  live?: OwlLayerServerOptions['live'];

  /** Port du serveur (defaut: 3000) */
  port?: number;

  /** Path WebSocket (defaut: '/owllayer') */
  path?: string;

  /** Serveur HTTP existant (optionnel) */
  server?: HttpServer;

  /** Transport a utiliser (defaut: 'websocket') */
  transport?: TransportType;

  /** Configuration securite */
  security?: {
    /** API keys autorisees */
    apiKeys?: string[];
    /** Origines autorisees (CORS) */
    allowedOrigins?: string[];
  };

  /** Timeout des tools en ms (defaut: 10000) */
  toolTimeout?: number;

  /** Max messages en memoire par session (defaut: 50) */
  maxConversationMessages?: number;
}

/**
 * Creer un serveur OwlLayer preconfigure en une seule ligne.
 *
 * @example
 * ```ts
 * import { createOwlLayerProxy } from '@owllayer/server';
 * import { GoogleAdapter } from '@owllayer/adapter-google';
 *
 * const server = createOwlLayerProxy({
 *   llm: new GoogleAdapter({
 *     model: 'gemini-2.0-flash',
 *     apiKey: process.env.GOOGLE_API_KEY!,
 *     systemPrompt: 'Tu es un assistant shopping.',
 *   }),
 *   port: 3000,
 *   security: {
 *     apiKeys: ['pk_live_xxx'],
 *   },
 * });
 *
 * server.listen();
 * ```
 */
export function createOwlLayerProxy(options: OwlLayerProxyOptions): OwlLayerServer {
  const server = new OwlLayerServer({
    llm: options.llm,
    live: options.live,
    server: options.server,
    port: options.port || 3000,
    path: options.path || '/owllayer',
    transport: options.transport || 'websocket',
    allowedOrigins: options.security?.allowedOrigins,
    toolTimeout: options.toolTimeout,
    maxConversationMessages: options.maxConversationMessages,
  });

  // Ajouter les API keys
  if (options.security?.apiKeys) {
    for (const key of options.security.apiKeys) {
      server.addApiKey(key);
    }
  }

  return server;
}
