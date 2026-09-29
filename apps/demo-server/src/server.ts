import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { configDotenv } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger le .env de apps/demo-server/ de manière absolue et robuste (racine ou dossier local)
configDotenv({ path: join(__dirname, '../.env') });
configDotenv({ path: join(process.cwd(), 'apps/demo-server/.env') });
configDotenv();

import { OwlLayerServer, StreamingPipelineLiveAdapter, validateVoiceRuntimeDefinition } from '@owllayer/server';
import { GoogleAdapter, GoogleLiveAdapter } from '@owllayer/adapter-google';
import { GoogleSTT, GoogleTTS } from '@owllayer/adapter-google';
import { OpenAIAdapter, OpenAILiveAdapter } from '@owllayer/adapter-openai';
import {
  DeepgramNovaSTT,
  DeepgramAuraTTS,
  DeepgramFluxSTT,
  DeepgramVoiceAgentAdapter,
  type DeepgramVoiceAgentOptions,
} from '@owllayer/adapter-deepgram';
import { createLogger, setLogLevel, LogLevel, type LLMAdapter, type LiveAdapter, type STTService, type TTSService } from '@owllayer/core';
import { PromotionsPlugin } from '@owllayer-plugins/demo-promotions';
import { createServer } from 'http';
import {
  createLiveKitTokenRequestHandler,
  readLiveKitAllowedOrigins,
} from './livekitTokenEndpoint.js';

const log = createLogger('Demo:Server');
// Niveau de logs du demo-server. Par défaut: INFO pour voir le banner de démarrage.
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();

switch (LOG_LEVEL) {
  case 'silent':
    setLogLevel(LogLevel.SILENT);
    break;
  case 'error':
    setLogLevel(LogLevel.ERROR);
    break;
  case 'warn':
    setLogLevel(LogLevel.WARN);
    break;
  case 'debug':
    setLogLevel(LogLevel.DEBUG);
    break;
  default:
    setLogLevel(LogLevel.INFO);
    break;
}

import { getServerI18n } from './i18n/messages.js';

// ============================================================
// Configuration
// ============================================================

const PORT = parseInt(process.env.OWLLAYER_PORT || process.env.PORT || '4001', 10);
// Fournisseur LLM de la demo : google (defaut), openai ou deepseek
const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'google').toLowerCase();
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1';
const OPENAI_REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-1.5';
const OPENAI_REALTIME_VOICE = process.env.OPENAI_REALTIME_VOICE || 'marin';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_THINKING = process.env.DEEPSEEK_THINKING === 'true';
const LLM_TIMEOUT_MS = Number.parseInt(process.env.LLM_TIMEOUT_MS || '90000', 10);
const DEFAULT_LANGUAGE = process.env.DEFAULT_LANGUAGE || 'en';
const VOICE_PROVIDER = (process.env.VOICE_PROVIDER || 'google').toLowerCase();
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '';
// Mode vocal Deepgram (VOICE_PROVIDER=deepgram) : pipeline-batch (defaut) | pipeline-streaming | realtime
const VOICE_MODE = (process.env.VOICE_MODE || 'pipeline-batch').toLowerCase();
// Fournisseur de raisonnement du Voice Agent (mode realtime), gere par Deepgram : aucune autre cle
const DEEPGRAM_THINK_PROVIDER = process.env.DEEPGRAM_THINK_PROVIDER || '';
const DEEPGRAM_THINK_MODEL = process.env.DEEPGRAM_THINK_MODEL || '';
const i18n = getServerI18n(DEFAULT_LANGUAGE);

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
const LIVEKIT_TOKEN_PATH = '/owllayer/livekit/token';
const LIVEKIT_ALLOWED_ORIGINS = readLiveKitAllowedOrigins(
  process.env.OWLLAYER_LIVEKIT_ALLOWED_ORIGINS
);
const httpServer = createServer();

const isMissing = (key: string) => !key || key.startsWith('your_');

// ============================================================
// LLM texte + audio live selon LLM_PROVIDER
// ============================================================

