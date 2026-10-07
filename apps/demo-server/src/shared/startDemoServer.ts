import { createServer } from 'http';
import { OwlLayerServer } from '@owllayer/server';
import { createLogger, type LLMAdapter, type LiveAdapter, type STTService, type TTSService } from '@owllayer/core';
import {
  createLiveKitTokenRequestHandler,
  readLiveKitAllowedOrigins,
} from '../livekitTokenEndpoint.js';
import { demoLanguage } from './env.js';

const log = createLogger('Demo:Server');

/** What a provider server brings: the text LLM and its voice slots. */
export interface DemoRuntime {
  /** Shown in the logs and the banner, e.g. "google" or "deepgram (realtime) + deepseek". */
  label: string;
  llm: LLMAdapter;
  live?: LiveAdapter;
  stt?: STTService;
  tts?: TTSService;
}

const LIVEKIT_TOKEN_PATH = '/owllayer/livekit/token';

/**
 * Starts the OwlLayer demo server with the given adapters: client API keys of the demo apps,
 * admin and dashboard, server tools, LiveKit token endpoint, banner and graceful shutdown.
 * Shared by every provider server so that only the adapters differ between them.
 */
export function startDemoServer(runtime: DemoRuntime): OwlLayerServer {
  const { language, i18n } = demoLanguage();
  const PORT = parseInt(process.env.OWLLAYER_PORT || process.env.PORT || '4001', 10);

  const OWLLAYER_API_KEY = process.env.OWLLAYER_API_KEY || 'pk_demo_local';
  const OWLLAYER_ADMIN_API_KEY = process.env.OWLLAYER_ADMIN_API_KEY || 'pk_78ab37_vue_admin';
  const OWLLAYER_TRAVEL_API_KEY = process.env.OWLLAYER_TRAVEL_API_KEY || process.env.OWLLAYER_HOME_API_KEY || 'pk_78ab37_svelte_travel';
  const OWLLAYER_ANGULAR_API_KEY = process.env.OWLLAYER_ANGULAR_API_KEY || 'pk_78ab37_angular_marketplace';
  const OWLLAYER_BROWSER_API_KEY = process.env.OWLLAYER_BROWSER_API_KEY || 'pk_browser_demo';
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
  // Pas de mot de passe par defaut : sans ADMIN_PASSWORD, l'admin et le dashboard sont desactives
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const ADMIN_EXPOSE_API_KEYS = process.env.ADMIN_EXPOSE_API_KEYS !== 'false';
  const REQUIRE_API_KEY = process.env.OWLLAYER_REQUIRE_API_KEY !== 'false';
  const ENABLE_VIRTUAL_LINES = process.env.OWLLAYER_ENABLE_VIRTUAL_LINES === 'true';
  const LIVEKIT_ALLOWED_ORIGINS = readLiveKitAllowedOrigins(process.env.OWLLAYER_LIVEKIT_ALLOWED_ORIGINS);
  const httpServer = createServer();

  const { llm, live, stt, tts } = runtime;
  log.info(`Provider: ${runtime.label} — text: ${llm.name}${live ? `, live: ${live.name}` : ''}${stt && tts ? `, speech: ${stt.name} + ${tts.name}` : ''}`);

  const server = new OwlLayerServer({
    llm,
    live,
    stt,
    tts,
    port: PORT,
    server: httpServer,
    path: '/owllayer',
    toolTimeout: 15_000,
    maxConversationMessages: 50,

    // Admin auth (username/password)
    admin: ADMIN_PASSWORD
      ? {
          username: ADMIN_USERNAME,
          password: ADMIN_PASSWORD,
          path: '/admin',
        }
      : undefined,

    // Langue globale du serveur (logs, dashboard, etc.)
    language,

    // Consignes d'outils par niveau de risque dans le prompt agent (feature #35)
    toolGuidance: true,

    // Dashboard embarqué @owllayer/ui — http://localhost:<PORT>/owllayer-ui
    ui: {
      enabled: Boolean(ADMIN_PASSWORD),
      language,
    },

    // Client auth (API keys WebSocket)
    client: {
      requireApiKey: REQUIRE_API_KEY,
      enableApiKeyManagement: ADMIN_EXPOSE_API_KEYS,
      maxConnectionsPerKey: 10,
    },

    // Virtual Lines — controle de concurrence par API key (activé via OWLLAYER_ENABLE_VIRTUAL_LINES=true)
    // POST /lines/acquire?apiKey=pk_xxx  →  { success, lineNumber, token }
    // Passer le token en query WS: new WebSocket("ws://host/owllayer?lineToken=<token>")
    virtualLines: ENABLE_VIRTUAL_LINES && OWLLAYER_API_KEY ? {
      lines: [
        {
          apiKey: OWLLAYER_API_KEY,
          count: 4,            // 4 appels simultanes max pour cette cle
          ttlMs: 5 * 60_000,  // duree max d'un appel: 5 min
          waitingTtlMs: 2 * 60_000, // temps max en file d'attente: 2 min
        },
      ],
    } : undefined,
  });

  const allowedClientKeys = [
    OWLLAYER_API_KEY,
    OWLLAYER_ADMIN_API_KEY,
    OWLLAYER_TRAVEL_API_KEY,
    OWLLAYER_ANGULAR_API_KEY,
    OWLLAYER_BROWSER_API_KEY,
  ].filter(Boolean);

  const liveKitTokenRequestHandler = createLiveKitTokenRequestHandler({
    path: LIVEKIT_TOKEN_PATH,
    env: process.env,
    allowedOrigins: LIVEKIT_ALLOWED_ORIGINS,
    isClientApiKeyAllowed: (apiKey) => !REQUIRE_API_KEY || Boolean(apiKey && allowedClientKeys.includes(apiKey)),
    getSessionSnapshot: (sessionId) => server.getAgentBridgeSessionSnapshot(sessionId),
    isSessionOwnedByApiKey: (sessionId, apiKey) =>
      server.isAgentBridgeSessionOwnedByApiKey(sessionId, apiKey),
  });

  httpServer.on('request', (req, res) => {
    void liveKitTokenRequestHandler(req, res);
  });

  // ============================================================
  // API keys des applications de demo
  // ============================================================

  if (REQUIRE_API_KEY && OWLLAYER_API_KEY) {
    server.addApiKey(OWLLAYER_API_KEY);
    log.info(`API key registered: ${OWLLAYER_API_KEY.slice(0, 12)}...`);
  } else if (REQUIRE_API_KEY) {
    log.warn('Missing OWLLAYER_API_KEY! Connections will be rejected (requireAuth=true)');
  } else {
    log.info('Client authentication without API key active (OWLLAYER_REQUIRE_API_KEY=false).');
  }

  // API key + specific system prompt for Vue Admin demo
  if (OWLLAYER_ADMIN_API_KEY) {
    server.addApiKey(OWLLAYER_ADMIN_API_KEY);
    server.setPromptOverride(OWLLAYER_ADMIN_API_KEY, i18n.adminPrompt);
    log.info(`Admin API key registered with dedicated prompt (${language}): ${OWLLAYER_ADMIN_API_KEY.slice(0, 12)}...`);
  }

  // API key + specific system prompt for Svelte Travel demo
  if (OWLLAYER_TRAVEL_API_KEY) {
    server.addApiKey(OWLLAYER_TRAVEL_API_KEY);
    server.setPromptOverride(OWLLAYER_TRAVEL_API_KEY, i18n.travelPrompt);
    log.info(`Travel (Svelte) API key registered with dedicated prompt (${language}): ${OWLLAYER_TRAVEL_API_KEY.slice(0, 12)}...`);
  }

  // API key for Angular Marketplace demo
  if (OWLLAYER_ANGULAR_API_KEY) {
    server.addApiKey(OWLLAYER_ANGULAR_API_KEY);
    log.info(`Angular Marketplace API key registered: ${OWLLAYER_ANGULAR_API_KEY.slice(0, 12)}...`);
  }
  if (OWLLAYER_ANGULAR_API_KEY !== 'pk_angular_demo') {
    server.addApiKey('pk_angular_demo');
  }

  // API key for Vanilla Browser demo
  if (OWLLAYER_BROWSER_API_KEY) {
    server.addApiKey(OWLLAYER_BROWSER_API_KEY);
    log.info(`Vanilla Browser API key registered: ${OWLLAYER_BROWSER_API_KEY.slice(0, 12)}...`);
  }

  // ============================================================
  // Server-side Tools : executes sur le serveur. Les tools declares dans
  // les composants (useAgentTool) arrivent par CONTEXT_UPDATE et s'executent cote client.
  // ============================================================

  server.tool('get_server_time', async () => {
    return {
      timestamp: Date.now(),
      formatted: new Date().toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', {
        timeZone: language === 'fr' ? 'Africa/Abidjan' : 'UTC',
      }),
    };
  });
  server.tool('get_store_info', async () => {
    return i18n.storeInfo;
  });

  // ============================================================
  // Demarrage
  // ============================================================

  // Ligne audio de la banniere, derivee des slots reellement configures.
  const audioSummary = [live ? `live ${live.name}` : '', stt && tts ? `pipeline ${stt.name} + ${tts.name}` : '']
    .filter(Boolean)
    .join(' + ') || 'disabled';

  server.listen(() => {
    httpServer.listen(PORT, () => {
      log.info(`
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║       OwlLayer Demo Server                        ║
  ║                                                   ║
  ║   Provider:   ${runtime.label.padEnd(36)}║
  ║   WebSocket:  ws://localhost:${PORT}/owllayer        ║
  ║   Admin API:  ${ADMIN_PASSWORD ? `http://localhost:${PORT}/admin` : 'disabled (set ADMIN_PASSWORD)'}      ║
  ║   Dashboard:  ${ADMIN_PASSWORD ? `http://localhost:${PORT}/owllayer-ui` : 'disabled (set ADMIN_PASSWORD)'}   ║
  ║   LiveKit:    http://localhost:${PORT}${LIVEKIT_TOKEN_PATH} ║
  ║                                                   ║
  ║   Audio:  ${audioSummary.padEnd(41)}║
  ║                                                   ║
  ║   Server tools: get_server_time,                  ║
  ║                 get_store_info                    ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
  `);
    });
  });

  // Graceful shutdown
  let shutdownStarted = false;
  const shutdown = async () => {
    if (shutdownStarted) return;
    shutdownStarted = true;
    log.info('Shutting down...');
    await server.shutdown();
    if (httpServer.listening) {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  return server;
}