let llm: LLMAdapter;
let live: LiveAdapter | undefined;

if (LLM_PROVIDER === 'deepseek') {
  // DeepSeek : API compatible OpenAI (baseURL dediee), mode texte uniquement
  if (isMissing(DEEPSEEK_API_KEY)) {
    log.warn('Missing DEEPSEEK_API_KEY! Add your key in apps/demo-server/.env.deepseek');
  }
  llm = new OpenAIAdapter({
    model: DEEPSEEK_MODEL,
    apiKey: DEEPSEEK_API_KEY || 'dummy_key_to_prevent_crash',
    baseURL: DEEPSEEK_BASE_URL,
    timeout: LLM_TIMEOUT_MS,
    thinking: DEEPSEEK_THINKING,
    systemPrompt: i18n.systemPrompt,
    language: DEFAULT_LANGUAGE as 'en' | 'fr',
  });
  live = undefined;
} else if (LLM_PROVIDER === 'openai') {
  if (isMissing(OPENAI_API_KEY)) {
    log.warn('Missing OPENAI_API_KEY! Add your key in apps/demo-server/.env');
  }
  llm = new OpenAIAdapter({
    model: OPENAI_MODEL,
    apiKey: OPENAI_API_KEY || 'dummy_key_to_prevent_crash',
    timeout: LLM_TIMEOUT_MS,
    systemPrompt: i18n.systemPrompt,
    language: DEFAULT_LANGUAGE as 'en' | 'fr',
  });
  live = OPENAI_API_KEY
    ? new OpenAILiveAdapter({
      apiKey: OPENAI_API_KEY,
      model: OPENAI_REALTIME_MODEL,
      voice: OPENAI_REALTIME_VOICE,
      systemPrompt: i18n.livePrompt,
    })
    : undefined;
} else {
  // Google Gemini (defaut)
  if (isMissing(GOOGLE_API_KEY)) {
    log.warn('Missing GOOGLE_API_KEY! Add your key in apps/demo-server/.env');
  }
  llm = new GoogleAdapter({
    model: GEMINI_MODEL,
    apiKey: GOOGLE_API_KEY || 'dummy_key_to_prevent_crash',
    systemPrompt: i18n.systemPrompt,
    language: DEFAULT_LANGUAGE as 'en' | 'fr',
  });
  // Live Audio (Gemini Native — bidirectional audio)
  live = GOOGLE_API_KEY
    ? new GoogleLiveAdapter({
      apiKey: GOOGLE_API_KEY,
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      voice: 'Fenrir',
      systemPrompt: i18n.livePrompt,
    })
    : undefined;
}

// ============================================================
// STT/TTS Pipeline (Google Cloud — hybrid mode)
// Activated when client sends audio USER_INPUT (live: false).
// Permet aussi la voix avec un LLM texte seul (DeepSeek) si GOOGLE_API_KEY est defini.
// ============================================================

// Voix Deepgram (VOICE_PROVIDER=deepgram), un seul mode vocal a la fois (VOICE_MODE) :
// - pipeline-batch : Nova STT + LLM texte + Aura TTS, via le pipeline STT/TTS du serveur ;
// - pipeline-streaming : Flux STT + LLM texte + Aura streaming, via le slot `live` ;
// - realtime : Deepgram Voice Agent (ecoute, raisonnement et voix), via le slot `live`.
// Le serveur n'utilise le pipeline STT/TTS que si aucun adapter live n'est configure.
const useDeepgramVoice = VOICE_PROVIDER === 'deepgram' && DEEPGRAM_API_KEY !== '';
if (VOICE_PROVIDER === 'deepgram' && !useDeepgramVoice) {
  log.warn('VOICE_PROVIDER=deepgram but DEEPGRAM_API_KEY is missing: keeping the Google voice pipeline.');
}
const DEEPGRAM_VOICE_MODES = ['pipeline-batch', 'pipeline-streaming', 'realtime'];
if (useDeepgramVoice && !DEEPGRAM_VOICE_MODES.includes(VOICE_MODE)) {
  log.error(`Unknown VOICE_MODE "${VOICE_MODE}". Expected one of: ${DEEPGRAM_VOICE_MODES.join(', ')}.`);
  process.exit(1);
}
const deepgramLanguage = DEFAULT_LANGUAGE.split('-')[0];

if (useDeepgramVoice && live) {
  log.info(`Deepgram voice (${VOICE_MODE}) replaces the live adapter (${live.name}).`);
  live = undefined;
}
if (useDeepgramVoice && VOICE_MODE === 'pipeline-streaming') {
  const streamingDefinition = {
    mode: 'pipeline' as const,
    stt: new DeepgramFluxSTT({ apiKey: DEEPGRAM_API_KEY, language: deepgramLanguage }),
    tts: new DeepgramAuraTTS({ apiKey: DEEPGRAM_API_KEY, language: deepgramLanguage }),
  };
  assertVoiceDefinition(streamingDefinition);
  live = new StreamingPipelineLiveAdapter({ stt: streamingDefinition.stt, llm, tts: streamingDefinition.tts });
}
if (useDeepgramVoice && VOICE_MODE === 'realtime') {
  const think = DEEPGRAM_THINK_PROVIDER
    ? {
      provider: DEEPGRAM_THINK_PROVIDER as NonNullable<DeepgramVoiceAgentOptions['think']>['provider'],
      ...(DEEPGRAM_THINK_MODEL ? { model: DEEPGRAM_THINK_MODEL } : {}),
    }
    : undefined;
  const realtimeDefinition = {
    mode: 'realtime' as const,
    live: new DeepgramVoiceAgentAdapter({
      apiKey: DEEPGRAM_API_KEY,
      language: deepgramLanguage,
      ...(think ? { think } : {}),
    }),
  };
  assertVoiceDefinition(realtimeDefinition);
  live = realtimeDefinition.live;
}

/** Arrete la demo sur une definition vocale incoherente (un seul mode, toutes ses parties). */
function assertVoiceDefinition(definition: Parameters<typeof validateVoiceRuntimeDefinition>[0]): void {
  const validation = validateVoiceRuntimeDefinition(definition);
  if (!validation.valid) {
    log.error(`Invalid Deepgram voice definition: ${validation.code}${validation.missing ? ` (missing: ${validation.missing.join(', ')})` : ''}.`);
    process.exit(1);
  }
}

const useDeepgramBatch = useDeepgramVoice && VOICE_MODE === 'pipeline-batch';

const stt: STTService | undefined = useDeepgramBatch
  ? new DeepgramNovaSTT({ apiKey: DEEPGRAM_API_KEY, language: deepgramLanguage })
  : GOOGLE_API_KEY && !useDeepgramVoice
    ? new GoogleSTT({
      apiKey: GOOGLE_API_KEY,
      defaultLanguage: i18n.stt.languageCode,
      enableAutomaticPunctuation: true,
      model: 'latest_long',
      debug: true,
    })
    : undefined;

const tts: TTSService | undefined = useDeepgramBatch
  ? new DeepgramAuraTTS({ apiKey: DEEPGRAM_API_KEY, language: deepgramLanguage })
  : GOOGLE_API_KEY && !useDeepgramVoice
    ? new GoogleTTS({
      apiKey: GOOGLE_API_KEY,
      voice: i18n.tts.voice,
      defaultLanguage: i18n.tts.languageCode,
      voiceType: 'Neural2',
      debug: true,
    })
    : undefined;

const voiceProviderName = useDeepgramBatch ? 'deepgram' : 'google';
log.info(`LLM provider: ${LLM_PROVIDER} (${llm.name})${live ? `, live: ${live.name}` : ''}${stt && tts ? `, hybrid STT/TTS: ${voiceProviderName}` : ''}`);

// ============================================================
// Serveur OwlLayer
// ============================================================

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
  language: DEFAULT_LANGUAGE as 'en' | 'fr',

  // Consignes d'outils par niveau de risque dans le prompt agent (feature #35)
  toolGuidance: true,

  // Dashboard embarqué @owllayer/ui — http://localhost:<PORT>/owllayer-ui
  ui: {
    enabled: Boolean(ADMIN_PASSWORD),
    language: DEFAULT_LANGUAGE as 'en' | 'fr',
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

const liveKitTokenRequestHandler = createLiveKitTokenRequestHandler({
  path: LIVEKIT_TOKEN_PATH,
  env: process.env,
  allowedOrigins: LIVEKIT_ALLOWED_ORIGINS,
  isClientApiKeyAllowed,
  getSessionSnapshot: (sessionId) => server.getAgentBridgeSessionSnapshot(sessionId),
  isSessionOwnedByApiKey: (sessionId, apiKey) =>
    server.isAgentBridgeSessionOwnedByApiKey(sessionId, apiKey),
});

httpServer.on('request', (req, res) => {
  void liveKitTokenRequestHandler(req, res);
});

// ============================================================
// Enregistrer les API keys autorisees
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
  log.info(`Admin API key registered with dedicated prompt (${DEFAULT_LANGUAGE}): ${OWLLAYER_ADMIN_API_KEY.slice(0, 12)}...`);
}

// API key + specific system prompt for Svelte Travel demo
if (OWLLAYER_TRAVEL_API_KEY) {
  server.addApiKey(OWLLAYER_TRAVEL_API_KEY);
  server.setPromptOverride(OWLLAYER_TRAVEL_API_KEY, i18n.travelPrompt);
  log.info(`Travel (Svelte) API key registered with dedicated prompt (${DEFAULT_LANGUAGE}): ${OWLLAYER_TRAVEL_API_KEY.slice(0, 12)}...`);
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
// Server-side Tools (optional)
//
// These tools run directly on the server.
// Tools defined inside React/Vue components (via useAgentTool)
// are automatically synchronized via AITP CONTEXT_UPDATE
// and executed client-side.
// ============================================================

server.tool('get_server_time', async () => {
  return {
    timestamp: Date.now(),
    formatted: new Date().toLocaleString(DEFAULT_LANGUAGE === 'fr' ? 'fr-FR' : 'en-US', {
      timeZone: DEFAULT_LANGUAGE === 'fr' ? 'Africa/Abidjan' : 'UTC',
    }),
  };
});
server.tool('get_store_info', async () => {
  return i18n.storeInfo;
});

// ============================================================
// Plugin: @owllayer-plugins/demo-promotions
//
// Server-side promo codes and flash sales for the shopping demo.
// The LLM can call these tools during the checkout flow:
//   get_current_promotions  — list active codes + flash sale
//   apply_promo_code        — validate a code and compute discount
//   get_flash_sale          — check if a flash sale is running
//
// Installed with mode: 'trusted' (feature_09 demo).
// ============================================================
// server.installPlugin(PromotionsPlugin, {}, { mode: 'trusted' });
// log.info('Plugin @owllayer-plugins/demo-promotions installed (trusted mode)');

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
  ║       OwlLayer Demo Server                           ║
  ║                                                   ║
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

async function shutdown() {
  if (shutdownStarted) return;
  shutdownStarted = true;

  log.info('Shutting down...');
  await server.shutdown();
  await closeHttpServer();
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});

function isClientApiKeyAllowed(apiKey: string | undefined): boolean {
  if (!REQUIRE_API_KEY) {
    return true;
  }

  const allowedKeys = [
    OWLLAYER_API_KEY,
    OWLLAYER_ADMIN_API_KEY,
    OWLLAYER_TRAVEL_API_KEY,
    OWLLAYER_ANGULAR_API_KEY,
    OWLLAYER_BROWSER_API_KEY,
  ].filter(Boolean);
  return Boolean(apiKey && allowedKeys.includes(apiKey));
}

async function closeHttpServer(): Promise<void> {
  if (!httpServer.listening) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    httpServer.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
